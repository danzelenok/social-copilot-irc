"use server"

import { db } from "@/lib/db"
import { accounts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { encrypt, decrypt } from "@/lib/utils/encryption"
import { signState } from "@/lib/utils/state"

export interface DecryptedAccount {
  id: string
  branch_id: string
  platform_type: "telegram" | "instagram" | "framer" | "subsplash"
  is_active: boolean
  created_at: Date
  credentials: Record<string, string>
  handle: string
}

import { getAccountHandle } from "@/lib/utils/accounts"

function maskCredential(value: string | undefined): string {
  if (!value) return ""
  if (value.length <= 6) return "••••••••"
  return "••••••••" + value.slice(-6)
}

/**
 * Returns all accounts for a branch, with credentials decrypted and masked for client UI safety.
 */
export async function getAccountsByBranch(branchId: string): Promise<DecryptedAccount[]> {
  try {
    const rawAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.branch_id, branchId))

    return rawAccounts.map((acc) => {
      let creds: Record<string, string> = {}
      try {
        const decrypted = decrypt(acc.credentials_json)
        creds = JSON.parse(decrypted)
      } catch (err) {
        console.error(`Failed to decrypt credentials for account ${acc.id}:`, err)
      }

      const maskedCreds = { ...creds }
      if (maskedCreds.botToken) maskedCreds.botToken = maskCredential(maskedCreds.botToken)
      if (maskedCreds.apiKey) maskedCreds.apiKey = maskCredential(maskedCreds.apiKey)
      if (maskedCreds.oauthToken) maskedCreds.oauthToken = maskCredential(maskedCreds.oauthToken)

      return {
        id: acc.id,
        branch_id: acc.branch_id,
        platform_type: acc.platform_type as "telegram" | "instagram" | "framer" | "subsplash",
        is_active: acc.is_active,
        created_at: acc.created_at,
        credentials: maskedCreds,
        handle: getAccountHandle(acc.platform_type, creds),
      }
    })
  } catch (error) {
    console.error("Failed to fetch accounts:", error)
    throw new Error("Failed to load accounts list.")
  }
}

/**
 * Inserts a new account, encrypting its credentials.
 */
export async function createAccount(data: {
  branchId: string
  platformType: "telegram" | "instagram" | "framer" | "subsplash"
  credentials: Record<string, string>
}) {
  const { branchId, platformType, credentials } = data

  if (!branchId) {
    return { success: false, error: "Branch ID is required." }
  }

  // Validate credentials based on platform
  if (platformType === "telegram") {
    if (!credentials.botToken || credentials.botToken.trim() === "") {
      return { success: false, error: "Bot Token is required for Telegram." }
    }
    if (!credentials.channelId || credentials.channelId.trim() === "") {
      return { success: false, error: "Channel ID is required for Telegram." }
    }
  } else if (platformType === "instagram") {
    if (!credentials.username || credentials.username.trim() === "") {
      return { success: false, error: "Username is required for Instagram." }
    }
  } else if (platformType === "framer" || platformType === "subsplash") {
    return { success: false, error: `${platformType.toUpperCase()} accounts are not fully supported yet.` }
  } else {
    return { success: false, error: "Unknown platform type." }
  }

  try {
    const encrypted = encrypt(JSON.stringify(credentials))

    const [newAccount] = await db
      .insert(accounts)
      .values({
        branch_id: branchId,
        platform_type: platformType,
        credentials_json: encrypted,
        is_active: true,
      })
      .returning()

    revalidatePath(`/branches/${branchId}`)
    revalidatePath("/branches")
    revalidatePath("/", "layout")

    return { success: true, account: newAccount }
  } catch (error) {
    console.error("Failed to create account:", error)
    return { success: false, error: "Failed to create account. Please try again." }
  }
}

/**
 * Partially updates an account, preserving existing credentials if submitted values are masked.
 */
export async function updateAccount(
  id: string,
  data: {
    credentials?: Record<string, string>
    isActive?: boolean
  }
) {
  if (!id) {
    return { success: false, error: "Account ID is required." }
  }

  try {
    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))

    if (!existingAccount) {
      return { success: false, error: "Account not found." }
    }

    const updateFields: Partial<typeof accounts.$inferInsert> = {}

    if (data.isActive !== undefined) {
      updateFields.is_active = data.isActive
    }

    if (data.credentials !== undefined) {
      let existingCreds: Record<string, string> = {}
      try {
        const decrypted = decrypt(existingAccount.credentials_json)
        existingCreds = JSON.parse(decrypted)
      } catch (err) {
        console.error("Failed to decrypt existing credentials:", err)
      }

      // Merge: if value is masked, keep existing. Otherwise update.
      const mergedCreds = { ...existingCreds }
      for (const [key, val] of Object.entries(data.credentials)) {
        if (val && val.startsWith("••••••••")) {
          // Keep existing value
          continue
        }
        mergedCreds[key] = val
      }

      // Validate updated credentials
      if (existingAccount.platform_type === "telegram") {
        if (!mergedCreds.botToken || mergedCreds.botToken.trim() === "") {
          return { success: false, error: "Bot Token is required for Telegram." }
        }
        if (!mergedCreds.channelId || mergedCreds.channelId.trim() === "") {
          return { success: false, error: "Channel ID is required for Telegram." }
        }
      } else if (existingAccount.platform_type === "instagram") {
        if (!mergedCreds.username || mergedCreds.username.trim() === "") {
          return { success: false, error: "Username is required for Instagram." }
        }
      }

      updateFields.credentials_json = encrypt(JSON.stringify(mergedCreds))
    }

    const [updatedAccount] = await db
      .update(accounts)
      .set(updateFields)
      .where(eq(accounts.id, id))
      .returning()

    revalidatePath(`/branches/${existingAccount.branch_id}`)
    revalidatePath("/branches")
    revalidatePath("/", "layout")

    return { success: true, account: updatedAccount }
  } catch (error) {
    console.error("Failed to update account:", error)
    return { success: false, error: "Failed to update account. Please try again." }
  }
}

/**
 * Hard deletes an account.
 */
export async function deleteAccount(id: string) {
  if (!id) {
    return { success: false, error: "Account ID is required." }
  }

  try {
    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))

    if (!existingAccount) {
      return { success: false, error: "Account not found." }
    }

    await db.delete(accounts).where(eq(accounts.id, id))

    revalidatePath(`/branches/${existingAccount.branch_id}`)
    revalidatePath("/branches")
    revalidatePath("/", "layout")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete account:", error)
    return { success: false, error: "Failed to delete account. Please try again." }
  }
}

/**
 * Generates the Instagram authorize URL with a CSRF-signed state parameter.
 * Returns either the real Meta OAuth URL or a local simulated Sandbox Consent page URL.
 */
export async function getInstagramAuthUrl(branchId: string) {
  if (!branchId) {
    throw new Error("Branch ID is required to connect an Instagram account.")
  }

  const appId = process.env.INSTAGRAM_APP_ID
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI

  if (!appId || !redirectUri) {
    throw new Error("Instagram configuration is incomplete. Please check your environment variables.")
  }

  const state = signState(branchId)

  // Use local mock consent screen if working with the simulation App ID
  if (appId === "mock_app_id") {
    const mockConsentUrl = `/api/auth/instagram/mock-consent?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}`
    return { success: true, url: mockConsentUrl }
  }

  // Real Meta OAuth Consent Screen URL
  const authorizeUrl = `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=instagram_basic,instagram_content_publish&response_type=code&state=${state}`

  return { success: true, url: authorizeUrl }
}

