import { decrypt } from "@/lib/utils/encryption"

export function getAccountHandle(platformType: string, creds: Record<string, string>): string {
  switch (platformType) {
    case "telegram":
      return creds.channelId || "Telegram Channel"
    case "instagram":
      return creds.username || "Instagram Account"
    case "framer":
      return creds.projectId ? `Framer (${creds.projectId})` : "Framer Project"
    case "subsplash":
      return creds.appId ? `Subsplash (${creds.appId})` : "Subsplash App"
    default:
      return "Unknown Account"
  }
}

export function decryptAndGetHandle(platformType: string, credentialsJson: string): string {
  try {
    const decrypted = decrypt(credentialsJson)
    const creds = JSON.parse(decrypted)
    return getAccountHandle(platformType, creds)
  } catch (err) {
    console.error("Failed to decrypt credentials:", err)
    return "Unknown Account"
  }
}
