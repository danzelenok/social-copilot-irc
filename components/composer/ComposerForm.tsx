"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { BranchWithAccounts } from "@/lib/actions/branches"
import {
  createDraftPost,
  approveAndPublish,
  createAndSchedulePost,
  updateAndReschedulePost,
  updateAndPublishPost,
} from "@/lib/actions/posts"
import { toast } from "sonner"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, PenSquare, Send, Clock } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import BranchTargetSelector from "./BranchTargetSelector"
import AddressField from "./AddressField"
import PostPreview from "./PostPreview"
import MediaUploadField, { MediaType } from "./MediaUploadField"
import AiGenerateButton from "./AiGenerateButton"
import { cn } from "@/lib/utils"
import { getCurrentTimeInTimezone, utcToLocalParts } from "@/lib/utils/timezones"

interface ComposerFormProps {
  branches: BranchWithAccounts[]
  initialPost?: {
    id: string
    title: string
    body: string
    media_url: string | null
    media_type: "photo" | "video" | null
    post_type?: "post" | "story" | null
  }
  initialTargets?: {
    account_id: string
    address: string | null
    branch_id: string
    event_at: Date | string | null
  }[]
}

export default function ComposerForm({
  branches,
  initialPost,
  initialTargets,
}: ComposerFormProps) {
  const router = useRouter()
  // Form Fields State
  const [postType, setPostType] = useState<"post" | "story">(
    (initialPost?.post_type as "post" | "story") || "post"
  )
  const [title, setTitle] = useState(initialPost?.title || "")
  const [body, setBody] = useState(initialPost?.body || "")

  const [selectedTargets, setSelectedTargets] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {}
    if (initialTargets) {
      initialTargets.forEach((t) => {
        if (!map[t.branch_id]) {
          map[t.branch_id] = []
        }
        map[t.branch_id].push(t.account_id)
      })
    }
    return map
  })

  const [addressByBranch, setAddressByBranch] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {}
    if (initialTargets) {
      initialTargets.forEach((t) => {
        map[t.branch_id] = t.address
      })
    }
    return map
  })

  // Date and Time selectors per-branch
  const [selectedDates, setSelectedDates] = useState<Record<string, Date | undefined>>(() => {
    const map: Record<string, Date | undefined> = {}
    if (initialTargets && branches) {
      initialTargets.forEach((t) => {
        if (t.event_at) {
          const branch = branches.find((b) => b.id === t.branch_id)
          if (branch && branch.timezone) {
            const { date } = utcToLocalParts(new Date(t.event_at), branch.timezone)
            map[t.branch_id] = date
          }
        }
      })
    }
    return map
  })

  const [selectedTimes, setSelectedTimes] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    if (initialTargets && branches) {
      initialTargets.forEach((t) => {
        if (t.event_at) {
          const branch = branches.find((b) => b.id === t.branch_id)
          if (branch && branch.timezone) {
            const { time } = utcToLocalParts(new Date(t.event_at), branch.timezone)
            map[t.branch_id] = time
          }
        }
      })
    }
    return map
  })

  const [mediaUrl, setMediaUrl] = useState<string | null>(initialPost?.media_url || null)
  const [mediaType, setMediaType] = useState<MediaType>(initialPost?.media_type || "photo")

  // Branches that currently have at least one selected account — one configuration card per branch
  const selectedBranches = useMemo(() => {
    return branches.filter((b) => (selectedTargets[b.id] || []).length > 0)
  }, [branches, selectedTargets])

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

  // Get preview event date (from first branch)
  const previewEventAt = useMemo(() => {
    const firstBranchId = selectedBranches[0]?.id
    if (!firstBranchId) return null
    const bDate = selectedDates[firstBranchId]
    const bTime = selectedTimes[firstBranchId]
    if (!bDate) return null
    
    const base = new Date(bDate)
    if (bTime) {
      const [hours, minutes] = bTime.split(":").map(Number)
      base.setHours(hours || 0)
      base.setMinutes(minutes || 0)
    }
    return base
  }, [selectedBranches, selectedDates, selectedTimes])

  // Scheduling validation logic (all selected branches must have timezones and scheduling fields filled)
  const schedulingState = useMemo(() => {
    if (selectedBranches.length === 0) {
      return { isValid: false, reason: "Please select at least one branch/account to target." }
    }

    for (const b of selectedBranches) {
      if (!b.timezone) {
        return {
          isValid: false,
          reason: `Branch "${b.name}" has no timezone configured. Go to Branch Settings to set it before scheduling.`,
        }
      }
      if (!selectedDates[b.id] || !selectedTimes[b.id]) {
        return {
          isValid: false,
          reason: `Specify a date and time for all selected branches or deselect branches without schedules.`,
        }
      }
    }

    return { isValid: true }
  }, [selectedBranches, selectedDates, selectedTimes])

  // Disable form inputs during publishing
  const isFormDisabled = isGenerating || isPublishing

  // Immediate Publish Campaign Action
  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error("Please enter an Event Title.")
      return
    }
    if (postType !== "story" && !body.trim()) {
      toast.error("Please enter the Post Body.")
      return
    }
    if (targetAccountIds.length === 0) {
      toast.error("Please select at least one branch/account to target.")
      return
    }

    // Flatten selected targets
    const targets = Object.entries(selectedTargets).flatMap(([branchId, accountIds]) =>
      accountIds.map((accountId) => ({
        accountId,
        address: addressByBranch[branchId] ?? null,
      }))
    )

    setIsPublishing(true)
    try {
      if (initialPost) {
        // Edit mode (Cancel old runs and publish immediately)
        const res = await updateAndPublishPost(initialPost.id, {
          title,
          body,
          mediaUrl,
          mediaType,
          postType,
          targets,
        })

        if (res.success) {
          toast.success("Campaign updated and published successfully!")
          handleFullReset()
          router.push(`/composer/${initialPost.id}`)
        } else {
          toast.error(res.error || "Failed to publish campaign.")
        }
      } else {
        // Create mode
        const draftResult = await createDraftPost({
          title,
          body,
          targets,
          mediaUrl,
          mediaType,
          postType,
        })

        if (!draftResult.success || !draftResult.post) {
          toast.error(draftResult.error || "Failed to create post draft.")
          setIsPublishing(false)
          return
        }

        const publishResult = await approveAndPublish(draftResult.post.id)
        if (publishResult.success) {
          toast.success("Campaign published successfully and queued!")
          handleFullReset()
          router.push(`/composer/${draftResult.post.id}`)
        } else {
          toast.error(publishResult.error || "Failed to publish campaign.")
        }
      }
    } catch (err) {
      console.error("Publish error:", err)
      toast.error("An error occurred during publication. Please try again.")
    } finally {
      setIsPublishing(false)
    }
  }

  // Schedule Campaign Action
  const handleSchedule = async () => {
    if (!schedulingState.isValid) return

    // Flatten targets to match the scheduled schema
    const targets = Object.entries(selectedTargets).flatMap(([branchId, accountIds]) => {
      const branch = branches.find((b) => b.id === branchId)!
      const bDate = selectedDates[branchId]!
      const bTime = selectedTimes[branchId]!
      const formattedDate = format(bDate, "yyyy-MM-dd")

      return accountIds.map((accountId) => ({
        accountId,
        address: addressByBranch[branchId] ?? null,
        dateStr: formattedDate,
        timeStr: bTime,
        timezone: branch.timezone!,
        branchName: branch.name,
      }))
    })

    setIsPublishing(true)
    try {
      let res
      if (initialPost) {
        // Edit mode (Cancel old schedules and reschedule)
        res = await updateAndReschedulePost(initialPost.id, {
          title,
          body,
          mediaUrl,
          mediaType,
          postType,
          targets,
        })
      } else {
        // Create mode
        res = await createAndSchedulePost({
          title,
          body,
          mediaUrl,
          mediaType,
          postType,
          targets,
        })
      }

      if (res.success) {
        toast.success(initialPost ? "Campaign rescheduled successfully!" : "Campaign scheduled successfully!")
        handleFullReset()
        if (initialPost) {
          router.push(`/composer/${initialPost.id}`)
        } else {
          const createdPost = (res as { success: true; post: { id: string } }).post
          router.push(`/composer/${createdPost.id}`)
        }
      } else {
        toast.error((res as any).error || "Failed to schedule campaign.")
      }
    } catch (err) {
      console.error("Schedule error:", err)
      toast.error("An error occurred during scheduling. Please try again.")
    } finally {
      setIsPublishing(false)
    }
  }

  // Full reset (e.g. after successful publish/schedule)
  const handleFullReset = () => {
    setPostType("post")
    setTitle("")
    setBody("")
    setSelectedTargets({})
    setAddressByBranch({})
    setSelectedDates({})
    setSelectedTimes({})
    setMediaUrl(null)
    setMediaType("photo")
    setIsGenerating(false)
    setIsPublishing(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Form Area: 7 Columns */}
      <div className="lg:col-span-7 space-y-6 bg-card/40 border border-border/80 p-6 rounded-xl shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <PenSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground tracking-tight">
                {initialPost ? "Edit Campaign" : "Create Campaign"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {initialPost ? "Modify details and rescheduling rules." : "Configure details, schedules, and targets for your campaign."}
              </p>
            </div>
          </div>

          {/* Post / Story Mode Switcher */}
          <div className="flex items-center p-1 bg-muted/60 rounded-lg border border-border/40 shrink-0">
            <button
              type="button"
              disabled={isFormDisabled}
              onClick={() => setPostType("post")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer select-none",
                postType === "post"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Post
            </button>
            <button
              type="button"
              disabled={isFormDisabled}
              onClick={() => {
                setPostType("story")
                // When switching to story mode, strip any Telegram targets
                setSelectedTargets((prev) => {
                  const updated: Record<string, string[]> = {}
                  branches.forEach((b) => {
                    const currentSelected = prev[b.id] || []
                    const instagramAccounts = (b.accounts || [])
                      .filter((a) => a.is_active && a.platform_type === "instagram")
                      .map((a) => a.id)
                    const filtered = currentSelected.filter((id) => instagramAccounts.includes(id))
                    if (filtered.length > 0) {
                      updated[b.id] = filtered
                    }
                  })
                  return updated
                })
              }}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer select-none",
                postType === "story"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Story
            </button>
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

          {/* Body Text — Hidden in Story mode */}
          {postType !== "story" && (
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
          )}

          {/* Media Upload Zone */}
          <div className="space-y-1">
            <MediaUploadField
              mediaUrl={mediaUrl}
              onChangeMediaUrl={setMediaUrl}
              mediaType={mediaType}
              onChangeMediaType={setMediaType}
              disabled={isFormDisabled}
            />
            {postType === "story" && (
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 pt-1">
                <span className="text-pink-500 font-bold">✨</span> Stories support images (1080×1920) and videos up to 60 seconds
              </p>
            )}
          </div>

          {/* Target branches (multi-select collapsible cards) */}
          <div className="pt-2 border-t border-border/40">
            <BranchTargetSelector
              branches={branches}
              selectedTargets={selectedTargets}
              onChange={setSelectedTargets}
              disabled={isFormDisabled}
              allowedPlatform={postType === "story" ? "instagram" : null}
            />
          </div>

          {/* Per-branch address & schedule inputs */}
          {selectedBranches.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border/40">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Branch Details
              </h3>
              <div className="space-y-4">
                {selectedBranches.map((branch) => {
                  const hasTimezone = !!branch.timezone
                  const localTimeStr = hasTimezone ? getCurrentTimeInTimezone(branch.timezone!) : ""
                  const bDate = selectedDates[branch.id]
                  const bTime = selectedTimes[branch.id] || ""

                  return (
                    <div
                      key={branch.id}
                      className="p-4 rounded-xl border border-border/60 bg-card/20 backdrop-blur-md space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">
                          {branch.name}
                        </span>
                        {hasTimezone ? (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium select-none">
                            <Clock className="h-3 w-3" />
                            Local time: {localTimeStr}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1 animate-pulse select-none">
                            ⚠️ Timezone missing (Scheduling disabled)
                          </span>
                        )}
                      </div>

                      {/* Address Field */}
                      <AddressField
                        branch={branch}
                        onChange={(address) =>
                          setAddressByBranch((prev) => ({ ...prev, [branch.id]: address }))
                        }
                        disabled={isFormDisabled}
                      />

                      {/* Date & Time Scheduling for this Branch */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Schedule Date
                          </label>
                          <Popover>
                            <PopoverTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isFormDisabled || !hasTimezone}
                                  className={cn(
                                    "w-full h-8.5 cursor-pointer justify-start text-left font-normal bg-background/50 border-input text-xs",
                                    !bDate && "text-muted-foreground"
                                  )}
                                />
                              }
                            >
                              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              {bDate ? format(bDate, "PPP") : <span>Pick date</span>}
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={bDate}
                                onSelect={(d) => {
                                  setSelectedDates((prev) => ({ ...prev, [branch.id]: d }))
                                }}
                                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Schedule Time
                          </label>
                          <Input
                            type="time"
                            value={bTime}
                            onChange={(e) => {
                              setSelectedTimes((prev) => ({ ...prev, [branch.id]: e.target.value }))
                            }}
                            disabled={isFormDisabled || !hasTimezone || !bDate}
                            className="bg-background/50 h-8.5 text-xs cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || targetAccountIds.length === 0}
            className={cn(
              "flex-1 h-10 cursor-pointer font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all select-none border-0",
              targetAccountIds.length === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-foreground text-primary hover:bg-foreground/90"
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
                {initialPost ? "Publish Now" : "Publish Campaign"}
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleSchedule}
            disabled={isPublishing || !schedulingState.isValid}
            className={cn(
              "flex-1 h-10 cursor-pointer font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all select-none border-0",
              !schedulingState.isValid
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-foreground text-primary hover:bg-foreground/90"
            )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Scheduling...
              </>
            ) : (
              <>
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {initialPost ? "Reschedule" : "Schedule Campaign"}
              </>
            )}
          </Button>
        </div>

        {/* Validation Warning Message */}
        {selectedBranches.length > 0 && !schedulingState.isValid && (
          <p className="text-[11px] text-amber-500 text-center font-medium mt-1 animate-in fade-in duration-200">
            {schedulingState.reason}
          </p>
        )}
      </div>

      {/* Preview Area: 5 Columns */}
      <div className="lg:col-span-5 h-full">
        <PostPreview
          title={title}
          body={body}
          eventAt={previewEventAt}
          mediaUrl={mediaUrl}
          mediaType={mediaType}
          postType={postType}
        />
      </div>
    </div>
  )
}

