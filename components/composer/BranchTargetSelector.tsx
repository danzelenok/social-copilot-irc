"use client"

import React, { useMemo } from "react"
import { BranchWithAccounts } from "@/lib/actions/branches"
import { Badge } from "@/components/ui/badge"
import { PLATFORM_CONFIG, PlatformType } from "@/components/account/PlatformBadge"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Globe, Check, CornerDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface BranchTargetSelectorProps {
  branches: BranchWithAccounts[]
  selectedTargets: Record<string, string[]>
  onChange: (selectedTargets: Record<string, string[]>) => void
  disabled?: boolean
  allowedPlatform?: "instagram" | "telegram" | null
}

export default function BranchTargetSelector({
  branches,
  selectedTargets,
  onChange,
  disabled = false,
  allowedPlatform = null,
}: BranchTargetSelectorProps) {
  // Extract all active accounts across all branches (matching allowedPlatform filter if provided)
  const allActiveAccounts = useMemo(() => {
    return branches.flatMap((b) =>
      (b.accounts || []).filter(
        (a) => a.is_active && (!allowedPlatform || a.platform_type === allowedPlatform)
      )
    )
  }, [branches, allowedPlatform])

  const totalActiveCount = allActiveAccounts.length

  // Flatten currently selected account IDs for easy checks
  const selectedAccountIds = useMemo(() => {
    return Object.values(selectedTargets).flat()
  }, [selectedTargets])

  const selectedCount = selectedAccountIds.length

  // Check if all active accounts across all branches are selected
  const isAllSelected = totalActiveCount > 0 && selectedCount === totalActiveCount

  // Check if some (but not all) active accounts across all branches are selected
  const isAllPartiallySelected = selectedCount > 0 && selectedCount < totalActiveCount

  // Handle clicking global "All Branches" button
  const handleToggleAll = () => {
    if (disabled) return

    if (isAllSelected) {
      // Deselect all
      onChange({})
    } else {
      // Select all active accounts
      const nextTargets: Record<string, string[]> = {}
      branches.forEach((b) => {
        const active = (b.accounts || []).filter((a) => a.is_active).map((a) => a.id)
        if (active.length > 0) {
          nextTargets[b.id] = active
        }
      })
      onChange(nextTargets)
    }
  }

  // Handle clicking a specific platform account checkbox inside a branch
  const handleToggleAccount = (branchId: string, accountId: string) => {
    if (disabled) return

    const current = selectedTargets[branchId] || []
    let next: string[]
    if (current.includes(accountId)) {
      next = current.filter((id) => id !== accountId)
    } else {
      next = [...current, accountId]
    }

    const nextTargets = { ...selectedTargets }
    if (next.length === 0) {
      delete nextTargets[branchId]
    } else {
      nextTargets[branchId] = next
    }
    onChange(nextTargets)
  }

  // Handle toggling all platforms for a single branch
  const handleToggleBranchAll = (branchId: string, activeBranchAccountIds: string[]) => {
    if (disabled) return

    const current = selectedTargets[branchId] || []
    const isBranchFullySelected = current.length === activeBranchAccountIds.length

    const nextTargets = { ...selectedTargets }
    if (isBranchFullySelected) {
      delete nextTargets[branchId]
    } else {
      nextTargets[branchId] = activeBranchAccountIds
    }
    onChange(nextTargets)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Target Branches & Platforms
        </label>
        <Badge
          variant={selectedCount > 0 ? "default" : "secondary"}
          className={cn(
            "h-5 px-2 text-xs transition-all duration-300 font-semibold",
            selectedCount > 0
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : ""
          )}
        >
          {selectedCount} {selectedCount === 1 ? "platform account" : "platform accounts"} selected
        </Badge>
      </div>

      <div className="space-y-3">
        {/* Global Select All Branches Button */}
        {totalActiveCount > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleToggleAll}
            className={cn(
              "cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 select-none shadow-xs disabled:cursor-not-allowed disabled:opacity-50",
              isAllSelected
                ? "bg-primary text-primary-foreground border-primary"
                : isAllPartiallySelected
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
            )}
          >
            <Globe className="h-3.5 w-3.5 shrink-0" />
            All Branches
            <span
              className={cn(
                "ml-1 px-1.5 py-0.2 rounded-full text-[10px]",
                isAllSelected
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted-foreground/10 text-muted-foreground"
              )}
            >
              {totalActiveCount}
            </span>
          </button>
        )}

        {/* Branch Cards Stack */}
        <div className="space-y-2.5">
          {branches.map((branch) => {
            const activeAccounts = (branch.accounts || []).filter(
              (a) => a.is_active && (!allowedPlatform || a.platform_type === allowedPlatform)
            )
            const hasActiveAccounts = activeAccounts.length > 0
            if (!hasActiveAccounts) return null

            const activeBranchAccountIds = activeAccounts.map((a) => a.id)
            const branchSelected = selectedTargets[branch.id] || []
            const isFullySelected = branchSelected.length === activeBranchAccountIds.length
            const isPartiallySelected =
              !isFullySelected && branchSelected.length > 0

            return (
              <Collapsible
                key={branch.id}
                className="group/branch border border-border/70 rounded-lg overflow-hidden bg-background shadow-2xs transition-colors duration-200"
              >
                {/* Branch Header */}
                <div className="flex items-center justify-between p-3 bg-muted/10 hover:bg-muted/20 transition-colors">
                  <CollapsibleTrigger className="flex-1 flex items-center gap-2 text-left cursor-pointer focus:outline-none select-none">
                    <div className="text-muted-foreground group-data-open/branch:rotate-180 transition-transform duration-200">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-foreground text-sm">
                      {branch.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.2 rounded-full",
                        isFullySelected
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : isPartiallySelected
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {branchSelected.length} / {activeAccounts.length}
                    </span>
                  </CollapsibleTrigger>

                  {/* Branch Level Select All Checkbox/Toggle */}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleToggleBranchAll(branch.id, activeBranchAccountIds)}
                    className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all border disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
                      isFullySelected
                        ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {isFullySelected ? "Deselect All" : "Select Branch"}
                  </button>
                </div>

                {/* Collapsible Content: platforms checkboxes */}
                <CollapsibleContent className="border-t border-border/40 p-3 bg-muted/5 space-y-2">
                  <div className="flex flex-col gap-2">
                    {activeAccounts.map((account) => {
                      const isChecked = branchSelected.includes(account.id)
                      const config = PLATFORM_CONFIG[account.platform_type as PlatformType]
                      const PlatformIcon = config?.icon

                      return (
                        <div
                          key={account.id}
                          className="flex items-center gap-3 py-1 px-1.5 rounded-md hover:bg-muted/10 transition-colors"
                        >
                          <Checkbox
                            id={account.id}
                            checked={isChecked}
                            disabled={disabled}
                            onCheckedChange={() => handleToggleAccount(branch.id, account.id)}
                            className="h-4 w-4"
                          />
                          <CornerDownRight className="h-3 w-3 text-muted-foreground/45 shrink-0" />
                          <label
                            htmlFor={account.id}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer text-xs font-medium select-none flex-1 py-0.5",
                              isChecked ? "text-foreground" : "text-muted-foreground",
                              disabled && "cursor-not-allowed"
                            )}
                          >
                            {PlatformIcon && (
                              <PlatformIcon
                                className={cn(
                                  "h-3.5 w-3.5",
                                  isChecked
                                    ? config.bg.split(" ").pop()
                                    : "text-muted-foreground/60"
                                )}
                              />
                            )}
                            <span className="capitalize">{account.platform_type}</span>
                            <span className="text-muted-foreground/60 font-normal">
                              — {account.handle || "Account"}
                            </span>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </div>

      {allActiveAccounts.length === 0 && (
        <p className="text-xs text-amber-500 font-medium italic">
          No active accounts found. Please connect or activate accounts in settings to start composer.
        </p>
      )}
    </div>
  )
}
