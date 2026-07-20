"use client"

import React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Branch } from "@/lib/db/schema"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Building2,
  Calendar,
  Edit2,
  Trash2,
  ArrowRight,
} from "lucide-react"
import { PlatformBadge } from "@/components/account/PlatformBadge"

interface BranchCardProps {
  branch: Branch
  accountCount: number
  platforms?: ("telegram" | "instagram" | "framer" | "subsplash")[]
  onEdit: () => void
  onDelete: () => void
}

export default function BranchCard({
  branch,
  accountCount,
  platforms = [],
  onEdit,
  onDelete,
}: BranchCardProps) {
  const formattedDate = format(new Date(branch.created_at), "MMM d, yyyy")

  return (
    <Card className="group/card relative flex flex-col h-full bg-card/40 backdrop-blur-md border border-border/80 hover:border-border hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
      {/* Visual Accent */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary/80 to-ring/50" />

      <CardHeader className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Building2 className="h-5 w-5 text-muted-foreground group-hover/card:scale-105 transition-transform" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground tracking-tight line-clamp-1 group-hover/card:text-primary-foreground dark:group-hover/card:text-foreground transition-colors">
                {branch.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground/80 mt-0.5">
                <Calendar className="h-3 w-3" />
                Created {formattedDate}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="space-y-3">
          {/* Connected Accounts Count */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Connected accounts:</span>
            <Badge variant={accountCount > 0 ? "default" : "secondary"} className="h-5.5 font-semibold">
              {accountCount} {accountCount === 1 ? "account" : "accounts"}
            </Badge>
          </div>

          {/* Platform Badges */}
          {platforms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {platforms.map((platform) => (
                <PlatformBadge key={platform} platform={platform} size="sm" />
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground/60 italic pt-1">
              No accounts linked to this branch
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 p-3 mt-auto">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            title="Edit Branch"
            className="cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            title="Delete Branch"
            className="cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Link href={`/branches/${branch.id}`} passHref>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer text-xs font-semibold py-1 px-2.5 h-7.5 border-border hover:border-accent hover:text-foreground hover:bg-transparent bg-transparent transition-colors gap-1 shadow-xs"
          >
            Manage
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/card:translate-x-0.5" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
