"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { BranchWithAccounts } from "@/lib/actions/branches"
import { createDraftPost, approveAndPublish } from "@/lib/actions/posts"
import { toast } from "sonner"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, PenSquare, Send } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import BranchTargetSelector from "./BranchTargetSelector"
import PostPreview from "./PostPreview"
import MediaUploadField, { MediaType } from "./MediaUploadField"
import AiGenerateButton from "./AiGenerateButton"
import { cn } from "@/lib/utils"

interface ComposerFormProps {
  branches: BranchWithAccounts[]
}

export default function ComposerForm({ branches }: ComposerFormProps) {
  const router = useRouter()
  // Form Fields State
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("")
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string[]>>({})
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>("photo")

  // Campaign State Machine State
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // Derive flat target account IDs
  const targetAccountIds = useMemo(() => {
    return Object.values(selectedTargets).flat()
  }, [selectedTargets])

  // Derive selected platform type(s) based on targeted accounts for the AI generator
  const selectedPlatform = useMemo((): "telegram" | "instagram" | "both" => {
    const platforms = new Set<string>()
    branches.forEach((b) => {
      const selectedAccountIds = selectedTargets[b.id] || []
      b.accounts?.forEach((acc) => {
        if (selectedAccountIds.includes(acc.id)) {
          if (acc.platform_type === "telegram" || acc.platform_type === "instagram") {
            platforms.add(acc.platform_type)
          }
        }
      })
    })

    if (platforms.size === 1) {
      return platforms.has("telegram") ? "telegram" : "instagram"
    }
    return "both" // Defaults to "both" if none or both are selected
  }, [branches, selectedTargets])

  // Memoized derived target Date
  const combinedDateTime = useMemo(() => {
    if (!date) return null
    const base = new Date(date)
    if (time) {
      const [hours, minutes] = time.split(":").map(Number)
      base.setHours(hours || 0)
      base.setMinutes(minutes || 0)
    } else {
      base.setHours(12)
      base.setMinutes(0)
    }
    base.setSeconds(0)
    base.setMilliseconds(0)
    return base
  }, [date, time])

  // Disable form inputs during/after generation
  const isFormDisabled = isGenerating || isPublishing

  // Publish / Enqueue Campaign
  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error("Please enter an Event Title.")
      return
    }
    if (!body.trim()) {
      toast.error("Please enter the Post Body.")
      return
    }
    if (!date) {
      toast.error("Please select an Event Date.")
      return
    }
    if (!time) {
      toast.error("Please set an Event Time.")
      return
    }
    if (targetAccountIds.length === 0) {
      toast.error("Please select at least one branch/account to target.")
      return
    }
    if (!combinedDateTime) {
      toast.error("Invalid date or time selected.")
      return
    }

    setIsPublishing(true)
    try {
      // 1. Create the post in 'draft' status
      const draftResult = await createDraftPost({
        title,
        body,
        eventAt: combinedDateTime,
        targetAccountIds,
        mediaUrl,
        mediaType,
      })

      if (!draftResult.success || !draftResult.post) {
        toast.error(draftResult.error || "Failed to create post draft.")
        setIsPublishing(false)
        return
      }

      // 2. Immediately call approveAndPublish
      const publishResult = await approveAndPublish(draftResult.post.id)
      if (publishResult.success) {
        toast.success("Campaign published successfully and queued!")
        handleFullReset()
        router.push(`/composer/${draftResult.post.id}`)
      } else {
        toast.error(publishResult.error || "Failed to publish campaign.")
      }
    } catch (err) {
      console.error("Publish error:", err)
      toast.error("An error occurred during publication. Please try again.")
    } finally {
      setIsPublishing(false)
    }
  }

  // Full reset (e.g. after successful publish)
  const handleFullReset = () => {
    setTitle("")
    setBody("")
    setDate(undefined)
    setTime("")
    setSelectedTargets({})
    setMediaUrl(null)
    setMediaType("photo")
    setIsGenerating(false)
    setIsPublishing(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Form Area: 7 Columns */}
      <div className="lg:col-span-7 space-y-6 bg-card/40 border border-border/80 p-6 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 mb-2 pb-4 border-b border-border/60">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <PenSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground tracking-tight">
              Create Post Campaign
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure details, schedules, and targets for your post.
            </p>
          </div>
        </div>

        <div className="space-y-4.5">
          {/* Title input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="title" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Event Title
              </label>
              <AiGenerateButton
                onGenerate={(generatedTitle, generatedBody) => {
                  setTitle(generatedTitle)
                  setBody(generatedBody)
                }}
                disabled={isFormDisabled}
                platform={selectedPlatform}
              />
            </div>
            <Input
              id="title"
              placeholder="e.g. Youth Camp Kickoff Event"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isFormDisabled}
              className="bg-background/50 h-9.5 text-sm"
              required
            />
          </div>

          {/* Body Text */}
          <div className="space-y-1.5">
            <label htmlFor="body" className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Body Text
            </label>
            <Textarea
              id="body"
              placeholder="Write the message caption or content for the branches..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isFormDisabled}
              className="bg-background/50 min-h-32 text-sm leading-relaxed"
              required
            />
          </div>

          {/* Event Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Calendar popover */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Event Date
              </label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isFormDisabled}
                      className={cn(
                        "w-full h-9.5 cursor-pointer justify-start text-left font-normal bg-background/50 border-input text-sm",
                        !date && "text-muted-foreground"
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d)
                      setIsCalendarOpen(false)
                    }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time input */}
            <div className="space-y-1.5">
              <label htmlFor="time" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Event Time
              </label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isFormDisabled}
                className="bg-background/50 h-9.5 text-sm cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Media Upload Zone */}
          <MediaUploadField
            mediaUrl={mediaUrl}
            onChangeMediaUrl={setMediaUrl}
            mediaType={mediaType}
            onChangeMediaType={setMediaType}
            disabled={isFormDisabled}
          />

          {/* Target branches (multi-select collapsible cards) */}
          <div className="pt-2 border-t border-border/40">
            <BranchTargetSelector
              branches={branches}
              selectedTargets={selectedTargets}
              onChange={setSelectedTargets}
              disabled={isFormDisabled}
            />
          </div>
        </div>

        {/* Action Button Workflow */}
        <div className="pt-4 border-t border-border/60">
          <Button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || targetAccountIds.length === 0}
            className={cn(
              "w-full h-10 cursor-pointer font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all select-none border-0 text-white",
              targetAccountIds.length === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500"
            )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 shrink-0" />
                Publish Campaign
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preview Area: 5 Columns */}
      <div className="lg:col-span-5 h-full">
        <PostPreview
          title={title}
          body={body}
          eventAt={combinedDateTime}
          mediaUrl={mediaUrl}
          mediaType={mediaType}
        />
      </div>
    </div>
  )
}
