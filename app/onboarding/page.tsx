"use client"

import React, { useState, useTransition } from "react"
import { createOrganizationAction } from "@/lib/actions/organizations"
import { Building2, Sparkles, ArrowRight, Loader2 } from "lucide-react"

export default function OnboardingPage() {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Пожалуйста, введите название организации.")
      return
    }

    startTransition(async () => {
      const res = await createOrganizationAction(name)
      if (res && !res.success) {
        setError(res.error || "Не удалось создать организацию.")
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">
            SC
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Создание организации
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Добро пожаловать в Social Copilot! Укажите название вашей организации для начала работы.
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="orgName" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Organization name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                </div>
                <input
                  id="orgName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например, Моя Компания"
                  disabled={isPending}
                  className="w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive font-medium animate-in fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Создаем рабочее пространство...
                </>
              ) : (
                <>
                  <span>Create</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80 pt-2 border-t border-border/50">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Вы автоматически станете администратором</span>
          </div>
        </div>
      </div>
    </div>
  )
}
