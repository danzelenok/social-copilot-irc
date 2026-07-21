"use server"

import { db } from "@/lib/db"
import { aiStyleSettings, posts, postTargets, accounts, branches } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { requireCurrentOrganization } from "@/lib/auth/org"
import { revalidatePath } from "next/cache"
import { generateEmbedding } from "@/lib/ai/embeddings"
import { decrypt } from "@/lib/utils/encryption"

/**
 * Retrieves the AI Style Settings for the current organization.
 * Automatically creates a default record if one does not exist.
 */
export async function getAiStyleSettings() {
  const org = await requireCurrentOrganization()

  const [existing] = await db
    .select()
    .from(aiStyleSettings)
    .where(eq(aiStyleSettings.organization_id, org.id))
    .limit(1)

  if (existing) {
    return existing
  }

  const [created] = await db
    .insert(aiStyleSettings)
    .values({
      organization_id: org.id,
      style_examples_enabled: true,
      use_instagram_history_for_style: false,
      custom_prompt: null,
    })
    .returning()

  return created
}

/**
 * Updates the AI Style Settings for the current organization.
 */
export async function updateAiStyleSettings(data: {
  style_examples_enabled: boolean
  use_instagram_history_for_style: boolean
  custom_prompt: string | null
}) {
  const org = await requireCurrentOrganization()

  const existing = await getAiStyleSettings()

  const [updated] = await db
    .update(aiStyleSettings)
    .set({
      style_examples_enabled: data.style_examples_enabled,
      use_instagram_history_for_style: data.use_instagram_history_for_style,
      custom_prompt: data.custom_prompt?.trim() || null,
      updated_at: new Date(),
    })
    .where(eq(aiStyleSettings.id, existing.id))
    .returning()

  revalidatePath("/settings/ai-style")
  return updated
}

/**
 * Imports up to 25 Instagram post captions as style examples for RAG.
 * Stores posts with is_style_example = true and generates embeddings.
 */
export async function importInstagramStyleExamples(organizationId?: string) {
  const org = organizationId
    ? { id: organizationId }
    : await requireCurrentOrganization()

  const [settings] = await db
    .select()
    .from(aiStyleSettings)
    .where(eq(aiStyleSettings.organization_id, org.id))
    .limit(1)

  if (!settings || !settings.use_instagram_history_for_style) {
    throw new Error("Instagram history learning is disabled in settings. Enable it first.")
  }

  // Find active Instagram account for organization
  const igAccounts = await db
    .select({
      account: accounts,
    })
    .from(accounts)
    .innerJoin(branches, eq(accounts.branch_id, branches.id))
    .where(
      and(
        eq(branches.organization_id, org.id),
        eq(accounts.platform_type, "instagram"),
        eq(accounts.is_active, true)
      )
    )
    .limit(1)

  const igAccount = igAccounts[0]?.account
  if (!igAccount) {
    throw new Error("No active Instagram account connected to this organization.")
  }

  let credentials: { accessToken?: string; oauthToken?: string; userId?: string; instagramUserId?: string } = {}
  try {
    credentials = JSON.parse(decrypt(igAccount.credentials_json))
  } catch {
    credentials = {}
  }

  const token = credentials.accessToken || credentials.oauthToken || ""
  const isMock = !token || token.startsWith("mock_") || token === "123456"

  let importedCount = 0

  if (isMock) {
    const mockCaptions = [
      "Join us this Sunday at 10 AM for an uplifting time of worship and message! Everyone is welcome. Bring your family and friends!",
      "Youth Night was incredible! Thank you to everyone who came out to worship, connect, and serve. See you next Wednesday!",
      "Faith, community, and purpose. Don't miss our mid-week prayer gathering tomorrow at 7 PM. Let's stand together in faith.",
    ]

    for (const caption of mockCaptions) {
      const [newPost] = await db
        .insert(posts)
        .values({
          title: caption.slice(0, 50),
          body: caption,
          status: "published",
          is_style_example: true,
          post_type: "post",
        })
        .returning()

      await db.insert(postTargets).values({
        post_id: newPost.id,
        account_id: igAccount.id,
        status: "published",
      })

      try {
        const embedding = await generateEmbedding(caption)
        if (embedding) {
          await db.update(posts).set({ embedding }).where(eq(posts.id, newPost.id))
        }
      } catch (err) {
        console.error("Error generating embedding during mock IG import:", err)
      }

      importedCount++
    }
  } else {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/me/media?fields=caption&access_token=${token}&limit=25`
    )
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Instagram API error: ${errText}`)
    }

    const data = await res.json()
    const mediaList: { id: string; caption?: string }[] = data.data || []

    for (const item of mediaList) {
      if (!item.caption || !item.caption.trim()) continue

      const caption = item.caption.trim()
      const title = caption.slice(0, 50)

      const [newPost] = await db
        .insert(posts)
        .values({
          title,
          body: caption,
          status: "published",
          is_style_example: true,
          post_type: "post",
        })
        .returning()

      await db.insert(postTargets).values({
        post_id: newPost.id,
        account_id: igAccount.id,
        status: "published",
      })

      try {
        const embedding = await generateEmbedding(caption)
        if (embedding) {
          await db.update(posts).set({ embedding }).where(eq(posts.id, newPost.id))
        }
      } catch (err) {
        console.error("Error generating embedding during IG import:", err)
      }

      importedCount++
    }
  }

  revalidatePath("/settings/ai-style")
  return { importedCount }
}
