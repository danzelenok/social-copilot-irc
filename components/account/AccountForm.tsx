"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DecryptedAccount, getInstagramAuthUrl } from "@/lib/actions/accounts"
import { PlatformBadge, InstagramIcon } from "./PlatformBadge"
import { Loader2, Link2, Eye, EyeOff } from "lucide-react"

interface AccountFormProps {
  branchId: string
  defaultValues?: Partial<DecryptedAccount>
  onSubmit: (data: {
    platformType: "telegram" | "instagram" | "framer" | "subsplash"
    credentials: Record<string, string>
  }) => Promise<void> | void
  onCancel: () => void
}

export function AccountForm({
  branchId,
  defaultValues,
  onSubmit,
  onCancel,
}: AccountFormProps) {
  const isEditMode = !!defaultValues?.id

  // Step 1: Platform Selection
  const [platformType, setPlatformType] = useState<"telegram" | "instagram" | "framer" | "subsplash">(
    (defaultValues?.platform_type as DecryptedAccount["platform_type"]) || "telegram"
  )

  // Step 2: Credentials Inputs
  // Telegram fields
  const [botToken, setBotToken] = useState(defaultValues?.credentials?.botToken || "")
  const [channelId, setChannelId] = useState(defaultValues?.credentials?.channelId || "")
  const [showBotToken, setShowBotToken] = useState(false)

  // Instagram fields
  const [instagramUsername, setInstagramUsername] = useState(defaultValues?.credentials?.username || "")
  const [instagramOAuthToken, setInstagramOAuthToken] = useState(defaultValues?.credentials?.oauthToken || "")
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false)

  // Errors & Loading state
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle Instagram OAuth connection via server action redirect
  const handleInstagramOAuth = async () => {
    setIsConnectingOAuth(true)
    setError(null)
    try {
      const res = await getInstagramAuthUrl(branchId)
      if (res.success && res.url) {
        window.location.href = res.url
      } else {
        setError("Failed to get Instagram authorization URL.")
        setIsConnectingOAuth(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate Instagram OAuth.")
      setIsConnectingOAuth(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Form Validation
    const credentials: Record<string, string> = {}

    if (platformType === "telegram") {
      if (!botToken.trim()) {
        setError("Bot Token is required for Telegram.")
        return
      }
      if (!channelId.trim()) {
        setError("Channel ID is required for Telegram.")
        return
      }
      credentials.botToken = botToken.trim()
      credentials.channelId = channelId.trim()
    } else if (platformType === "instagram") {
      if (!instagramUsername.trim() || !instagramOAuthToken.trim()) {
        setError("Please connect your Instagram account via OAuth first.")
        return
      }
      credentials.username = instagramUsername.trim()
      credentials.oauthToken = instagramOAuthToken.trim()
    } else {
      setError(`${platformType.toUpperCase()} accounts are not supported yet.`)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        platformType,
        credentials,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save account. Please verify credentials."
      setError(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {error && (
        <div className="p-3 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in duration-200">
          {error}
        </div>
      )}

      {/* Step 1: Select Platform */}
      <div className="space-y-2">
        <Label className="text-foreground">Select Platform</Label>
        {isEditMode ? (
          <div className="flex items-center gap-2">
            <PlatformBadge platform={platformType} size="md" />
            <span className="text-xs text-muted-foreground italic">(Platform cannot be changed)</span>
          </div>
        ) : (
          <Select
            value={platformType}
            onValueChange={(val) => {
              if (val) {
                setPlatformType(val)
                setError(null)
              }
            }}
            disabled={isSubmitting || isConnectingOAuth}
          >
            <SelectTrigger className="w-full cursor-pointer bg-transparent border border-border">
              <SelectValue placeholder="Select platform type" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border">
              <SelectItem value="telegram" className="cursor-pointer">Telegram</SelectItem>
              <SelectItem value="instagram" className="cursor-pointer">Instagram</SelectItem>
              <SelectItem value="framer" className="cursor-pointer">Framer (Coming Soon)</SelectItem>
              <SelectItem value="subsplash" className="cursor-pointer">Subsplash (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="h-px bg-border/60 my-2" />

      {/* Step 2: Platform Specific Credentials */}
      {platformType === "telegram" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="space-y-2">
            <Label htmlFor="bot-token" className="text-foreground">
              Bot Token
            </Label>
            <div className="relative">
              <Input
                id="bot-token"
                type={showBotToken ? "text" : "password"}
                placeholder={isEditMode ? "••••••••abc123" : "e.g. 123456789:ABCdefGh..."}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                disabled={isSubmitting}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowBotToken(!showBotToken)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                tabIndex={-1}
              >
                {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Created via Telegram BotFather.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-id" className="text-foreground">
              Channel ID / Username
            </Label>
            <Input
              id="channel-id"
              type="text"
              placeholder="e.g. @my_channel_name or -1001234567890"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-[10px] text-muted-foreground">
              Ensure your bot is added as an administrator to this channel.
            </p>
          </div>
        </div>
      )}

      {platformType === "instagram" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col items-center justify-center p-4 border border-dashed border-border/80 rounded-lg bg-muted/10 space-y-3">
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">Instagram Business Connection</p>
              <p className="text-xs text-muted-foreground">
                Authorize directly via Instagram to connect your account.
              </p>
            </div>

            {instagramUsername ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-md text-xs font-semibold">
                <Link2 className="h-4 w-4" />
                Connected as: <span className="font-mono">@{instagramUsername}</span>
              </div>
            ) : null}

            <Button
              type="button"
              disabled={isSubmitting || isConnectingOAuth}
              onClick={handleInstagramOAuth}
              className="cursor-pointer bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:opacity-95 text-white font-bold shadow-md shadow-pink-600/10 w-full max-w-[240px] border-0 hover:shadow-lg hover:shadow-pink-600/20 hover:-translate-y-0.5 transition-all duration-200"
            >
              {isConnectingOAuth ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Instagram...
                </>
              ) : (
                <>
                  <InstagramIcon className="mr-2 h-4 w-4" />
                  {instagramUsername ? "Reconnect with Instagram" : "Connect with Instagram"}
                </>
              )}
            </Button>
          </div>

          {instagramUsername && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <Label className="text-foreground">Username (Reference)</Label>
              <Input
                type="text"
                disabled
                value={instagramUsername}
                className="bg-muted/40 text-muted-foreground cursor-not-allowed"
              />
            </div>
          )}
        </div>
      )}

      {(platformType === "framer" || platformType === "subsplash") && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 opacity-60">
          <div className="flex items-center justify-between">
            <Label className="text-foreground">API Configuration</Label>
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold text-[10px]">
              Coming Soon
            </Badge>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">API Key</Label>
            <Input
              type="password"
              placeholder="••••••••••••••••"
              disabled
              className="cursor-not-allowed bg-muted/30"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">
              {platformType === "framer" ? "Project ID" : "App ID"}
            </Label>
            <Input
              type="text"
              placeholder={platformType === "framer" ? "framer-project-id" : "subsplash-app-id"}
              disabled
              className="cursor-not-allowed bg-muted/30"
            />
          </div>
        </div>
      )}

      {/* Form Action Controls */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border -mx-4 -mb-4 px-4 py-3 bg-muted/30 rounded-b-xl">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isConnectingOAuth}
          className="cursor-pointer"
        >
          Cancel
        </Button>
        
        {/* Only non-Instagram platforms need a manual submit button in this form */}
        {platformType !== "instagram" && (
          <Button
            type="submit"
            disabled={
              isSubmitting || 
              platformType === "framer" || 
              platformType === "subsplash"
            }
            className="cursor-pointer shadow-xs"
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Add Account"}
          </Button>
        )}
      </div>
    </form>
  )
}
