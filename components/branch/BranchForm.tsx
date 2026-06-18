"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface BranchFormProps {
  defaultValues?: { name: string }
  onSubmit: (data: { name: string }) => Promise<void> | void
  onCancel: () => void
}

export default function BranchForm({
  defaultValues,
  onSubmit,
  onCancel,
}: BranchFormProps) {
  const [name, setName] = useState(defaultValues?.name || "")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Branch name is required.")
      return
    }

    if (trimmedName.length > 100) {
      setError("Branch name must be 100 characters or less.")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({ name: trimmedName })
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
        <Label htmlFor="branch-name" className="text-foreground">
          Branch Name
        </Label>
        <Input
          id="branch-name"
          type="text"
          placeholder="e.g. North Branch, Main Office"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError(null)
          }}
          disabled={isSubmitting}
          maxLength={105}
          autoFocus
          className="w-full"
        />
        {error && (
          <p className="text-xs text-destructive font-medium animate-in fade-in duration-200">
            {error}
          </p>
        )}
      </div>

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
          {isSubmitting ? "Saving..." : "Save Branch"}
        </Button>
      </div>
    </form>
  )
}
