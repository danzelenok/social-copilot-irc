import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { organizations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// Public auth routes that bypass tenant checks
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/inngest(.*)",
])

// Onboarding flow routes
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"])
const isInviteRoute = createRouteMatcher(["/invite(.*)"])
const isAccessDeniedRoute = createRouteMatcher(["/access-denied(.*)"])

export const proxy = clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return
  }

  const { userId, orgId } = await auth()

  // Protect unauthenticated users
  if (!userId) {
    await auth.protect()
    return
  }

  // 8. Mock Mode Check for Local Development
  if (process.env.MOCK_ORG_ID) {
    if (isOnboardingRoute(req) || isInviteRoute(req) || isAccessDeniedRoute(req)) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    return
  }

  // 1 & 2: Check active orgId in Clerk session
  if (orgId) {
    const [dbOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrgId, orgId))
      .limit(1)

    if (dbOrg) {
      // 1. Active org exists in DB -> allow access
      if (isOnboardingRoute(req) || isInviteRoute(req) || isAccessDeniedRoute(req)) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
      return
    } else {
      // 2. Active org in session BUT NOT in DB -> show /access-denied
      if (!isAccessDeniedRoute(req)) {
        return NextResponse.redirect(new URL("/access-denied", req.url))
      }
      return
    }
  }

  // 3 & 4: No orgId in session. Check pending invitations in Clerk
  const client = await clerkClient()
  const invitationsResponse = await client.users.getOrganizationInvitationList({
    userId,
    status: "pending",
  })

  const hasPendingInvitation =
    invitationsResponse && invitationsResponse.data && invitationsResponse.data.length > 0

  if (hasPendingInvitation) {
    // 3. Show /invite screen
    if (!isInviteRoute(req)) {
      return NextResponse.redirect(new URL("/invite", req.url))
    }
    return
  }

  // 4. Show /onboarding screen
  if (!isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL("/onboarding", req.url))
  }
  return
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
