"use server"

import { db } from "@/lib/db"
import { posts, postTargets, accounts, branches } from "@/lib/db/schema"
import { inngest } from "@/lib/inngest/client"
import { revalidatePath } from "next/cache"
import { eq, and, inArray, between, min, sql } from "drizzle-orm"
import { decryptAndGetHandle } from "@/lib/utils/accounts"
import { decrypt } from "@/lib/utils/encryption"
import { Bot } from "grammy"
import { format, startOfMonth, endOfMonth } from "date-fns"
import fs from "fs"
import path from "path"
import { imagekit } from "@/lib/imagekit"
import { getCurrentOrganization, requireCurrentOrganization } from "@/lib/auth/org"
import { getUtcDateInTimezone } from "@/lib/utils/timezones"
import crypto from "crypto"

const MOCK_PREVIEW_IMAGES = [
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1490122417551-6ee9691429d0?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=600&q=80",
]

function getStableMockImage(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % MOCK_PREVIEW_IMAGES.length
  return MOCK_PREVIEW_IMAGES[index]
}

/**
 * Validates that account IDs belong to branches within the current organization.
 */
async function validateAccountsBelongToOrg(accountIds: string[]) {
  const org = await requireCurrentOrganization()
  if (accountIds.length === 0) return org

  const validAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .innerJoin(branches, eq(accounts.branch_id, branches.id))
    .where(and(inArray(accounts.id, accountIds), eq(branches.organization_id, org.id)))

  if (validAccounts.length !== new Set(accountIds).size) {
    throw new Error("One or more target accounts do not belong to your organization.")
  }

  return org
}

/**
 * Creates a post with draft status and creates post target records.
 * Scoped to current organization.
 */
export async function createDraftPost(data: {
  title: string
  body?: string
  targets: { accountId: string; address?: string | null; eventAt?: Date | null }[]
  mediaUrl?: string | null
  mediaType?: "photo" | "video" | null
  postType?: "post" | "story"
}) {
  const { title, body = "", targets, mediaUrl, mediaType, postType = "post" } = data

  if (!title || title.trim() === "") {
    return { success: false, error: "Event Title is required." }
  }
  if (postType !== "story" && (!body || body.trim() === "")) {
    return { success: false, error: "Body text is required." }
  }
  if (!targets || targets.length === 0) {
    return { success: false, error: "At least one target account must be selected." }
  }

  try {
    const accountIds = targets.map((t) => t.accountId)
    await validateAccountsBelongToOrg(accountIds)

    // 1. Create the post record in draft status
    const [newPost] = await db
      .insert(posts)
      .values({
        title: title.trim(),
        body: body.trim(),
        status: "draft",
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        post_type: postType,
      })
      .returning()

    if (!newPost) {
      throw new Error("Failed to insert post into database.")
    }

    // 2. Create post_targets records
    const targetsToInsert = targets.map((target) => ({
      post_id: newPost.id,
      account_id: target.accountId,
      status: "pending" as const,
      asset_url: mediaUrl || null,
      address: target.address?.trim() || null,
      event_at: target.eventAt ? new Date(target.eventAt) : null,
    }))

    await db.insert(postTargets).values(targetsToInsert)

    revalidatePath("/composer")
    revalidatePath("/")

    return { success: true, post: newPost }
  } catch (error) {
    console.error("Failed to create draft post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create draft post.",
    }
  }
}

/**
 * Retrieves post targets with detailed account handles and branch names.
 * Scoped to current organization.
 */
export async function getPostTargetsWithDetails(postId: string) {
  try {
    const org = await getCurrentOrganization()
    if (!org) return []

    const targets = await db
      .select({
        id: postTargets.id,
        post_id: postTargets.post_id,
        account_id: postTargets.account_id,
        status: postTargets.status,
        asset_url: postTargets.asset_url,
        error_message: postTargets.error_message,
        published_at: postTargets.published_at,
        event_at: postTargets.event_at,
        schedule_id: postTargets.schedule_id,
        platform_message_id: postTargets.platform_message_id,
        hidden_from_calendar: postTargets.hidden_from_calendar,
        hidden_at: postTargets.hidden_at,
        account: {
          id: accounts.id,
          platform_type: accounts.platform_type,
          credentials_json: accounts.credentials_json,
          is_active: accounts.is_active,
        },
        branch: {
          id: branches.id,
          name: branches.name,
          timezone: branches.timezone,
        },
      })
      .from(postTargets)
      .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
      .innerJoin(branches, eq(accounts.branch_id, branches.id))
      .where(and(eq(postTargets.post_id, postId), eq(branches.organization_id, org.id)))

    return targets.map((t) => {
      const handle = decryptAndGetHandle(t.account.platform_type, t.account.credentials_json)

      return {
        id: t.id,
        post_id: t.post_id,
        account_id: t.account_id,
        status: t.status,
        asset_url: t.asset_url,
        error_message: t.error_message,
        published_at: t.published_at,
        event_at: t.event_at,
        schedule_id: t.schedule_id,
        platform_message_id: t.platform_message_id,
        hidden_from_calendar: t.hidden_from_calendar,
        hidden_at: t.hidden_at,
        account: {
          id: t.account.id,
          platform_type: t.account.platform_type as "telegram" | "instagram" | "framer" | "subsplash",
          handle,
        },
        branch: {
          id: t.branch.id,
          name: t.branch.name,
          timezone: t.branch.timezone,
        },
      }
    })
  } catch (error) {
    console.error("Failed to get post targets details:", error)
    return []
  }
}

/**
 * Approves a post and triggers the Inngest publish event.
 * Scoped to current organization.
 */
export async function approveAndPublish(postId: string) {
  try {
    const org = await requireCurrentOrganization()

    // Verify post belongs to organization
    const targets = await getPostTargetsWithDetails(postId)
    if (targets.length === 0) {
      return { success: false, error: "Post not found or access denied." }
    }

    // 1. Update post status to 'publishing'
    await db
      .update(posts)
      .set({ status: "publishing" })
      .where(eq(posts.id, postId))

    // 2. Trigger Inngest event
    await inngest.send({
      name: "post/publish.requested",
      data: {
        postId,
      },
    })

    revalidatePath("/composer")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Failed to approve and publish post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish post.",
    }
  }
}

/**
 * Creates and schedules a post for multiple branch targets.
 * Scoped to current organization.
 */
export async function createAndSchedulePost(data: {
  title: string
  body?: string
  mediaUrl?: string | null
  mediaType?: "photo" | "video" | null
  postType?: "post" | "story"
  targets: {
    accountId: string
    address?: string | null
    dateStr: string
    timeStr: string
    timezone: string
    branchName: string
  }[]
}) {
  const { title, body = "", mediaUrl, mediaType, postType = "post", targets } = data

  if (!title || title.trim() === "") {
    return { success: false, error: "Event Title is required." }
  }
  if (postType !== "story" && (!body || body.trim() === "")) {
    return { success: false, error: "Body text is required." }
  }
  if (!targets || targets.length === 0) {
    return { success: false, error: "At least one target account must be selected." }
  }

  const accountIds = targets.map((t) => t.accountId)

  try {
    await validateAccountsBelongToOrg(accountIds)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Access denied." }
  }

  // Validate all dates/times are present and in the future
  const scheduledTargets = []
  for (const t of targets) {
    if (!t.dateStr || !t.timeStr) {
      return { success: false, error: `Date and time are required for branch "${t.branchName}".` }
    }
    if (!t.timezone) {
      return { success: false, error: `Timezone is not configured for branch "${t.branchName}".` }
    }

    try {
      const utcDate = getUtcDateInTimezone(t.dateStr, t.timeStr, t.timezone)
      if (utcDate.getTime() <= Date.now()) {
        return { success: false, error: `The scheduled time for branch "${t.branchName}" has already passed.` }
      }
      scheduledTargets.push({
        ...t,
        scheduledAt: utcDate,
      })
    } catch (err) {
      return { success: false, error: `Invalid date/time format for branch "${t.branchName}".` }
    }
  }

  try {
    const [newPost] = await db
      .insert(posts)
      .values({
        title: title.trim(),
        body: body.trim(),
        status: "scheduled",
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        post_type: postType,
      })
      .returning()

    if (!newPost) {
      throw new Error("Failed to insert post into database.")
    }

    for (const t of scheduledTargets) {
      const scheduleId = crypto.randomUUID()

      const [targetRecord] = await db
        .insert(postTargets)
        .values({
          post_id: newPost.id,
          account_id: t.accountId,
          status: "scheduled",
          asset_url: mediaUrl || null,
          address: t.address?.trim() || null,
          event_at: t.scheduledAt,
          schedule_id: scheduleId,
        })
        .returning()

      await inngest.send({
        name: "post/target-schedule.requested",
        data: {
          targetId: targetRecord.id,
          scheduleId,
          scheduledAt: t.scheduledAt.toISOString(),
        },
      })
    }

    revalidatePath("/composer")
    revalidatePath("/dashboard")
    revalidatePath("/")

    return { success: true, post: newPost }
  } catch (error) {
    console.error("Failed to create and schedule post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to schedule post.",
    }
  }
}

/**
 * Cancels a target's scheduled task.
 * Scoped to current organization.
 */
export async function cancelTargetScheduleAction(targetId: string) {
  try {
    const org = await requireCurrentOrganization()

    const [target] = await db
      .select({
        id: postTargets.id,
        post_id: postTargets.post_id,
        status: postTargets.status,
        schedule_id: postTargets.schedule_id,
      })
      .from(postTargets)
      .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
      .innerJoin(branches, eq(accounts.branch_id, branches.id))
      .where(and(eq(postTargets.id, targetId), eq(branches.organization_id, org.id)))
      .limit(1)

    if (!target) {
      return { success: false, error: "Target publication not found or access denied." }
    }

    if (target.status !== "scheduled" || !target.schedule_id) {
      return { success: false, error: "Target is not currently scheduled." }
    }

    await db
      .update(postTargets)
      .set({
        status: "cancelled",
      })
      .where(eq(postTargets.id, targetId))

    await inngest.send({
      name: "post/target-schedule.cancelled",
      data: {
        targetId,
        scheduleId: target.schedule_id,
      },
    })

    const allTargets = await db
      .select()
      .from(postTargets)
      .where(eq(postTargets.post_id, target.post_id))

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
        .where(eq(posts.id, target.post_id))
    }

    revalidatePath("/dashboard")
    revalidatePath(`/composer/${target.post_id}`)
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Failed to cancel scheduled target:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel scheduled target.",
    }
  }
}

/**
 * Reschedules/updates an existing scheduled post campaign.
 * Scoped to current organization.
 */
export async function updateAndReschedulePost(
  postId: string,
  data: {
    title: string
    body?: string
    mediaUrl?: string | null
    mediaType?: "photo" | "video" | null
    postType?: "post" | "story"
    targets: {
      accountId: string
      address?: string | null
      dateStr: string
      timeStr: string
      timezone: string
      branchName: string
    }[]
  }
) {
  const { title, body = "", mediaUrl, mediaType, postType = "post", targets } = data

  if (!title || title.trim() === "") {
    return { success: false, error: "Event Title is required." }
  }
  if (postType !== "story" && (!body || body.trim() === "")) {
    return { success: false, error: "Body text is required." }
  }
  if (!targets || targets.length === 0) {
    return { success: false, error: "At least one target account must be selected." }
  }

  const accountIds = targets.map((t) => t.accountId)
  try {
    await validateAccountsBelongToOrg(accountIds)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Access denied." }
  }

  const scheduledTargets = []
  for (const t of targets) {
    if (!t.dateStr || !t.timeStr) {
      return { success: false, error: `Date and time are required for branch "${t.branchName}".` }
    }
    if (!t.timezone) {
      return { success: false, error: `Timezone is not configured for branch "${t.branchName}".` }
    }

    try {
      const utcDate = getUtcDateInTimezone(t.dateStr, t.timeStr, t.timezone)
      if (utcDate.getTime() <= Date.now()) {
        return { success: false, error: `The scheduled time for branch "${t.branchName}" has already passed.` }
      }
      scheduledTargets.push({
        ...t,
        scheduledAt: utcDate,
      })
    } catch (err) {
      return { success: false, error: `Invalid date/time format for branch "${t.branchName}".` }
    }
  }

  try {
    const oldTargets = await db
      .select()
      .from(postTargets)
      .where(eq(postTargets.post_id, postId))

    for (const ot of oldTargets) {
      if (ot.status === "scheduled" && ot.schedule_id) {
        await inngest.send({
          name: "post/target-schedule.cancelled",
          data: {
            targetId: ot.id,
            scheduleId: ot.schedule_id,
          },
        })
      }
    }

    await db.delete(postTargets).where(eq(postTargets.post_id, postId))

    await db
      .update(posts)
      .set({
        title: title.trim(),
        body: body.trim(),
        status: "scheduled",
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        post_type: postType,
      })
      .where(eq(posts.id, postId))

    for (const t of scheduledTargets) {
      const scheduleId = crypto.randomUUID()

      const [targetRecord] = await db
        .insert(postTargets)
        .values({
          post_id: postId,
          account_id: t.accountId,
          status: "scheduled",
          asset_url: mediaUrl || null,
          address: t.address?.trim() || null,
          event_at: t.scheduledAt,
          schedule_id: scheduleId,
        })
        .returning()

      await inngest.send({
        name: "post/target-schedule.requested",
        data: {
          targetId: targetRecord.id,
          scheduleId,
          scheduledAt: t.scheduledAt.toISOString(),
        },
      })
    }

    revalidatePath("/composer")
    revalidatePath("/dashboard")
    revalidatePath(`/composer/${postId}`)
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Failed to reschedule post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reschedule post.",
    }
  }
}

/**
 * Updates a scheduled post and triggers immediate publication.
 * Scoped to current organization.
 */
export async function updateAndPublishPost(
  postId: string,
  data: {
    title: string
    body?: string
    mediaUrl?: string | null
    mediaType?: "photo" | "video" | null
    postType?: "post" | "story"
    targets: { accountId: string; address?: string | null }[]
  }
) {
  const { title, body = "", mediaUrl, mediaType, postType = "post", targets } = data

  if (!title || title.trim() === "") {
    return { success: false, error: "Event Title is required." }
  }
  if (postType !== "story" && (!body || body.trim() === "")) {
    return { success: false, error: "Body text is required." }
  }
  if (!targets || targets.length === 0) {
    return { success: false, error: "At least one target account must be selected." }
  }

  const accountIds = targets.map((t) => t.accountId)
  try {
    await validateAccountsBelongToOrg(accountIds)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Access denied." }
  }

  try {
    const oldTargets = await db
      .select()
      .from(postTargets)
      .where(eq(postTargets.post_id, postId))

    for (const ot of oldTargets) {
      if (ot.status === "scheduled" && ot.schedule_id) {
        await inngest.send({
          name: "post/target-schedule.cancelled",
          data: {
            targetId: ot.id,
            scheduleId: ot.schedule_id,
          },
        })
      }
    }

    await db.delete(postTargets).where(eq(postTargets.post_id, postId))

    await db
      .update(posts)
      .set({
        title: title.trim(),
        body: body.trim(),
        status: "publishing",
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        post_type: postType,
      })
      .where(eq(posts.id, postId))

    const targetsToInsert = targets.map((target) => ({
      post_id: postId,
      account_id: target.accountId,
      status: "pending" as const,
      asset_url: mediaUrl || null,
      address: target.address?.trim() || null,
    }))

    await db.insert(postTargets).values(targetsToInsert)

    await inngest.send({
      name: "post/publish.requested",
      data: {
        postId,
      },
    })

    revalidatePath("/composer")
    revalidatePath("/dashboard")
    revalidatePath(`/composer/${postId}`)
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Failed to update and publish post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish post.",
    }
  }
}

/**
 * Fetches all active target publications that are currently in 'scheduled' status.
 * Scoped to current organization. Optionally filters by branchId.
 */
export async function getScheduledTargetsAction(branchId: string | null) {
  try {
    const org = await getCurrentOrganization()
    if (!org) return []

    let query = db
      .select({
        targetId: postTargets.id,
        postId: posts.id,
        postTitle: posts.title,
        postBody: posts.body,
        mediaUrl: posts.media_url,
        mediaType: posts.media_type,
        eventAt: postTargets.event_at,
        scheduleId: postTargets.schedule_id,
        status: postTargets.status,
        account: {
          id: accounts.id,
          platform_type: accounts.platform_type,
          credentials_json: accounts.credentials_json,
        },
        branch: {
          id: branches.id,
          name: branches.name,
          timezone: branches.timezone,
        },
      })
      .from(postTargets)
      .innerJoin(posts, eq(postTargets.post_id, posts.id))
      .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
      .innerJoin(branches, eq(accounts.branch_id, branches.id))
      .orderBy(postTargets.event_at)

    const baseQuery = and(
      eq(postTargets.status, "scheduled"),
      eq(branches.organization_id, org.id),
      eq(postTargets.hidden_from_calendar, false)
    )
    const results = branchId 
      ? await query.where(and(baseQuery, eq(branches.id, branchId))) 
      : await query.where(baseQuery)

    return results.map((r) => {
      const handle = decryptAndGetHandle(r.account.platform_type, r.account.credentials_json)
      return {
        targetId: r.targetId,
        postId: r.postId,
        postTitle: r.postTitle,
        postBody: r.postBody,
        mediaUrl: r.mediaUrl,
        mediaType: r.mediaType,
        eventAt: r.eventAt,
        scheduleId: r.scheduleId,
        status: r.status,
        account: {
          id: r.account.id,
          platformType: r.account.platform_type,
          handle,
        },
        branch: {
          id: r.branch.id,
          name: r.branch.name,
          timezone: r.branch.timezone,
        },
      }
    })
  } catch (error) {
    console.error("Failed to fetch scheduled targets:", error)
    return []
  }
}

/**
 * Handles uploading the media file (photo or video) for Canva autofill or direct publish.
 * Scoped to authenticated user in an organization.
 */
export async function uploadMedia(
  formData: FormData,
  mediaType: "photo" | "video"
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requireCurrentOrganization()

    const file = formData.get("file") as File | null
    if (!file) {
      return { success: false, error: "No file provided." }
    }

    let allowedTypes: string[] = []
    let maxSizeBytes = 100 * 1024 * 1024

    if (mediaType === "video") {
      allowedTypes = ["video/mp4", "video/quicktime"]
      maxSizeBytes = 1024 * 1024 * 1024
    } else {
      allowedTypes = ["image/jpeg", "image/png", "image/webp"]
      maxSizeBytes = 100 * 1024 * 1024
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Supported formats: ${
          mediaType === "video" ? "MP4, MOV" : "JPG, PNG, WEBP"
        }.`,
      }
    }

    if (file.size > maxSizeBytes) {
      const limitText = mediaType === "video" ? "1 GB" : "100 MB"
      return {
        success: false,
        error: `File size exceeds the ${limitText} limit.`,
      }
    }

    const isMockImageKit =
      !process.env.IMAGEKIT_PRIVATE_KEY ||
      process.env.IMAGEKIT_PRIVATE_KEY.startsWith("mock_") ||
      !process.env.IMAGEKIT_URL_ENDPOINT ||
      process.env.IMAGEKIT_URL_ENDPOINT.startsWith("http://localhost") ||
      process.env.IMAGEKIT_URL_ENDPOINT.includes("mock")

    if (!isMockImageKit) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const uploadResponse = await imagekit.upload({
          file: buffer,
          fileName: file.name,
          folder: "/social-copilot",
        })
        if (uploadResponse && uploadResponse.url) {
          return { success: true, url: uploadResponse.url }
        }
      } catch (uploadError) {
        console.error("ImageKit upload failed, falling back to local storage:", uploadError)
      }
    }

    const publicUploadsDir = path.join(process.cwd(), "public", "uploads")
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true })
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${sanitizedName}`
    const localFilePath = path.join(publicUploadsDir, uniqueName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(localFilePath, buffer)

    return { success: true, url: `/uploads/${uniqueName}` }
  } catch (error) {
    console.error("uploadMedia action error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal server error during upload.",
    }
  }
}

/**
 * Edits an already published Telegram post in channel using GrammY API.
 */
export async function editTelegramPost(
  postTargetId: string,
  data: { title: string; body: string; mediaUrl?: string | null }
) {
  try {
    const org = await requireCurrentOrganization()

    // 1. Fetch target with post & account details
    const [target] = await db
      .select({
        id: postTargets.id,
        post_id: postTargets.post_id,
        account_id: postTargets.account_id,
        status: postTargets.status,
        platform_message_id: postTargets.platform_message_id,
        event_at: postTargets.event_at,
        asset_url: postTargets.asset_url,
        post: {
          id: posts.id,
          title: posts.title,
          body: posts.body,
          media_url: posts.media_url,
          media_type: posts.media_type,
        },
        account: {
          id: accounts.id,
          platform_type: accounts.platform_type,
          credentials_json: accounts.credentials_json,
        },
      })
      .from(postTargets)
      .innerJoin(posts, eq(postTargets.post_id, posts.id))
      .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
      .innerJoin(branches, eq(accounts.branch_id, branches.id))
      .where(and(eq(postTargets.id, postTargetId), eq(branches.organization_id, org.id)))
      .limit(1)

    if (!target) {
      return { success: false, error: "Target post not found or access denied." }
    }

    if (target.account.platform_type !== "telegram") {
      return { success: false, error: "Edit post action is only supported for Telegram targets." }
    }

    if (!target.platform_message_id) {
      return { success: false, error: "Platform message ID missing. Cannot edit Telegram post." }
    }

    // 2. Decrypt credentials
    const decryptedCredsStr = decrypt(target.account.credentials_json)
    const creds = JSON.parse(decryptedCredsStr) as { botToken?: string; channelId?: string }

    if (!creds.botToken || !creds.channelId) {
      return { success: false, error: "Invalid Telegram bot credentials." }
    }

    const { botToken, channelId } = creds

    // 3. Format caption/text
    const eventDate = target.event_at ? new Date(target.event_at) : null
    const formattedDate = eventDate ? format(eventDate, "EEE, MMM d, yyyy 'at' h:mm a") : ""
    const caption = `${data.title.trim()}\n\n${data.body.trim()}${formattedDate ? `\n\nEvent: ${formattedDate}` : ""}`

    const isMock =
      botToken.startsWith("mock_") ||
      botToken === "123456:ABC-DEF" ||
      !/^\d+:[A-Za-z0-9_-]+$/.test(botToken)

    if (isMock) {
      console.log(
        `[Telegram Mock Edit] Target: ${postTargetId}, MessageID: ${target.platform_message_id}, Caption: ${caption}`
      )
    } else {
      const bot = new Bot(botToken)
      const msgId = Number(target.platform_message_id)
      const activeMediaUrl = data.mediaUrl !== undefined ? data.mediaUrl : (target.asset_url || target.post.media_url)

      if (data.mediaUrl) {
        const resolvedUrl = data.mediaUrl.startsWith("/")
          ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${data.mediaUrl}`
          : data.mediaUrl

        await bot.api.editMessageMedia(channelId, msgId, {
          type: target.post.media_type === "video" ? "video" : "photo",
          media: resolvedUrl,
          caption,
        })
      } else if (activeMediaUrl) {
        await bot.api.editMessageCaption(channelId, msgId, { caption })
      } else {
        await bot.api.editMessageText(channelId, msgId, caption)
      }
    }

    // 4. Update DB
    await db
      .update(posts)
      .set({
        title: data.title.trim(),
        body: data.body.trim(),
        ...(data.mediaUrl !== undefined ? { media_url: data.mediaUrl } : {}),
      })
      .where(eq(posts.id, target.post_id))

    if (data.mediaUrl !== undefined) {
      await db
        .update(postTargets)
        .set({ asset_url: data.mediaUrl })
        .where(eq(postTargets.id, postTargetId))
    }

    revalidatePath("/composer")
    revalidatePath("/dashboard")
    revalidatePath(`/composer/${target.post_id}`)
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Failed to edit Telegram post:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to edit Telegram post.",
    }
  }
}

/**
 * Hides an Instagram post target from calendar view locally in DB.
 */
export async function hideFromCalendar(postTargetId: string) {
  try {
    const org = await requireCurrentOrganization()

    const [target] = await db
      .select({
        id: postTargets.id,
        post_id: postTargets.post_id,
      })
      .from(postTargets)
      .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
      .innerJoin(branches, eq(accounts.branch_id, branches.id))
      .where(and(eq(postTargets.id, postTargetId), eq(branches.organization_id, org.id)))
      .limit(1)

    if (!target) {
      return { success: false, error: "Target post not found or access denied." }
    }

    await db
      .update(postTargets)
      .set({
        hidden_from_calendar: true,
        hidden_at: new Date(),
      })
      .where(eq(postTargets.id, postTargetId))

    revalidatePath("/composer")
    revalidatePath("/dashboard")
    revalidatePath(`/composer/${target.post_id}`)
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Failed to hide post target from calendar:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to hide post target from calendar.",
    }
  }
}

/**
 * Retrieves all posts for the month with aggregated platform types.
 * @param year full year (e.g. 2026)
 * @param month 0-indexed month (0 = January, 11 = December)
 */
export async function getPostsForCalendar(year: number, month: number) {
  try {
    const org = await getCurrentOrganization()
    if (!org) return []

    const start = startOfMonth(new Date(year, month))
    const end = endOfMonth(new Date(year, month))

    const results = await db
      .select({
        id: posts.id,
        title: posts.title,
        post_type: posts.post_type,
        event_at: min(postTargets.event_at),
        status: posts.status,
        platforms: sql<string[]>`array_agg(DISTINCT ${accounts.platform_type})`,
      })
      .from(posts)
      .innerJoin(postTargets, eq(postTargets.post_id, posts.id))
      .innerJoin(accounts, eq(accounts.id, postTargets.account_id))
      .innerJoin(branches, eq(branches.id, accounts.branch_id))
      .where(
        and(
          eq(branches.organization_id, org.id),
          between(postTargets.event_at, start, end),
          eq(postTargets.hidden_from_calendar, false)
        )
      )
      .groupBy(posts.id, posts.title, posts.post_type, posts.status)

    return results
  } catch (error) {
    console.error("Failed to fetch calendar posts:", error)
    return []
  }
}
