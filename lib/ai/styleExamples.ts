import { db } from "@/lib/db"
import { posts, postTargets, accounts, branches } from "@/lib/db/schema"
import { eq, or, isNotNull, inArray, and, notInArray, sql } from "drizzle-orm"
import { generateEmbedding } from "./embeddings"

/**
 * Two-stage RAG similarity search for style examples matching the event description.
 * Stage 1: Search within specified branchIds via cosine distance (<=>).
 * Stage 2: If fewer than limit results found, backfill from other posts in the organization.
 */
export async function findSimilarPosts(
  description: string,
  organizationId: string,
  branchIds: string[],
  limit = 3
): Promise<{ title: string; body: string }[]> {
  const queryEmbedding = await generateEmbedding(description)
  if (!queryEmbedding) {
    return []
  }

  const results: { id: string; title: string; body: string }[] = []
  const fetchedPostIds = new Set<string>()

  // Condition: (published OR is_style_example) AND embedding IS NOT NULL
  const baseCondition = and(
    or(eq(posts.status, "published"), eq(posts.is_style_example, true)),
    isNotNull(posts.embedding)
  )

  const distanceSql = sql<number>`${posts.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`

  // Stage 1: Search within specified branchIds
  if (branchIds && branchIds.length > 0) {
    const stage1Rows = await db
      .selectDistinctOn([posts.id], {
        id: posts.id,
        title: posts.title,
        body: posts.body,
        distance: distanceSql,
      })
      .from(posts)
      .innerJoin(postTargets, eq(posts.id, postTargets.post_id))
      .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
      .innerJoin(branches, eq(accounts.branch_id, branches.id))
      .where(
        and(
          baseCondition,
          eq(branches.organization_id, organizationId),
          inArray(branches.id, branchIds)
        )
      )
      .orderBy(posts.id, distanceSql)
      .limit(limit)

    // Sort in JS by similarity distance
    stage1Rows.sort((a, b) => (Number(a.distance) || 0) - (Number(b.distance) || 0))

    for (const row of stage1Rows) {
      if (results.length < limit) {
        results.push({ id: row.id, title: row.title, body: row.body })
        fetchedPostIds.add(row.id)
      }
    }
  }

  // Stage 2: Fill remaining up to limit from other organization posts
  if (results.length < limit) {
    const needed = limit - results.length
    const excludeIds = Array.from(fetchedPostIds)

    const stage2Condition = excludeIds.length > 0
      ? and(baseCondition, eq(branches.organization_id, organizationId), notInArray(posts.id, excludeIds))
      : and(baseCondition, eq(branches.organization_id, organizationId))

    const stage2Rows = await db
      .selectDistinctOn([posts.id], {
        id: posts.id,
        title: posts.title,
        body: posts.body,
        distance: distanceSql,
      })
      .from(posts)
      .innerJoin(postTargets, eq(posts.id, postTargets.post_id))
      .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
      .innerJoin(branches, eq(accounts.branch_id, branches.id))
      .where(stage2Condition)
      .orderBy(posts.id, distanceSql)
      .limit(needed)

    stage2Rows.sort((a, b) => (Number(a.distance) || 0) - (Number(b.distance) || 0))

    for (const row of stage2Rows) {
      if (results.length < limit) {
        results.push({ id: row.id, title: row.title, body: row.body })
        fetchedPostIds.add(row.id)
      }
    }
  }

  return results.map((r) => ({ title: r.title, body: r.body }))
}
