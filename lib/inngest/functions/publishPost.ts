import { inngest } from "../client"
import { db } from "@/lib/db"
import { posts, postTargets, accounts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { decrypt } from "@/lib/utils/encryption"
import { publishTelegram } from "./publishTelegram"
import { publishInstagram } from "./publishInstagram"

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

    // 1. Fetch post and update target asset URLs / status
    const initialization = await step.run("initialize-publishing", async () => {
      const postRecord = await db.query.posts.findFirst({
        where: eq(posts.id, postId),
      })

      if (!postRecord) {
        throw new Error(`Post not found with ID: ${postId}`)
      }

      // Update post status to 'publishing'
      await db
        .update(posts)
        .set({ status: "publishing" })
        .where(eq(posts.id, postId))

      // Fetch all targets and accounts
      const targetsWithAccounts = await db
        .select()
        .from(postTargets)
        .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
        .where(eq(postTargets.post_id, postId))

      const targetsToPublish = []

      for (const item of targetsWithAccounts) {
        const target = item.post_targets
        const account = item.accounts

        const assetUrl = postRecord.media_url // Unconditionally copy posts.media_url

        // Instagram requires media
        if (!assetUrl && account.platform_type === "instagram") {
          await db
            .update(postTargets)
            .set({ status: "failed", error_message: "No media provided" })
            .where(eq(postTargets.id, target.id))
          continue
        }

        // Unconditionally copy posts.media_url into post_target.asset_url in the database
        await db
          .update(postTargets)
          .set({ asset_url: assetUrl })
          .where(eq(postTargets.id, target.id))

        targetsToPublish.push({
          id: target.id,
          platform_type: account.platform_type,
          credentials_json: account.credentials_json,
          asset_url: assetUrl,
        })
      }

      return {
        post: {
          id: postRecord.id,
          title: postRecord.title,
          body: postRecord.body,
          event_at: postRecord.event_at,
          media_type: postRecord.media_type,
        },
        targetsToPublish,
      }
    })

    const { post, targetsToPublish } = initialization

    // 2. Fan-out per target
    const publishPromises = targetsToPublish.map((target: any) => {
      return step.run(`publish-target-${target.id}`, async () => {
        // Set target status to processing
        await db
          .update(postTargets)
          .set({ status: "processing", error_message: null })
          .where(eq(postTargets.id, target.id))

        try {
          const decryptedCreds = JSON.parse(decrypt(target.credentials_json))

          if (target.platform_type === "telegram") {
            await publishTelegram(target.id, post, decryptedCreds, target.asset_url, post.media_type)
          } else if (target.platform_type === "instagram") {
            await publishInstagram(target.id, post, decryptedCreds, target.asset_url, post.media_type)
          }
        } catch (error: any) {
          const errorMessage = error?.message || String(error)
          await db
            .update(postTargets)
            .set({ status: "failed", error_message: errorMessage })
            .where(eq(postTargets.id, target.id))
          throw error // Rethrow so Inngest retries
        }
      })
    })

    await Promise.all(publishPromises)

    // 3. Mark post as published if everything succeeded
    await step.run("complete-publishing", async () => {
      // Check if any target failed
      const remainingTargets = await db
        .select()
        .from(postTargets)
        .where(eq(postTargets.post_id, postId))

      const anyFailed = remainingTargets.some((t) => t.status === "failed")
      await db
        .update(posts)
        .set({ status: anyFailed ? "failed" : "published" })
        .where(eq(posts.id, postId))
    })
  }
)
