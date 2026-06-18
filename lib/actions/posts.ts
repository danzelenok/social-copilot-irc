"use server"

import { db } from "@/lib/db"
import { posts, postTargets, accounts, branches } from "@/lib/db/schema"
import { inngest } from "@/lib/inngest/client"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { decryptAndGetHandle } from "@/lib/utils/accounts"
import fs from "fs"
import path from "path"
import { imagekit } from "@/lib/imagekit"

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
 * Creates a post with draft status and creates post target records.
 */
export async function createDraftPost(data: {
  title: string
  body: string
  eventAt: Date
  targetAccountIds: string[]
  mediaUrl?: string | null
  mediaType?: "photo" | "video" | null
}) {
  const { title, body, eventAt, targetAccountIds, mediaUrl, mediaType } = data

  if (!title || title.trim() === "") {
    return { success: false, error: "Event Title is required." }
  }
  if (!body || body.trim() === "") {
    return { success: false, error: "Body text is required." }
  }
  if (!eventAt) {
    return { success: false, error: "Event Date & Time is required." }
  }
  if (!targetAccountIds || targetAccountIds.length === 0) {
    return { success: false, error: "At least one target account must be selected." }
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Create the post record in draft status
      const [newPost] = await tx
        .insert(posts)
        .values({
          title: title.trim(),
          body: body.trim(),
          event_at: eventAt,
          status: "draft",
          media_url: mediaUrl || null,
          media_type: mediaType || null,
        })
        .returning()

      if (!newPost) {
        throw new Error("Failed to insert post into database.")
      }

      // 2. Create post_targets records
      const targetsToInsert = targetAccountIds.map((accountId) => ({
        post_id: newPost.id,
        account_id: accountId,
        status: "pending" as const,
        asset_url: mediaUrl || null,
      }))

      await tx.insert(postTargets).values(targetsToInsert)

      return newPost
    })

    revalidatePath("/composer")
    revalidatePath("/")

    return { success: true, post: result }
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
 */
export async function getPostTargetsWithDetails(postId: string) {
  try {
    const targets = await db
      .select({
        id: postTargets.id,
        post_id: postTargets.post_id,
        account_id: postTargets.account_id,
        status: postTargets.status,
        asset_url: postTargets.asset_url,
        error_message: postTargets.error_message,
        published_at: postTargets.published_at,
        account: {
          id: accounts.id,
          platform_type: accounts.platform_type,
          credentials_json: accounts.credentials_json,
          is_active: accounts.is_active,
        },
        branch: {
          id: branches.id,
          name: branches.name,
        },
      })
      .from(postTargets)
      .innerJoin(accounts, eq(postTargets.account_id, accounts.id))
      .innerJoin(branches, eq(accounts.branch_id, branches.id))
      .where(eq(postTargets.post_id, postId))

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
        account: {
          id: t.account.id,
          platform_type: t.account.platform_type as "telegram" | "instagram" | "framer" | "subsplash",
          handle,
        },
        branch: {
          id: t.branch.id,
          name: t.branch.name,
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
 */
export async function approveAndPublish(postId: string) {
  try {
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
 * Handles uploading the media file (photo or video) for Canva autofill or direct publish.
 * Validates file type and size. Attempts upload to ImageKit.
 * Falls back to local disk storage if credentials are mock/missing.
 */
export async function uploadMedia(
  formData: FormData,
  mediaType: "photo" | "video"
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get("file") as File | null
    if (!file) {
      return { success: false, error: "No file provided." }
    }

    // 1. Validate file type and size
    let allowedTypes: string[] = []
    let maxSizeBytes = 100 * 1024 * 1024 // 100 MB default

    if (mediaType === "video") {
      allowedTypes = ["video/mp4", "video/quicktime"]
      maxSizeBytes = 1024 * 1024 * 1024 // 1 GB
    } else {
      allowedTypes = ["image/jpeg", "image/png", "image/webp"]
      maxSizeBytes = 100 * 1024 * 1024 // 100 MB
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

    // Check if ImageKit keys are configured/mock
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

    // Fallback: Write file to public/uploads/
    const publicUploadsDir = path.join(process.cwd(), "public", "uploads")
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true })
    }

    // Sanitize filename to avoid folder traversal or bad chars
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
