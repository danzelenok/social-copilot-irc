import React from "react"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { posts, postTargets, accounts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getBranches } from "@/lib/actions/branches"
import ComposerForm from "@/components/composer/ComposerForm"
import { PageHeader } from "@/components/shared/PageHeader"

// Ensure this page is rendered dynamically on each request to fetch the latest db updates
export const dynamic = "force-dynamic"

interface EditCampaignPageProps {
  params: Promise<{
    postId: string
  }>
}

export default async function EditCampaignPage({
  params,
}: EditCampaignPageProps) {
  const { postId } = await params

  // 1. Fetch post
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  })

  if (!post) {
    notFound()
  }

  // Only allow editing if post is 'scheduled' or 'draft'
  if (post.status !== "scheduled" && post.status !== "draft") {
    redirect(`/composer/${postId}`)
  }

  // 2. Fetch target connections and event dates
  const targets = await db
    .select({
      account_id: postTargets.account_id,
      address: postTargets.address,
      branch_id: accounts.branch_id,
      event_at: postTargets.event_at,
    })
    .from(postTargets)
    .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
    .where(eq(postTargets.post_id, postId))

  // 3. Fetch branches
  const branches = await getBranches()

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader title="Edit Campaign" />

      <ComposerForm
        branches={branches}
        initialPost={{
          id: post.id,
          title: post.title,
          body: post.body,
          media_url: post.media_url,
          media_type: post.media_type as any,
          post_type: post.post_type as any,
        }}
        initialTargets={targets}
      />
    </div>
  )
}
