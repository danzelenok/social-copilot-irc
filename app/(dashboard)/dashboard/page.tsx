"use client"

import React, { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { useBranch } from "@/lib/context/BranchContext"
import { getScheduledTargetsAction } from "@/lib/actions/posts"
import { CancelTargetButton } from "@/components/composer/TargetActions"
import { TelegramIcon, InstagramIcon } from "@/components/account/PlatformBadge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { format } from "date-fns"
import { LayoutDashboard, ArrowUpRight, Users, MessageSquare, Eye, Clock, Edit2, Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { selectedBranchId } = useBranch()
  const [scheduledTargets, setScheduledTargets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchScheduled = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getScheduledTargetsAction(selectedBranchId)
      setScheduledTargets(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedBranchId])

  useEffect(() => {
    fetchScheduled()
  }, [fetchScheduled])

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      
      {/* Branch State Display Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg text-foreground">Active Filter State</h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
            Branch Context
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Selected Branch ID:{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-xs">
            {selectedBranchId || "null (🌐 All Branches)"}
          </code>
        </p>
      </div>

      {/* Premium Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Stat Card 1 */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Estimated Reach</p>
            <Users className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight">45.2K</span>
            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-0.5">
              +8.2% <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
        
        {/* Stat Card 2 */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Composer Drafts</p>
            <MessageSquare className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight">12</span>
            <span className="text-xs text-muted-foreground">Pending publishing</span>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Analytics Views</p>
            <Eye className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight">128.4K</span>
            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-0.5">
              +14.5% <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Scheduled Publications List */}
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur-md p-6 shadow-xs space-y-4">
        <div className="pb-3 border-b border-border/60">
          <h2 className="font-semibold text-base text-foreground tracking-tight flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-primary" />
            Scheduled Publications ({scheduledTargets.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pending posts scheduled to go live across your branches.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading scheduled posts...
          </div>
        ) : scheduledTargets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border/60 rounded-lg">
            No scheduled publications found for this selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Campaign</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Schedule Time (Local)</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledTargets.map((st) => (
                  <TableRow key={st.targetId} className="hover:bg-muted/10 border-b border-border/40 last:border-0">
                    <TableCell className="pl-4 font-semibold text-foreground py-3.5">
                      <Link href={`/composer/${st.postId}`} className="hover:underline">
                        {st.postTitle}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-foreground font-semibold">
                      {st.branch.name}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {st.account.platformType === "telegram" ? (
                          <TelegramIcon className="h-4 w-4 text-sky-500 fill-sky-500/10" />
                        ) : (
                          <InstagramIcon className="h-4 w-4 text-pink-500" />
                        )}
                        <span>{st.account.handle}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-muted-foreground">
                      {st.eventAt && st.branch.timezone ? (
                        <span className="font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          {format(new Date(st.eventAt), "MMM d, yyyy 'at' h:mm a")} ({st.branch.timezone})
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 pr-4">
                      <div className="flex items-center justify-end gap-2.5">
                        <Link
                          href={`/composer/${st.postId}/edit`}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Link>
                        <CancelTargetButton targetId={st.targetId} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
