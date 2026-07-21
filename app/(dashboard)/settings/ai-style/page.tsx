"use client"

import React, { useState, useEffect } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Sparkles, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import {
  getAiStyleSettings,
  updateAiStyleSettings,
  importInstagramStyleExamples,
} from "@/lib/actions/aiStyleSettings"

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export default function AiStyleSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  const [styleExamplesEnabled, setStyleExamplesEnabled] = useState(true)
  const [useInstagramHistory, setUseInstagramHistory] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getAiStyleSettings()
        if (settings) {
          setStyleExamplesEnabled(settings.style_examples_enabled)
          setUseInstagramHistory(settings.use_instagram_history_for_style)
          setCustomPrompt(settings.custom_prompt || "")
        }
      } catch (err: any) {
        toast.error(`Failed to load AI Style Settings: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateAiStyleSettings({
        style_examples_enabled: styleExamplesEnabled,
        use_instagram_history_for_style: useInstagramHistory,
        custom_prompt: customPrompt,
      })
      toast.success("AI Style Settings saved successfully!")
    } catch (err: any) {
      toast.error(`Failed to save settings: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleImportInstagram = async () => {
    setImporting(true)
    try {
      const res = await importInstagramStyleExamples()
      toast.success(`Successfully imported ${res.importedCount} Instagram style examples!`)
    } catch (err: any) {
      toast.error(`Instagram import failed: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader title="AI Style Settings" />
        <div className="flex items-center justify-center py-16 border border-border bg-card rounded-2xl">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl">
      <PageHeader title="AI Style Settings" />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5 text-ring" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-foreground">Writing Style & RAG Settings</h2>
            <p className="text-xs text-muted-foreground">
              Teach the AI how your church writes posts using past examples and custom instructions.
            </p>
          </div>
        </div>

        {/* Toggle 1: Enable style examples */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
          <div className="space-y-1">
            <label htmlFor="style-examples-toggle" className="text-sm font-semibold text-foreground cursor-pointer select-none">
              Enable style examples
            </label>
            <p className="text-xs text-muted-foreground">
              When enabled, AI uses past posts to match your writing style, tone, and formatting.
            </p>
          </div>
          <Switch
            id="style-examples-toggle"
            checked={styleExamplesEnabled}
            onCheckedChange={(checked) => setStyleExamplesEnabled(checked)}
          />
        </div>

        {/* Toggle 2: Use Instagram post history */}
        <div className="space-y-3 p-4 rounded-xl border border-border/60 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <label htmlFor="instagram-history-toggle" className="text-sm font-semibold text-foreground cursor-pointer select-none flex items-center gap-1.5">
                <InstagramIcon className="h-4 w-4 text-pink-500" />
                <span>Use Instagram post history</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Allow AI to learn from your organization's Instagram post captions.
              </p>
            </div>
            <Switch
              id="instagram-history-toggle"
              checked={useInstagramHistory}
              onCheckedChange={(checked) => setUseInstagramHistory(checked)}
            />
          </div>

          {useInstagramHistory && (
            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Fetch and generate embeddings for your last 25 Instagram posts.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImportInstagram}
                disabled={importing}
                className="gap-1.5 text-xs font-medium cursor-pointer"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <InstagramIcon className="h-3.5 w-3.5 text-pink-500" />
                    <span>Import from Instagram</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Custom Prompt Textarea */}
        <div className="space-y-2">
          <label htmlFor="custom-prompt" className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Custom prompt (optional)
          </label>
          <Textarea
            id="custom-prompt"
            placeholder="e.g. Always write in both English and Russian. Use emojis sparingly. Keep tone warm but professional."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-28 text-sm resize-y bg-background/50"
          />
          <p className="text-[11px] text-muted-foreground">
            Any custom instructions here will be passed directly to the AI for language, tone, or formatting preferences.
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="font-semibold text-xs px-5 gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Settings</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
