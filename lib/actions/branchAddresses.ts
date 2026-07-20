"use server"

import { db } from "@/lib/db"
import { branchAddresses, branches } from "@/lib/db/schema"
import { and, desc, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getCurrentOrganization, requireCurrentOrganization } from "@/lib/auth/org"

function revalidateBranchPaths(branchId: string) {
  revalidatePath(`/branches/${branchId}`)
  revalidatePath("/branches")
  revalidatePath("/composer")
}

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
 * Returns all addresses for a branch, defaults first.
 * Scoped to current organization.
 */
export async function getBranchAddresses(branchId: string) {
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

    return await db
      .select()
      .from(branchAddresses)
      .where(eq(branchAddresses.branch_id, branchId))
      .orderBy(desc(branchAddresses.is_default), desc(branchAddresses.created_at))
  } catch (error) {
    console.error("Failed to fetch branch addresses:", error)
    throw new Error("Failed to load branch addresses.")
  }
}

/**
 * Inserts a new address for a branch. If marked default, unsets any other default for that branch.
 * Scoped to current organization.
 */
export async function createBranchAddress(data: {
  branchId: string
  label: string
  addressText: string
  isDefault?: boolean
}) {
  const { branchId, isDefault } = data
  const label = data.label?.trim() || ""
  const addressText = data.addressText?.trim() || ""

  if (!branchId) {
    return { success: false, error: "Branch ID is required." }
  }
  if (!label) {
    return { success: false, error: "Address label is required." }
  }
  if (label.length > 100) {
    return { success: false, error: "Address label must be 100 characters or less." }
  }
  if (!addressText) {
    return { success: false, error: "Address is required." }
  }
  if (addressText.length > 300) {
    return { success: false, error: "Address must be 300 characters or less." }
  }

  try {
    await verifyBranchBelongsToOrg(branchId)

    if (isDefault) {
      await db
        .update(branchAddresses)
        .set({ is_default: false })
        .where(eq(branchAddresses.branch_id, branchId))
    }

    const [newAddress] = await db
      .insert(branchAddresses)
      .values({
        branch_id: branchId,
        label,
        address_text: addressText,
        is_default: !!isDefault,
      })
      .returning()

    revalidateBranchPaths(branchId)

    return { success: true, address: newAddress }
  } catch (error) {
    console.error("Failed to create branch address:", error)
    return { success: false, error: "Failed to create address. Please try again." }
  }
}

/**
 * Updates an existing branch address. If marked default, unsets any other default for that branch.
 * Scoped to current organization.
 */
export async function updateBranchAddress(
  id: string,
  data: { label?: string; addressText?: string; isDefault?: boolean }
) {
  if (!id) {
    return { success: false, error: "Address ID is required." }
  }

  try {
    const org = await requireCurrentOrganization()

    const [existing] = await db
      .select({
        id: branchAddresses.id,
        branch_id: branchAddresses.branch_id,
        label: branchAddresses.label,
        address_text: branchAddresses.address_text,
        is_default: branchAddresses.is_default,
      })
      .from(branchAddresses)
      .innerJoin(branches, eq(branchAddresses.branch_id, branches.id))
      .where(and(eq(branchAddresses.id, id), eq(branches.organization_id, org.id)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Address not found or access denied." }
    }

    const updateFields: Partial<typeof branchAddresses.$inferInsert> = {}

    if (data.label !== undefined) {
      const label = data.label.trim()
      if (!label) {
        return { success: false, error: "Address label is required." }
      }
      if (label.length > 100) {
        return { success: false, error: "Address label must be 100 characters or less." }
      }
      updateFields.label = label
    }

    if (data.addressText !== undefined) {
      const addressText = data.addressText.trim()
      if (!addressText) {
        return { success: false, error: "Address is required." }
      }
      if (addressText.length > 300) {
        return { success: false, error: "Address must be 300 characters or less." }
      }
      updateFields.address_text = addressText
    }

    if (data.isDefault !== undefined) {
      updateFields.is_default = data.isDefault
    }

    if (data.isDefault) {
      await db
        .update(branchAddresses)
        .set({ is_default: false })
        .where(and(eq(branchAddresses.branch_id, existing.branch_id), ne(branchAddresses.id, id)))
    }

    const [updatedAddress] = await db
      .update(branchAddresses)
      .set(updateFields)
      .where(eq(branchAddresses.id, id))
      .returning()

    revalidateBranchPaths(existing.branch_id)

    return { success: true, address: updatedAddress }
  } catch (error) {
    console.error("Failed to update branch address:", error)
    return { success: false, error: "Failed to update address. Please try again." }
  }
}

/**
 * Hard deletes a branch address.
 * Scoped to current organization.
 */
export async function deleteBranchAddress(id: string) {
  if (!id) {
    return { success: false, error: "Address ID is required." }
  }

  try {
    const org = await requireCurrentOrganization()

    const [existing] = await db
      .select({
        id: branchAddresses.id,
        branch_id: branchAddresses.branch_id,
      })
      .from(branchAddresses)
      .innerJoin(branches, eq(branchAddresses.branch_id, branches.id))
      .where(and(eq(branchAddresses.id, id), eq(branches.organization_id, org.id)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Address not found or access denied." }
    }

    await db.delete(branchAddresses).where(eq(branchAddresses.id, id))

    revalidateBranchPaths(existing.branch_id)

    return { success: true }
  } catch (error) {
    console.error("Failed to delete branch address:", error)
    return { success: false, error: "Failed to delete address. Please try again." }
  }
}
