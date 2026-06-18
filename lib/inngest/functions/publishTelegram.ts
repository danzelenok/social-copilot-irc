import { Bot } from "grammy"
import { db } from "@/lib/db"
import { postTargets } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { format } from "date-fns"

export async function publishTelegram(
  targetId: string,
  post: { title: string; body: string; event_at: Date | string | null },
  credentials: { botToken: string; channelId: string },
  assetUrl: string | null,
  mediaType: string | null
) {
  const { botToken, channelId } = credentials

  // Formatted event date
  const eventDate = post.event_at ? new Date(post.event_at) : null
  const formattedDate = eventDate ? format(eventDate, "EEE, MMM d, yyyy 'at' h:mm a") : ""
  
  // Format caption/text as: title + body + formatted event date
  const caption = `${post.title}\n\n${post.body}${formattedDate ? `\n\nEvent: ${formattedDate}` : ""}`

  const isMock =
    botToken.startsWith("mock_") ||
    botToken === "123456:ABC-DEF" ||
    !/^\d+:[A-Za-z0-9_-]+$/.test(botToken)

  if (isMock) {
    console.log(`[Telegram Mock Publish] Chat: ${channelId}, Caption: ${caption}, Asset: ${assetUrl}`)
    // Wait slightly to simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 500))
  } else {
    const bot = new Bot(botToken)
    if (assetUrl) {
      // If asset URL is relative (e.g. from local uploads fallback), resolve it to absolute URL
      const resolvedAssetUrl = assetUrl.startsWith("/") 
        ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${assetUrl}`
        : assetUrl

      if (mediaType === "video") {
        await bot.api.sendVideo(channelId, resolvedAssetUrl, { caption })
      } else {
        // Default to photo if mediaType is photo or anything else when media exists
        await bot.api.sendPhoto(channelId, resolvedAssetUrl, { caption })
      }
    } else {
      await bot.api.sendMessage(channelId, caption)
    }
  }

  // Update target on success
  await db
    .update(postTargets)
    .set({
      status: "published",
      published_at: new Date(),
    })
    .where(eq(postTargets.id, targetId))
}
