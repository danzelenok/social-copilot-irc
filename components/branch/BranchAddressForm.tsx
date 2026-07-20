"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface BranchAddressFormProps {
  defaultValues?: { label: string; addressText: string; isDefault: boolean }
  onSubmit: (data: { label: string; addressText: string; isDefault: boolean }) => Promise<void> | void
  onCancel: () => void
}

export default function BranchAddressForm({
  defaultValues,
  onSubmit,
  onCancel,
}: BranchAddressFormProps) {
  const [label, setLabel] = useState(defaultValues?.label || "")
  const [addressText, setAddressText] = useState(defaultValues?.addressText || "")
  const [isDefault, setIsDefault] = useState(defaultValues?.isDefault || false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedLabel = label.trim()
    const trimmedAddress = addressText.trim()

    if (!trimmedLabel) {
      setError("Address label is required.")
      return
    }
    if (trimmedLabel.length > 100) {
      setError("Address label must be 100 characters or less.")
      return
    }
    if (!trimmedAddress) {
      setError("Address is required.")
      return
    }
    if (trimmedAddress.length > 300) {
      setError("Address must be 300 characters or less.")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({ label: trimmedLabel, addressText: trimmedAddress, isDefault })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong."
      setError(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="address-label" className="text-foreground">
          Label
        </Label>
        <Input
          id="address-label"
          type="text"
          placeholder="e.g. Main Hall"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value)
            if (error) setError(null)
          }}
          disabled={isSubmitting}
          maxLength={105}
          autoFocus
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address-text" className="text-foreground">
          Address
        </Label>
        <Textarea
          id="address-text"
          placeholder="e.g. 123 Main St, Springfield"
          value={addressText}
          onChange={(e) => {
            setAddressText(e.target.value)
            if (error) setError(null)
          }}
          disabled={isSubmitting}
          className="w-full min-h-20"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="address-is-default"
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(!!checked)}
          disabled={isSubmitting}
        />
        <Label htmlFor="address-is-default" className="text-foreground cursor-pointer font-normal">
          Set as default address for this branch
        </Label>
      </div>

      {error && (
        <p className="text-xs text-destructive font-medium animate-in fade-in duration-200">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border -mx-4 -mb-4 px-4 py-3 bg-muted/30 rounded-b-xl">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="cursor-pointer shadow-xs"
        >
          {isSubmitting ? "Saving..." : "Save Address"}
        </Button>
      </div>
    </form>
  )
}
