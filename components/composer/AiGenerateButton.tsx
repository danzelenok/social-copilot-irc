"use client"

import React, { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAiGenerate } from "@/hooks/useAiGenerate"

interface AiGenerateButtonProps {
  onGenerate: (title: string, body: string) => void
  disabled?: boolean
  platform: "telegram" | "instagram" | "both"
}

export default function AiGenerateButton({
  onGenerate,
  disabled = false,
  platform,
}: AiGenerateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [description, setDescription] = useState("")
  const { generate, loading } = useAiGenerate()

  const handleGenerate = async () => {
    if (!description.trim()) return

    const result = await generate(description, platform)
    if (result) {
      onGenerate(result.title, result.body)
      setDescription("") // Clear description on success
      setIsOpen(false)  // Close popover
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-7 px-2.5 text-xs font-semibold gap-1 text-violet-600 border-violet-200 bg-violet-50/50 hover:bg-violet-100 dark:text-violet-400 dark:border-violet-900/60 dark:bg-violet-950/20 dark:hover:bg-violet-900/30 shrink-0 cursor-pointer"
          />
        }
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
        <span>Generate with AI</span>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4 space-y-3 bg-popover border border-border rounded-xl shadow-lg"
        align="end"
        sideOffset={8}
      >
        <div className="space-y-1">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-500 fill-violet-500/10" />
            <span>Generate with AI</span>
          </h4>
          <p className="text-xs text-muted-foreground">
            Describe your event in 1-2 sentences. The AI will generate an optimized title and body caption.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="ai-description"
            className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
          >
            Describe your event
          </label>
          <Textarea
            id="ai-description"
            placeholder="Sunday worship service at Downtown Campus, June 15, 10am. Special guest speaker, live music."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[72px] text-xs resize-none bg-background/50"
            disabled={loading}
            required
          />
        </div>

        <Button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !description.trim()}
          className="w-full h-8.5 font-semibold text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1 shrink-0" />
              <span>Generating...</span>
            </>
          ) : (
            <span>Generate Title & Post</span>
          )}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
