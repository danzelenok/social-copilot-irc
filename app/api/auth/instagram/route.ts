import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { verifyState } from "@/lib/utils/state";
import { encrypt, decrypt } from "@/lib/utils/encryption";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");

  // 1. Check if OAuth failed or cancelled
  if (error || !code || !state) {
    const errorMsg = errorDescription || errorReason || error || "OAuth flow was cancelled or failed.";
    let branchId = "";
    if (state) {
      try {
        const verified = verifyState(state);
        if (verified) branchId = verified;
      } catch {}
    }
    const redirectUrl = branchId 
      ? `/branches/${branchId}?error=${encodeURIComponent(errorMsg)}` 
      : `/branches?error=${encodeURIComponent(errorMsg)}`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // 2. CSRF protection: Verify state
  let branchId: string | null = null;
  try {
    branchId = verifyState(state);
  } catch (err) {
    console.error("State verification failed:", err);
  }

  if (!branchId) {
    return NextResponse.redirect(
      new URL(
        `/branches?error=${encodeURIComponent("Invalid or expired state parameter (CSRF protection activated).")}`,
        req.url
      )
    );
  }

  try {
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    if (!appId || !appSecret || !redirectUri) {
      throw new Error("Instagram OAuth configuration is missing on the server.");
    }

    let username = "";
    let instagramUserId = "";
    let oauthToken = "";
    let expiresAt = "";

    // 3. Execute OAuth Flow
    if (appId === "mock_app_id" || code.startsWith("mock_")) {
      // Simulation Mode: Skip Meta API calls
      username = "mock_instagram_user";
      instagramUserId = "mock_ig_user_123456789";
      oauthToken = `mock_long_lived_token_ig_${Date.now()}`;
      
      // Calculate 60 days expiration
      const sixtyDaysInMs = 60 * 24 * 60 * 60 * 1000;
      expiresAt = new Date(Date.now() + sixtyDaysInMs).toISOString();
    } else {
      // Real Meta API Mode
      // A. Exchange code for short-lived access token
      const shortLivedResponse = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      });

      if (!shortLivedResponse.ok) {
        const errorData = await shortLivedResponse.json();
        throw new Error(errorData.error_message || "Failed to exchange short-lived access token.");
      }

      const shortLivedData = await shortLivedResponse.json();
      const shortLivedToken = shortLivedData.access_token;

      // B. Exchange short-lived token for long-lived token (60-day)
      const longLivedResponse = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
      );

      if (!longLivedResponse.ok) {
        const errorData = await longLivedResponse.json();
        throw new Error(errorData.error?.message || "Failed to exchange long-lived access token.");
      }

      const longLivedData = await longLivedResponse.json();
      oauthToken = longLivedData.access_token;
      const expiresIn = longLivedData.expires_in || 5184000; // default to 60 days in seconds
      expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // C. Fetch user's Instagram username and ID
      const meResponse = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${oauthToken}`
      );

      if (!meResponse.ok) {
        const errorData = await meResponse.json();
        throw new Error(errorData.error?.message || "Failed to fetch Instagram user profile.");
      }

      const meData = await meResponse.json();
      username = meData.username;
      instagramUserId = meData.id;
    }

    const credentials = {
      username,
      instagramUserId,
      oauthToken,
      expiresAt,
    };

    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // 4. Save/Update in accounts table
    // Fetch branch's existing Instagram accounts to see if this username is already connected
    const branchAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.branch_id, branchId), eq(accounts.platform_type, "instagram")));

    let existingAccountId: string | null = null;
    for (const acc of branchAccounts) {
      try {
        const decrypted = JSON.parse(decrypt(acc.credentials_json));
        if (decrypted.username === username) {
          existingAccountId = acc.id;
          break;
        }
      } catch (e) {
        console.error("Failed to decrypt credentials during lookup check:", e);
      }
    }

    if (existingAccountId) {
      // Update the existing connection
      await db
        .update(accounts)
        .set({
          credentials_json: encryptedCredentials,
          is_active: true,
        })
        .where(eq(accounts.id, existingAccountId));
    } else {
      // Create new account connection
      await db.insert(accounts).values({
        branch_id: branchId,
        platform_type: "instagram",
        credentials_json: encryptedCredentials,
        is_active: true,
      });
    }

    // 5. Revalidate Next.js cache so the new account appears immediately
    revalidatePath(`/branches/${branchId}`);
    revalidatePath("/branches");
    revalidatePath("/", "layout");

    // 6. Redirect back to branch details with success message
    const successUrl = `/branches/${branchId}?success=${encodeURIComponent(
      `Successfully connected Instagram account @${username}`
    )}`;
    return NextResponse.redirect(new URL(successUrl, req.url));
  } catch (err) {
    console.error("Instagram OAuth connection error:", err);
    const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred during Instagram OAuth.";
    const errorUrl = `/branches/${branchId}?error=${encodeURIComponent(errorMsg)}`;
    return NextResponse.redirect(new URL(errorUrl, req.url));
  }
}
