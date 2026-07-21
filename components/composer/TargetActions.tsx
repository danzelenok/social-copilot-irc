"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cancelTargetScheduleAction, editTelegramPost, hideFromCalendar } from "@/lib/actions/posts"
import { toast } from "sonner"
import { Loader2, XCircle, Edit2, EyeOff, Trash2 } from "lucide-react"

export function CancelTargetButton({ targetId }: { targetId: string }) {
  const [loading, setLoading] = useState(false)

  const handleCancel = async () => {
    setLoading(true)
    try {
      const res = await cancelTargetScheduleAction(targetId)
      if (res.success) {
        toast.success("Schedule cancelled successfully.")
      } else {
        toast.error(res.error || "Failed to cancel schedule.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while cancelling schedule.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCancel}
      disabled={loading}
      className="cursor-pointer text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 py-1 h-7 font-medium rounded-md flex items-center gap-1 select-none"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      Cancel
    </Button>
  )
}

export function EditTelegramDialog({
  targetId,
  platformMessageId,
  initialTitle,
  initialBody,
  initialMediaUrl,
}: {
  targetId: string
  platformMessageId?: string | null
  initialTitle: string
  initialBody: string
  initialMediaUrl?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [mediaUrl, setMediaUrl] = useState(initialMediaUrl || "")

  const isDisabled = !platformMessageId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body text are required.")
      return
    }

    setLoading(true)
    try {
      const res = await editTelegramPost(targetId, {
        title: title.trim(),
        body: body.trim(),
        mediaUrl: mediaUrl.trim() || null,
      })

      if (res.success) {
        toast.success("Telegram message edited successfully.")
        setOpen(false)
      } else {
        toast.error(res.error || "Failed to edit Telegram message.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while editing Telegram message.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={isDisabled}
            title={isDisabled ? "Platform message ID is missing" : undefined}
            className="cursor-pointer text-xs py-1 h-7 font-medium rounded-md flex items-center gap-1.5"
          >
            <Edit2 className="h-3 w-3" />
            Edit
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Telegram Post</DialogTitle>
          <DialogDescription>
            Update the title, content, or media for this published Telegram channel post.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Event Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Body Text</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Post Content"
              rows={4}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Media Attachment URL (Optional)</label>
            <Input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RemoveFromCalendarDialog({ targetId }: { targetId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await hideFromCalendar(targetId)
      if (res.success) {
        toast.success("Post target removed from calendar.")
        setOpen(false)
      } else {
        toast.error(res.error || "Failed to remove post from calendar.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while removing post from calendar.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 py-1 h-7 font-medium rounded-md flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Remove from calendar
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Remove from calendar</DialogTitle>
          <DialogDescription className="text-foreground/90 font-medium py-2">
            This post will remain published on Instagram. This action only removes it from your Social Copilot calendar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Remove from calendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TargetActionCell({
  target,
  post,
}: {
  target: {
    id: string
    status: string
    platform_message_id?: string | null
    hidden_from_calendar?: boolean | null
    account: {
      platform_type: string
    }
  }
  post: {
    title: string
    body: string
    media_url?: string | null
  }
}) {
  if (target.status === "scheduled") {
    return <CancelTargetButton targetId={target.id} />
  }

  if (target.status === "published") {
    if (target.account.platform_type === "telegram") {
      return (
        <EditTelegramDialog
          targetId={target.id}
          platformMessageId={target.platform_message_id}
          initialTitle={post.title}
          initialBody={post.body}
          initialMediaUrl={post.media_url}
        />
      )
    }

    if (target.account.platform_type === "instagram") {
      if (target.hidden_from_calendar) {
        return (
          <span className="text-xs text-muted-foreground italic flex items-center justify-end gap-1 select-none">
            <EyeOff className="h-3 w-3" />
            Hidden from calendar
          </span>
        )
      }
      return <RemoveFromCalendarDialog targetId={target.id} />
    }
  }

  return <span className="text-xs text-muted-foreground select-none">—</span>
}
