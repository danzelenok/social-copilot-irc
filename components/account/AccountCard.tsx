"use client"

import React, { useState } from "react"
import { DecryptedAccount } from "@/lib/actions/accounts"
import { PlatformBadge } from "./PlatformBadge"
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2, ShieldCheck, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

interface AccountCardProps {
  account: DecryptedAccount
  onEdit: (account: DecryptedAccount) => void
  onDelete: (account: DecryptedAccount) => void
  onToggle: (id: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>
}

export function AccountCard({
  account,
  onEdit,
  onDelete,
  onToggle,
}: AccountCardProps) {
  const [isActive, setIsActive] = useState(account.is_active)
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async (checked: boolean) => {
    // Optimistic update
    const previousState = isActive
    setIsActive(checked)
    setIsToggling(true)

    try {
      const result = await onToggle(account.id, checked)
      if (!result.success) {
        // Revert on failure
        setIsActive(previousState)
        toast.error(result.error || "Failed to update account status.")
      } else {
        toast.success(`Account ${checked ? "activated" : "deactivated"} successfully.`)
      }
    } catch {
      setIsActive(previousState)
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsToggling(false)
    }
  }

  // Get brand color borders & styles
  const getBrandStyles = () => {
    switch (account.platform_type) {
      case "telegram":
        return {
          accent: "from-sky-500/80 to-blue-500/40",
          iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        }
      case "instagram":
        return {
          accent: "from-pink-500/80 to-purple-600/40",
          iconBg: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
        }
      case "framer":
        return {
          accent: "from-purple-500/80 to-indigo-500/40",
          iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        }
      case "subsplash":
        return {
          accent: "from-indigo-500/80 to-violet-500/40",
          iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        }
      default:
        return {
          accent: "from-muted to-muted-foreground",
          iconBg: "bg-muted text-muted-foreground",
        }
    }
  }

  const styles = getBrandStyles()

  return (
    <Card className="group/card relative flex flex-col h-full bg-card/40 backdrop-blur-md border border-border/80 hover:border-border hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
      {/* Brand accent line */}
      <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${styles.accent}`} />

      <CardHeader className="flex-1 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <PlatformBadge platform={account.platform_type} size="md" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-medium">
              {isActive ? "Active" : "Inactive"}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={isToggling}
              aria-label="Toggle active status"
              className="cursor-pointer"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted-foreground/80 block">Account Handle</span>
            <span className="text-sm font-semibold text-foreground tracking-tight break-all line-clamp-1">
              {account.handle}
            </span>
          </div>

          <div className="pt-2 border-t border-border/40">
            <span className="text-xs text-muted-foreground/80 block mb-1">Decrypted Credentials</span>
            <div className="space-y-1.5">
              {Object.entries(account.credentials)
                .filter(([key]) => key !== "expiresAt" && key !== "instagramUserId")
                .map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-2 text-xs bg-muted/30 dark:bg-muted/10 px-2 py-1 rounded border border-border/30">
                    <span className="text-muted-foreground font-medium shrink-0">{key}:</span>
                    <span className="font-mono text-muted-foreground/80 text-[11px] select-all truncate max-w-[200px]" title={val}>
                      {val}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border/60 bg-muted/20 p-3 mt-auto">
        <div className="flex items-center gap-1">
          {isActive ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80">
              <ShieldAlert className="h-3.5 w-3.5" /> Disabled
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(account)}
            title="Edit Account Credentials"
            className="cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(account)}
            title="Remove Account"
            className="cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
