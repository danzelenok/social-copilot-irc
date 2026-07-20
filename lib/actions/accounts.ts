"use server"

import { db } from "@/lib/db"
import { accounts, branches } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { encrypt, decrypt } from "@/lib/utils/encryption"
import { signState } from "@/lib/utils/state"
import { getCurrentOrganization, requireCurrentOrganization } from "@/lib/auth/org"
import { getAccountHandle } from "@/lib/utils/accounts"

export interface DecryptedAccount {
  id: string
  branch_id: string
  platform_type: "telegram" | "instagram" | "framer" | "subsplash"
  is_active: boolean
  created_at: Date
  credentials: Record<string, string>
  handle: string
}

function maskCredential(value: string | undefined): string {
  if (!value) return ""
  if (value.length <= 6) return "••••••••"
  return "••••••••" + value.slice(-6)
}

/**
 * Ensures a branch belongs to the current organization.
 */
async function verifyBranchBelongsToOrg(branchId: string) {
  const org = await requireCurrentOrganization()
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.id, branchId), eq(branches.organization_id, org.id)))
    .limit(1)

  if (!branch) {
    throw new Error("Branch not found or access denied.")
  }
  return org
}

/**
 * Returns all accounts for a branch, with credentials decrypted and masked for client UI safety.
 * Scoped to current organization.
 */
export async function getAccountsByBranch(branchId: string): Promise<DecryptedAccount[]> {
  try {
    const org = await getCurrentOrganization()
    if (!org) return []

    // Verify branch belongs to organization
    const [branch] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.organization_id, org.id)))
      .limit(1)

    if (!branch) return []

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
 * Scoped to current organization.
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

  try {
    await verifyBranchBelongsToOrg(branchId)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Access denied." }
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
 * Scoped to current organization.
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
    const org = await requireCurrentOrganization()

    const [existingAccount] = await db
      .select({
        id: accounts.id,
        branch_id: accounts.branch_id,
        platform_type: accounts.platform_type,
        credentials_json: accounts.credentials_json,
        is_active: accounts.is_active,
        created_at: accounts.created_at,
      })
      .from(accounts)
      .innerJoin(branches, eq(accounts.branch_id, branches.id))
      .where(and(eq(accounts.id, id), eq(branches.organization_id, org.id)))
      .limit(1)

    if (!existingAccount) {
      return { success: false, error: "Account not found or access denied." }
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
          continue
        }
        mergedCreds[key] = val
      }

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
 * Scoped to current organization.
 */
export async function deleteAccount(id: string) {
  if (!id) {
    return { success: false, error: "Account ID is required." }
  }

  try {
    const org = await requireCurrentOrganization()

    const [existingAccount] = await db
      .select({
        id: accounts.id,
        branch_id: accounts.branch_id,
      })
      .from(accounts)
      .innerJoin(branches, eq(accounts.branch_id, branches.id))
      .where(and(eq(accounts.id, id), eq(branches.organization_id, org.id)))
      .limit(1)

    if (!existingAccount) {
      return { success: false, error: "Account not found or access denied." }
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
 * Scoped to current organization.
 */
export async function getInstagramAuthUrl(branchId: string) {
  if (!branchId) {
    throw new Error("Branch ID is required to connect an Instagram account.")
  }

  await verifyBranchBelongsToOrg(branchId)

  const appId = process.env.INSTAGRAM_APP_ID
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI

  if (!appId || !redirectUri) {
    throw new Error("Instagram configuration is incomplete. Please check your environment variables.")
  }

  const state = signState(branchId)

  if (appId === "mock_app_id") {
    const mockConsentUrl = `/api/auth/instagram/mock-consent?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}`
    return { success: true, url: mockConsentUrl }
  }

  const authorizeUrl = `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=instagram_business_basic,instagram_business_content_publish&response_type=code&state=${state}`

  return { success: true, url: authorizeUrl }
}
