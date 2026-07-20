"use client"

import React from "react"
import { useBranch } from "@/lib/context/BranchContext"
import { Branch } from "@/lib/db/schema"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2 } from "lucide-react"

interface BranchSelectorProps {
  branches: Branch[]
}

export default function BranchSelector({ branches }: BranchSelectorProps) {
  const { selectedBranchId, setSelectedBranchId } = useBranch()

  // Use "all" as a placeholder string value for the select's "All Branches" option
  const currentValue = selectedBranchId || "all"

  const handleValueChange = (val: string | null) => {
    if (!val || val === "all") {
      setSelectedBranchId(null)
    } else {
      setSelectedBranchId(val)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4.5 w-4.5 text-muted-foreground/80 shrink-0" />
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[180px] bg-background/50 backdrop-blur-xs hover:bg-transparent hover:border-accent cursor-pointer shadow-xs border-border transition-all text-xs sm:text-sm font-medium">
          <SelectValue placeholder="Select Branch" />
        </SelectTrigger>
        <SelectContent className="min-w-[180px]">
          <SelectItem value="all" className="cursor-pointer">
            <span>🌐 All Branches</span>
          </SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id} className="cursor-pointer">
              <span>🏢 {branch.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
