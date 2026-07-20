"use client"

import React, { useState, useEffect } from "react"
import { BranchWithAccounts } from "@/lib/actions/branches"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin } from "lucide-react"

const CUSTOM_ADDRESS_SENTINEL = "__custom__"

interface AddressFieldProps {
  branch: BranchWithAccounts
  onChange: (address: string | null) => void
  disabled?: boolean
}

export default function AddressField({ branch, onChange, disabled = false }: AddressFieldProps) {
  const savedAddresses = branch.addresses || []
  const hasSavedAddresses = savedAddresses.length > 0

  const [enabled, setEnabled] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [customText, setCustomText] = useState("")
  const isCustomMode = !hasSavedAddresses || selectedAddressId === CUSTOM_ADDRESS_SENTINEL

  // This component is remounted fresh (via `key`) whenever its branch re-enters the
  // selected-targets list, so it always starts disabled — sync that back to the parent
  // in case a stale address from a previous selection of this branch is still held there.
  useEffect(() => {
    onChange(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = (next: { enabled: boolean; selectedAddressId: string | null; customText: string }) => {
    if (!next.enabled) {
      onChange(null)
      return
    }
    if (!hasSavedAddresses || next.selectedAddressId === CUSTOM_ADDRESS_SENTINEL) {
      onChange(next.customText.trim() || null)
      return
    }
    const match = savedAddresses.find((addr) => addr.id === next.selectedAddressId)
    onChange(match ? match.address_text : null)
  }

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    emit({ enabled: checked, selectedAddressId, customText })
  }

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id)
    emit({ enabled, selectedAddressId: id, customText })
  }

  const handleCustomTextChange = (value: string) => {
    setCustomText(value)
    emit({ enabled, selectedAddressId, customText: value })
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          Specify an address for &quot;{branch.name}&quot;?
        </Label>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
          aria-label={`Toggle address for ${branch.name}`}
          className="cursor-pointer"
        />
      </div>

      {enabled && (
        <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {hasSavedAddresses && (
            <Select
              value={isCustomMode ? CUSTOM_ADDRESS_SENTINEL : selectedAddressId || undefined}
              onValueChange={(val) => {
                if (val) handleSelectAddress(val)
              }}
              disabled={disabled}
            >
              <SelectTrigger className="w-full cursor-pointer bg-background/50 text-sm">
                <SelectValue placeholder="Select an address" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border">
                {savedAddresses.map((address) => (
                  <SelectItem key={address.id} value={address.id} className="cursor-pointer">
                    {address.label} — {address.address_text}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_ADDRESS_SENTINEL} className="cursor-pointer">
                  Specify a different address
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {isCustomMode && (
            <Input
              type="text"
              placeholder="Enter an address for this post"
              value={customText}
              onChange={(e) => handleCustomTextChange(e.target.value)}
              disabled={disabled}
              className={hasSavedAddresses ? "mt-2 bg-background/50 text-sm" : "bg-background/50 text-sm"}
            />
          )}
        </div>
      )}
    </div>
  )
}
