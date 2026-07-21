import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import OpenAI from "openai"
import { db } from "@/lib/db"
import { aiStyleSettings } from "@/lib/db/schema"
import { getCurrentOrganization } from "@/lib/auth/org"
import { findSimilarPosts } from "@/lib/ai/styleExamples"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Parse request payload
    const body = await req.json()
    const { description, platform } = body
    const branchIds: string[] = Array.isArray(body.branchIds) ? body.branchIds : []

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "Description is required." },
        { status: 400 }
      )
    }

    if (!platform || !["telegram", "instagram", "both"].includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform. Supported values: 'telegram', 'instagram', 'both'." },
        { status: 400 }
      )
    }

    // 3. Fetch Organization & AI Style Settings
    const org = await getCurrentOrganization()
    let settings = null
    if (org) {
      const [fetchedSettings] = await db
        .select()
        .from(aiStyleSettings)
        .where(eq(aiStyleSettings.organization_id, org.id))
        .limit(1)
      settings = fetchedSettings || null
    }

    // 4. RAG: Search for similar post examples if style examples enabled
    const examples = (org && settings?.style_examples_enabled !== false)
      ? await findSimilarPosts(description, org.id, branchIds)
      : []

    // 5. Check for OpenAI key (Support simulation mode for offline dev)
    const apiKey = process.env.OPENAI_API_KEY
    const isMock = !apiKey || apiKey.startsWith("mock_") || apiKey.trim() === ""

    if (isMock) {
      await new Promise((resolve) => setTimeout(resolve, 800)) // Short delay

      const isRussian = /[а-яА-Я]/.test(description)
      let title = ""
      let generatedBody = ""

      if (isRussian) {
        title = `✨ Событие: ${description.slice(0, 30)}${description.length > 30 ? "..." : ""}`
        if (platform === "instagram") {
          generatedBody = `Присоединяйтесь к нам! 🌟 ${description}. Ждем вас с нетерпением на нашей встрече в это воскресенье!`
        } else if (platform === "telegram") {
          generatedBody = `Дорогие друзья! 📢\n\nРады сообщить вам о замечательном событии: ${description}.\n\nПриходите сами и приглашайте близких. Мы верим, что это будет особенное время благословения и общения!\n\nДо встречи!`
        } else {
          generatedBody = `Дорогие друзья! 🌟\n\nРады пригласить вас на наше мероприятие: ${description}.\n\nЖдем каждого!`
        }
      } else {
        title = `✨ Event: ${description.slice(0, 30)}${description.length > 30 ? "..." : ""}`
        if (platform === "instagram") {
          generatedBody = `Join us! 🌟 ${description}. Looking forward to seeing you at our meeting this Sunday!`
        } else if (platform === "telegram") {
          generatedBody = `Dear friends! 📢\n\nWe are excited to share about our upcoming event: ${description}.\n\nCome and bring your friends and family. It's going to be a wonderful time of fellowship!\n\nSee you there!`
        } else {
          generatedBody = `Dear friends! 🌟\n\nWe'd love to invite you to our event: ${description}.\n\nLooking forward to seeing you!`
        }
      }

      const bodyLimit = platform === "telegram" ? 500 : 300
      if (generatedBody.length > bodyLimit) {
        generatedBody = generatedBody.slice(0, bodyLimit - 3) + "..."
      }
      if (title.length > 60) {
        title = title.slice(0, 57) + "..."
      }

      return NextResponse.json({ title, body: generatedBody })
    }

    // 6. Assemble Dynamic System Prompt
    let systemPrompt = `You are a social media assistant for a church community. Generate a post title and body based on the event description.`

    systemPrompt += `\n\nInstructions:
1. Generate a "title" (up to 60 characters).
2. Generate a "body" (post caption).
3. If platform is "instagram", limit the "body" to 300 characters.
4. If platform is "telegram", limit the "body" to 500 characters.
5. If platform is "both", limit the "body" to 300 characters.
6. Do NOT automatically add hashtags.
7. Reply in the same language as the user's event description.`

    if (examples.length > 0) {
      systemPrompt += `\n\nHere are examples of how this church writes posts. Match their style, tone, and formatting exactly:\n`
      examples.forEach((ex, i) => {
        systemPrompt += `\nExample ${i + 1}:\nTitle: ${ex.title}\nBody: ${ex.body}\n`
      })
    }

    if (settings?.custom_prompt) {
      systemPrompt += `\n\nAdditional instructions from the administrator: ${settings.custom_prompt}`
    }

    systemPrompt += `\n\nReturn JSON strictly with keys "title" (max 60 chars) and "body".`

    const userPrompt = `Platform targets: ${platform}\nEvent description: ${description}`

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error("Received empty response from OpenAI.")
    }

    const parsed = JSON.parse(responseContent)
    let generatedTitle = (parsed.title || "").trim()
    let generatedBody = (parsed.body || "").trim()

    if (generatedTitle.length > 60) {
      generatedTitle = generatedTitle.slice(0, 57) + "..."
    }
    const bodyLimit = platform === "telegram" ? 500 : 300
    if (generatedBody.length > bodyLimit) {
      generatedBody = generatedBody.slice(0, bodyLimit - 3) + "..."
    }

    return NextResponse.json({ title: generatedTitle, body: generatedBody })
  } catch (error: any) {
    console.error("OpenAI generation error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to generate post using AI." },
      { status: 500 }
    )
  }
}
