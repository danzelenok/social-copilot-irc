"use client"

import React from "react"
import Link from "next/link"
import { PageHeader } from "@/components/shared/PageHeader"
import { useBranch } from "@/lib/context/BranchContext"
import { Settings, Users } from "lucide-react"

export default function SettingsPage() {
  const { selectedBranchId } = useBranch()

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader title="Settings" />

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-border">
        <Link
          href="/settings"
          className="flex items-center gap-2 border-b-2 border-primary px-4 py-2 text-sm font-semibold text-foreground"
        >
          <Settings className="h-4 w-4" />
          <span>General</span>
        </Link>
        <Link
          href="/settings/team"
          className="flex items-center gap-2 border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Users className="h-4 w-4" />
          <span>Team</span>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-5 w-5 text-emerald-500" />
          <h2 className="font-semibold text-lg text-foreground">Branch Filter Visualizer</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Selected Branch ID:{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-xs">
            {selectedBranchId || "null (🌐 All Branches)"}
          </code>
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <h3 className="font-semibold text-sm text-foreground mb-2">Application Configurations</h3>
        <p className="text-xs text-muted-foreground">
          Manage integrations, connection credentials, theme customization, and other global configurations.
        </p>
      </div>
    </div>
  )
}
