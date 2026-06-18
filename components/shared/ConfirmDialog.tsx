"use client"

import React, { useState } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  destructive?: boolean
  showConfirm?: boolean
  confirmText?: string
  cancelText?: string
  children?: React.ReactNode
}

export default function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  destructive = false,
  showConfirm = true,
  confirmText = "Confirm",
  cancelText = "Cancel",
  children,
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm()
    } catch (err) {
      console.error("Confirmation error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {children && <div className="py-2">{children}</div>}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isSubmitting}>
            {cancelText}
          </AlertDialogCancel>
          {showConfirm && (
            <Button
              variant={destructive ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting ? "Processing..." : confirmText}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
