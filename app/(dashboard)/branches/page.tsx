import React from "react"
import { getBranches } from "@/lib/actions/branches"
import BranchListClient from "@/components/branch/BranchListClient"

// Ensure this page is rendered dynamically on each request to fetch the latest db updates
export const dynamic = "force-dynamic"

export default async function BranchesPage() {
  const branches = await getBranches()

  return <BranchListClient initialBranches={branches} />
}
