import { inngest } from "../client"
import { db } from "@/lib/db"
import { posts, postTargets, accounts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { decrypt } from "@/lib/utils/encryption"
import { publishTelegram } from "./publishTelegram"
import { publishInstagram } from "./publishInstagram"
import { generateEmbedding } from "@/lib/ai/embeddings"

/**
 * Checks all targets for a post and updates the post status if all targets are completed.
 */
export async function checkAndUpdatePostStatus(postId: string, step: any) {
  await step.run(`finalize-post-status-${postId}`, async () => {
    const allTargets = await db
      .select()
      .from(postTargets)
      .where(eq(postTargets.post_id, postId))

    const finished = allTargets.every(
      (t) => t.status === "published" || t.status === "failed" || t.status === "cancelled"
    )

    if (finished) {
      const anyFailed = allTargets.some((t) => t.status === "failed")
      const anyPublished = allTargets.some((t) => t.status === "published")
      
      let finalPostStatus: "published" | "failed" | "cancelled" = "cancelled"
      if (anyFailed) finalPostStatus = "failed"
      else if (anyPublished) finalPostStatus = "published"

      await db
        .update(posts)
        .set({ status: finalPostStatus })
        .where(eq(posts.id, postId))

      if (finalPostStatus === "published") {
        try {
          const [currentPost] = await db
            .select({ body: posts.body })
            .from(posts)
            .where(eq(posts.id, postId))
            .limit(1)

          if (currentPost?.body) {
            const embedding = await generateEmbedding(currentPost.body)
            if (embedding) {
              await db
                .update(posts)
                .set({ embedding })
                .where(eq(posts.id, postId))
            }
          }
        } catch (embeddingErr) {
          console.error(`Error generating embedding for published post ${postId}:`, embeddingErr)
        }
      }
    }
  })
}

/**
 * Reusable target-level publishing function that executes the publish pipeline for a single target,
 * handles status updates, decryption, and finalizes the parent post status when all targets complete.
 */
export async function executePublishTarget(targetId: string, step: any) {
  const initialization = await step.run(`initialize-publishing-target-${targetId}`, async () => {
    const targetWithDetails = await db
      .select({
        target: postTargets,
        account: accounts,
        post: posts,
      })
      .from(postTargets)
      .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
      .innerJoin(posts, eq(postTargets.post_id, posts.id))
      .where(eq(postTargets.id, targetId))
      .limit(1)

    const item = targetWithDetails[0]
    if (!item) {
      throw new Error(`Target not found with ID: ${targetId}`)
    }

    const { target, account, post } = item
    const assetUrl = post.media_url // Copy posts.media_url

    // Stories validation: Telegram does not support Stories
    if (post.post_type === "story" && account.platform_type === "telegram") {
      await db
        .update(postTargets)
        .set({ status: "failed", error_message: "Stories are not supported on Telegram" })
        .where(eq(postTargets.id, targetId))
      return { skipped: true, postId: post.id }
    }

    // Instagram requires media
    if (!assetUrl && account.platform_type === "instagram") {
      await db
        .update(postTargets)
        .set({ status: "failed", error_message: "No media provided" })
        .where(eq(postTargets.id, targetId))
      return { skipped: true, postId: post.id }
    }

    // Set status to processing and copy asset_url
    await db
      .update(postTargets)
      .set({ status: "processing", asset_url: assetUrl, error_message: null })
      .where(eq(postTargets.id, targetId))

    return {
      skipped: false,
      postId: post.id,
      post: {
        id: post.id,
        title: post.title,
        body: post.body,
        media_type: post.media_type,
        post_type: post.post_type,
        event_at: target.event_at, // Use target-specific event_at
      },
      target: {
        id: target.id,
        platform_type: account.platform_type,
        credentials_json: account.credentials_json,
        asset_url: assetUrl,
      },
    }
  })

  if (initialization.skipped) {
    await checkAndUpdatePostStatus(initialization.postId, step)
    return
  }

  const { post, target } = initialization as any

  // Perform publishing inside step
  await step.run(`publish-target-exec-${targetId}`, async () => {
    try {
      const decryptedCreds = JSON.parse(decrypt(target.credentials_json))

      if (target.platform_type === "telegram") {
        await publishTelegram(targetId, post, decryptedCreds, target.asset_url, post.media_type)
      } else if (target.platform_type === "instagram") {
        const effectiveMediaType = post.post_type === "story" ? "story" : post.media_type
        await publishInstagram(targetId, post, decryptedCreds, target.asset_url, effectiveMediaType)
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      await db
        .update(postTargets)
        .set({ status: "failed", error_message: errorMessage })
        .where(eq(postTargets.id, targetId))
      throw error // Rethrow to let Inngest retry
    }
  })

  // Finalize post status
  await checkAndUpdatePostStatus(post.id, step)
}

export const publishPost = inngest.createFunction(
  {
    id: "publish-post",
    retries: 3,
    triggers: [{ event: "post/publish.requested" }],
    onFailure: async ({ event }) => {
      const postId = event.data.event?.data?.postId
      if (postId) {
        try {
          await db
            .update(posts)
            .set({ status: "failed" })
            .where(eq(posts.id, postId))
        } catch (error) {
          console.error(`Failed to update post status to failed in onFailure hook:`, error)
        }
      }
    },
  },
  async ({ event, step }) => {
    const { postId } = event.data

    // Find all targets for this post that are immediate
    const targetsToPublish = await step.run("fetch-targets-to-publish", async () => {
      // Set parent post status to 'publishing'
      await db
        .update(posts)
        .set({ status: "publishing" })
        .where(eq(posts.id, postId))

      return db
        .select()
        .from(postTargets)
        .where(eq(postTargets.post_id, postId))
    })

    const publishPromises = targetsToPublish.map((target) => {
      // Publish each target using the shared helper
      return executePublishTarget(target.id, step)
    })

    await Promise.all(publishPromises)
  }
)

