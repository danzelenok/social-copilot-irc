import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { organizations, type Organization } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * Returns the currently active organization for the authenticated user from the database.
 * This function is STRICTLY READ-ONLY. It does not create or modify organizations.
 *
 * Checks MOCK_ORG_ID first for local development support.
 * If no active organization exists in the session or database, returns null.
 */
export async function getCurrentOrganization(): Promise<Organization | null> {
  try {
    const { orgId } = await auth()
    const effectiveClerkOrgId = process.env.MOCK_ORG_ID || orgId

    if (!effectiveClerkOrgId) {
      return null
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrgId, effectiveClerkOrgId))
      .limit(1)

    return org || null
  } catch (error) {
    console.error("Error fetching current organization:", error)
    return null
  }
}

/**
 * Helper that returns the active organization or throws an Error if none exists.
 * Used in server actions that require tenant isolation.
 */
export async function requireCurrentOrganization(): Promise<Organization> {
  const org = await getCurrentOrganization()
  if (!org) {
    throw new Error("Active organization required. Please select or create an organization.")
  }
  return org
}
