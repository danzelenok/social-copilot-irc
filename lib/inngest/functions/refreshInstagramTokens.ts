import { inngest } from "../client"
import { db } from "@/lib/db"
import { accounts } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { encrypt, decrypt } from "@/lib/utils/encryption"

const REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000 // 10 days
const MOCK_EXTENSION_MS = 60 * 24 * 60 * 60 * 1000 // 60 days

export const refreshInstagramTokens = inngest.createFunction(
  {
    id: "refresh-instagram-tokens",
    retries: 1,
    triggers: [{ cron: "0 3 * * *" }], // daily at 03:00 UTC
  },
  async ({ step }) => {
    const instagramAccounts = await step.run("find-expiring-accounts", async () => {
      const rows = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.platform_type, "instagram"), eq(accounts.is_active, true)))

      const expiring = []
      const cutoff = Date.now() + REFRESH_WINDOW_MS

      for (const account of rows) {
        try {
          const creds = JSON.parse(decrypt(account.credentials_json))
          if (creds.expiresAt && new Date(creds.expiresAt).getTime() <= cutoff) {
            expiring.push({ id: account.id, credentials: creds })
          }
        } catch (err) {
          console.error(`[refreshInstagramTokens] Failed to decrypt credentials for account ${account.id}:`, err)
        }
      }

      return expiring
    })

    const results = await Promise.allSettled(
      instagramAccounts.map((account: { id: string; credentials: Record<string, string> }) =>
        step.run(`refresh-account-${account.id}`, async () => {
          await refreshAccountToken(account.id, account.credentials)
        })
      )
    )

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `[refreshInstagramTokens] Failed to refresh token for account ${instagramAccounts[index].id}:`,
          result.reason
        )
      }
    })

    return {
      checked: instagramAccounts.length,
      refreshed: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    }
  }
)

async function refreshAccountToken(accountId: string, credentials: Record<string, string>) {
  const currentToken = credentials.oauthToken as string | undefined

  if (!currentToken) {
    throw new Error("Account has no oauthToken to refresh.")
  }

  let newToken = currentToken
  let expiresAt: string

  if (currentToken.startsWith("mock_")) {
    expiresAt = new Date(Date.now() + MOCK_EXTENSION_MS).toISOString()
  } else {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
    )

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Failed to refresh Instagram token: ${errText}`)
    }

    const data = await res.json()
    newToken = data.access_token
    const expiresIn = data.expires_in || 5184000 // default to 60 days in seconds
    expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  }

  const updatedCredentials = {
    ...credentials,
    oauthToken: newToken,
    expiresAt,
  }

  await db
    .update(accounts)
    .set({ credentials_json: encrypt(JSON.stringify(updatedCredentials)) })
    .where(eq(accounts.id, accountId))
}
