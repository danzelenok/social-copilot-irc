import React from "react"
import { OrganizationList } from "@clerk/nextjs"

export default function InvitePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 text-center relative z-10">
        <div className="space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">
            SC
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Приглашение в организацию
          </h1>
          <p className="text-sm text-muted-foreground">
            Вас пригласили присоединиться к рабочему пространству. Выберите организацию для продолжения.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 shadow-xl flex justify-center">
          <OrganizationList
            hidePersonal={true}
            afterSelectOrganizationUrl="/dashboard"
            afterCreateOrganizationUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  )
}
