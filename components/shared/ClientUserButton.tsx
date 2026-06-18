"use client"

import React, { useEffect, useState } from "react"
import { UserButton } from "@clerk/nextjs"

export default function ClientUserButton() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a skeleton placeholder to prevent layout shifts
    return <div className="h-8.5 w-8.5 rounded-full bg-muted/50 border border-border/50 animate-pulse" />
  }

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox:
            "h-8.5 w-8.5 rounded-full border border-border shadow-xs hover:scale-105 transition-transform",
        },
      }}
    />
  )
}
