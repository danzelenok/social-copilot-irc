import React from "react"
import { Clock, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: "pending" | "processing" | "published" | "failed"
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className={`bg-zinc-100/50 text-zinc-600 border-zinc-200 dark:bg-zinc-950/20 dark:text-zinc-400 dark:border-zinc-800 ${className}`}
        >
          <Clock className="h-3 w-3 mr-1 shrink-0" />
          Pending
        </Badge>
      )
    case "processing":
      return (
        <Badge
          variant="secondary"
          className={`bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 animate-pulse ${className}`}
        >
          <RefreshCw className="h-3 w-3 mr-1 animate-spin shrink-0" />
          Processing
        </Badge>
      )
    case "published":
      return (
        <Badge
          className={`bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 ${className}`}
        >
          <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
          Published
        </Badge>
      )
    case "failed":
      return (
        <Badge
          variant="destructive"
          className={`bg-rose-100/50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30 ${className}`}
        >
          <AlertCircle className="h-3 w-3 mr-1 shrink-0" />
          Failed
        </Badge>
      )
    default:
      return null
  }
}
