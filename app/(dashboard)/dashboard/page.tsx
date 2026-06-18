"use client"

import React from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { useBranch } from "@/lib/context/BranchContext"
import { LayoutDashboard, ArrowUpRight, Users, MessageSquare, Eye } from "lucide-react"

export default function DashboardPage() {
  const { selectedBranchId } = useBranch()

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
    </div>
  )
}
