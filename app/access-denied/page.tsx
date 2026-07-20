import React from "react"
import { SignOutButton } from "@clerk/nextjs"
import { ShieldAlert, LogOut } from "lucide-react"

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-destructive/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-6 text-center relative z-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Access restricted
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You don't have access to this workspace. Please contact your administrator.
          </p>
        </div>

        <div className="pt-4 border-t border-border/60 flex justify-center">
          <SignOutButton>
            <button className="inline-flex items-center gap-2 rounded-xl border border-input bg-background/80 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer">
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}
