"use server"

import { db } from "@/lib/db"
import { branches, accounts } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { decryptAndGetHandle } from "@/lib/utils/accounts"

export interface BranchWithAccounts {
  id: string
  name: string
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
}

/**
 * Returns all branches ordered by created_at desc, enriched with active account counts and platforms.
 */
export async function getBranches(): Promise<BranchWithAccounts[]> {
  try {
    const branchList = await db.select().from(branches).orderBy(desc(branches.created_at))
    const accountList = await db.select().from(accounts)

    return branchList.map((branch) => {
      const branchAccounts = accountList.filter((acc) => acc.branch_id === branch.id)
      const platforms = Array.from(
        new Set(branchAccounts.map((acc) => acc.platform_type))
      )

      return {
        id: branch.id,
        name: branch.name,
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
      }
    })
  } catch (error) {
    console.error("Failed to fetch branches:", error)
    throw new Error("Failed to load branches list.")
  }
}

/**
 * Inserts a new branch, and revalidates paths.
 */
export async function createBranch(data: { name: string }) {
  if (!data.name || data.name.trim() === "") {
    return { success: false, error: "Branch name is required." }
  }
  if (data.name.trim().length > 100) {
    return { success: false, error: "Branch name must be 100 characters or less." }
  }

  try {
    const [newBranch] = await db
      .insert(branches)
      .values({
        name: data.name.trim(),
      })
      .returning()

    revalidatePath("/branches")
    revalidatePath("/", "layout")

    return { success: true, branch: newBranch }
  } catch (error) {
    console.error("Failed to create branch:", error)
    return { success: false, error: "Failed to create branch. Please try again." }
  }
}

/**
 * Updates a branch's name.
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
    const [updatedBranch] = await db
      .update(branches)
      .set({
        name: data.name.trim(),
      })
      .where(eq(branches.id, id))
      .returning()

    if (!updatedBranch) {
      return { success: false, error: "Branch not found." }
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
 * Deletes a branch. If the branch has active accounts, blocks deletion and returns an error payload.
 */
export async function deleteBranch(id: string) {
  if (!id) {
    return { success: false, error: "Branch ID is required." }
  }

  try {
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

    // Delete branch (Drizzle CASCADE handles deleting any inactive accounts)
    await db.delete(branches).where(eq(branches.id, id))

    revalidatePath("/branches")
    revalidatePath("/", "layout")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete branch:", error)
    return { success: false, error: "Failed to delete branch. Please try again." }
  }
}
