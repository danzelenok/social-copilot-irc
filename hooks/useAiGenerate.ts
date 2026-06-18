import { useState } from "react"
import { toast } from "sonner"

export function useAiGenerate() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async (
    description: string,
    platform: "telegram" | "instagram" | "both"
  ): Promise<{ title: string; body: string } | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/generate-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description, platform }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "Failed to generate AI content."
        try {
          const parsed = JSON.parse(errorText)
          errorMessage = parsed.error || errorMessage
        } catch {
          if (errorText) {
            errorMessage = errorText
          }
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data as { title: string; body: string }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during generation."
      setError(msg)
      toast.error(`AI Generation failed: ${msg}`)
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    generate,
    loading,
    error,
  }
}
