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
              // Use the darker accent (--ring / --accent) rather than the raw
              // --primary lime, which is too light for readable text/links.
              colorPrimary: "#8dc400",
              colorPrimaryForeground: "#18180e",
              colorBackground: "#ffffff",
              colorForeground: "#18180e",
              colorMutedForeground: "#8a8a78",
              colorInput: "#ffffff",
              colorInputForeground: "#18180e",
              borderRadius: "0.625rem",
            },
          }}
        />
      </div>
    </div>
  )
}
