import React from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { getBranches } from "@/lib/actions/branches"
import ComposerForm from "@/components/composer/ComposerForm"

export const dynamic = "force-dynamic"

export default async function ComposerPage() {
  const branches = await getBranches()

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader title="Composer" />

      <ComposerForm branches={branches} />
    </div>
  )
}

