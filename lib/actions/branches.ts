"use server"

import { db } from "@/lib/db"
import { branches, accounts, branchAddresses } from "@/lib/db/schema"
import { and, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { decryptAndGetHandle } from "@/lib/utils/accounts"
import { getCurrentOrganization, requireCurrentOrganization } from "@/lib/auth/org"

export interface BranchWithAccounts {
  id: string
  organization_id: string
  name: string
  timezone: string | null
  created_at: Date
  accountCount: number
  platforms: ("telegram" | "instagram" | "framer" | "subsplash")[]
  accounts?: {
    id: string
    branch_id: string
    platform_type: "telegram" | "instagram" | "framer" | "subsplash"
    is_active: boolean
    created_at: Date
    handle?: string
  }[]
  addresses?: {
    id: string
    branch_id: string
    label: string
    address_text: string
    is_default: boolean
    created_at: Date
  }[]
}

/**
 * Returns all branches ordered by created_at desc for the current organization,
 * enriched with active account counts, platforms, and saved addresses.
 */
export async function getBranches(): Promise<BranchWithAccounts[]> {
  try {
    const org = await getCurrentOrganization()
    if (!org) return []

    const branchList = await db
      .select()
      .from(branches)
      .where(eq(branches.organization_id, org.id))
      .orderBy(desc(branches.created_at))

    const branchIds = branchList.map((b) => b.id)
    if (branchIds.length === 0) return []

    const accountList = await db
      .select()
      .from(accounts)
      .where(inArray(accounts.branch_id, branchIds))

    const addressList = await db
      .select()
      .from(branchAddresses)
      .where(inArray(branchAddresses.branch_id, branchIds))
      .orderBy(desc(branchAddresses.is_default), desc(branchAddresses.created_at))

    return branchList.map((branch) => {
      const branchAccounts = accountList.filter((acc) => acc.branch_id === branch.id)
      const platforms = Array.from(
        new Set(branchAccounts.map((acc) => acc.platform_type))
      )

      return {
        id: branch.id,
        organization_id: branch.organization_id,
        name: branch.name,
        timezone: branch.timezone,
        created_at: branch.created_at,
        accountCount: branchAccounts.length,
        platforms: platforms as ("telegram" | "instagram" | "framer" | "subsplash")[],
        accounts: branchAccounts.map((acc) => ({
          id: acc.id,
          branch_id: acc.branch_id,
          platform_type: acc.platform_type as "telegram" | "instagram" | "framer" | "subsplash",
          is_active: acc.is_active,
          created_at: acc.created_at,
          handle: decryptAndGetHandle(acc.platform_type, acc.credentials_json),
        })),
        addresses: addressList
          .filter((addr) => addr.branch_id === branch.id)
          .map((addr) => ({
            id: addr.id,
            branch_id: addr.branch_id,
            label: addr.label,
            address_text: addr.address_text,
            is_default: addr.is_default,
            created_at: addr.created_at,
          })),
      }
    })
  } catch (error) {
    console.error("Failed to fetch branches:", error)
    throw new Error("Failed to load branches list.")
  }
}

/**
 * Inserts a new branch scoped to current organization, and revalidates paths.
 */
export async function createBranch(data: { name: string }) {
  if (!data.name || data.name.trim() === "") {
    return { success: false, error: "Branch name is required." }
  }
  if (data.name.trim().length > 100) {
    return { success: false, error: "Branch name must be 100 characters or less." }
  }

  try {
    const org = await requireCurrentOrganization()

    const [newBranch] = await db
      .insert(branches)
      .values({
        organization_id: org.id,
        name: data.name.trim(),
      })
      .returning()

    revalidatePath("/branches")
    revalidatePath("/", "layout")

    return { success: true, branch: newBranch }
  } catch (error) {
    console.error("Failed to create branch:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create branch.",
    }
  }
}

/**
 * Updates a branch's name scoped to current organization.
 */
export async function updateBranch(id: string, data: { name: string }) {
  if (!id) {
    return { success: false, error: "Branch ID is required." }
  }
  if (!data.name || data.name.trim() === "") {
    return { success: false, error: "Branch name is required." }
  }
  if (data.name.trim().length > 100) {
    return { success: false, error: "Branch name must be 100 characters or less." }
  }

  try {
    const org = await requireCurrentOrganization()

    const [updatedBranch] = await db
      .update(branches)
      .set({
        name: data.name.trim(),
      })
      .where(and(eq(branches.id, id), eq(branches.organization_id, org.id)))
      .returning()

    if (!updatedBranch) {
      return { success: false, error: "Branch not found or access denied." }
    }

    revalidatePath("/branches")
    revalidatePath("/", "layout")

    return { success: true, branch: updatedBranch }
  } catch (error) {
    console.error("Failed to update branch:", error)
    return { success: false, error: "Failed to update branch. Please try again." }
  }
}

/**
 * Updates a branch's timezone scoped to current organization.
 */
export async function updateBranchTimezone(id: string, timezone: string | null) {
  if (!id) {
    return { success: false, error: "Branch ID is required." }
  }

  try {
    const org = await requireCurrentOrganization()

    const [updatedBranch] = await db
      .update(branches)
      .set({
        timezone,
      })
      .where(and(eq(branches.id, id), eq(branches.organization_id, org.id)))
      .returning()

    if (!updatedBranch) {
      return { success: false, error: "Branch not found or access denied." }
    }

    revalidatePath("/branches")
    revalidatePath(`/branches/${id}`)
    revalidatePath("/", "layout")

    return { success: true, branch: updatedBranch }
  } catch (error) {
    console.error("Failed to update branch timezone:", error)
    return { success: false, error: "Failed to update branch timezone. Please try again." }
  }
}

/**
 * Deletes a branch scoped to current organization. If the branch has active accounts, blocks deletion.
 */
export async function deleteBranch(id: string) {
  if (!id) {
    return { success: false, error: "Branch ID is required." }
  }

  try {
    const org = await requireCurrentOrganization()

    const [existing] = await db
      .select()
      .from(branches)
      .where(and(eq(branches.id, id), eq(branches.organization_id, org.id)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Branch not found or access denied." }
    }

    // Check for active accounts connected to this branch
    const activeAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.branch_id, id), eq(accounts.is_active, true)))

    if (activeAccounts.length > 0) {
      return {
        success: false,
        error: "Cannot delete branch with active accounts.",
        activeAccounts: activeAccounts.map((a) => ({
          id: a.id,
          platform_type: a.platform_type,
        })),
      }
    }

    // Delete branch
    await db
      .delete(branches)
      .where(and(eq(branches.id, id), eq(branches.organization_id, org.id)))

    revalidatePath("/branches")
    revalidatePath("/", "layout")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete branch:", error)
    return { success: false, error: "Failed to delete branch. Please try again." }
  }
}
