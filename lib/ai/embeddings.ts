import OpenAI from "openai"

/**
 * Generates a 1536-dimensional vector embedding for the given text using OpenAI text-embedding-3-small.
 * Returns null if OPENAI_API_KEY is not set or is in mock mode (starts with 'mock_').
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.startsWith("mock_") || apiKey.trim() === "") {
    return null // mock mode
  }

  const openai = new OpenAI({ apiKey })
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small", // 1536 dimensions
    input: text,
  })

  return response.data[0]?.embedding || null
}
