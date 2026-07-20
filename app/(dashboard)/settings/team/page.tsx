import React from "react"
import { OrganizationProfile } from "@clerk/nextjs"
import { PageHeader } from "@/components/shared/PageHeader"

export default function TeamSettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader title="Team Settings" />

      <div className="flex justify-center border border-border bg-card p-6 rounded-2xl shadow-xs">
        <OrganizationProfile
          appearance={{
            variables: {
              colorPrimary: "#c4f030",
            },
          }}
        />
      </div>
    </div>
  )
}
