"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { cancelTargetScheduleAction } from "@/lib/actions/posts"
import { toast } from "sonner"
import { Loader2, XCircle } from "lucide-react"

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
