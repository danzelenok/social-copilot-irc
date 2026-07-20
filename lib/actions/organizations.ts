"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { organizations, branches } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000000" as const

export async function createOrganizationAction(name: string) {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: "Unauthorized. Please sign in first." }
  }

  const trimmedName = name?.trim()
  if (!trimmedName) {
    return { success: false, error: "Organization name is required." }
  }
  if (trimmedName.length > 100) {
    return { success: false, error: "Organization name must be 100 characters or less." }
  }

  try {
    const client = await clerkClient()

    // 1. Create Organization in Clerk via Backend SDK
    const clerkOrg = await client.organizations.createOrganization({
      name: trimmedName,
      createdBy: userId,
    })

    // 2. Create record in our database
    const [newOrg] = await db
      .insert(organizations)
      .values({
        clerkOrgId: clerkOrg.id,
        name: trimmedName,
      })
      .returning()

    // 3. Automatically reassign any pre-migration default branches to the new organization
    if (newOrg) {
      await db
        .update(branches)
        .set({ organization_id: newOrg.id })
        .where(eq(branches.organization_id, DEFAULT_ORG_ID))
    }

    revalidatePath("/", "layout")
  } catch (error) {
    console.error("Failed to create organization:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create organization.",
    }
  }

  redirect("/dashboard")
}
