import { db } from "@/lib/db"
import { postTargets } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { format } from "date-fns"

export async function publishInstagram(
  targetId: string,
  post: { title: string; body: string; event_at: Date | string | null },
  credentials: { oauthToken?: string; accessToken?: string; instagramUserId?: string; userId?: string },
  assetUrl: string | null,
  mediaType: string | null
) {
  const accessToken = credentials.accessToken || credentials.oauthToken
  const userId = credentials.userId || credentials.instagramUserId

  if (!accessToken || !userId) {
    throw new Error("Instagram configuration requires accessToken/oauthToken and userId/instagramUserId.")
  }

  // Format caption
  const eventDate = post.event_at ? new Date(post.event_at) : null
  const formattedDate = eventDate ? format(eventDate, "EEE, MMM d, yyyy 'at' h:mm a") : ""
  const caption = `${post.title}\n\n${post.body}${formattedDate ? `\n\nEvent: ${formattedDate}` : ""}`

  const isMock = accessToken.startsWith("mock_")

  if (isMock) {
    console.log(`[Instagram Mock Publish] User: ${userId}, Media: ${mediaType}, Asset: ${assetUrl}, Caption: ${caption}`)
    await new Promise((resolve) => setTimeout(resolve, 500))
  } else {
    if (!assetUrl) {
      throw new Error("Instagram requires media")
    }

    // Resolve relative URL to absolute URL since Meta API requires public URL
    const resolvedAssetUrl = assetUrl.startsWith("/") 
      ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${assetUrl}`
      : assetUrl

    // Step 1: Create media container
    // https://graph.instagram.com/v18.0/{userId}/media
    const containerParams: Record<string, string> = {
      caption,
      access_token: accessToken,
    }

    if (mediaType === "video") {
      containerParams.media_type = "REELS"
      containerParams.video_url = resolvedAssetUrl
    } else {
      containerParams.media_type = "IMAGE"
      containerParams.image_url = resolvedAssetUrl
    }

    const createRes = await fetch(`https://graph.instagram.com/v18.0/${userId}/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(containerParams),
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      let parsedErr
      try {
        parsedErr = JSON.parse(errText)
      } catch {}
      const errMsg = parsedErr?.error?.message || errText
      throw new Error(`Failed to create Instagram media container: ${errMsg}`)
    }

    const { id: containerId } = await createRes.json()

    // Step 2: Poll container status until FINISHED
    let finished = false
    for (let pollCount = 0; pollCount < 10; pollCount++) {
      if (pollCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 6000))
      }

      const pollRes = await fetch(
        `https://graph.instagram.com/v18.0/${containerId}?fields=status_code&access_token=${accessToken}`
      )

      if (!pollRes.ok) {
        const errText = await pollRes.text()
        throw new Error(`Failed to check container status: ${errText}`)
      }

      const pollData = await pollRes.json()
      if (pollData.error) {
        throw new Error(`Status check error: ${pollData.error.message}`)
      }

      if (pollData.status_code === "FINISHED") {
        finished = true
        break
      } else if (pollData.status_code === "ERROR") {
        throw new Error(
          `Instagram media container processing failed: ${
            pollData.error_message || "Unknown processing error"
          }`
        )
      }
    }

    if (!finished) {
      throw new Error("Instagram media processing timed out.")
    }

    // Step 3: Publish container
    // POST /{userId}/media_publish
    const publishRes = await fetch(`https://graph.instagram.com/v18.0/${userId}/media_publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    })

    if (!publishRes.ok) {
      const errText = await publishRes.text()
      let parsedErr
      try {
        parsedErr = JSON.parse(errText)
      } catch {}
      const errMsg = parsedErr?.error?.message || errText
      throw new Error(`Failed to publish Instagram media container: ${errMsg}`)
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
