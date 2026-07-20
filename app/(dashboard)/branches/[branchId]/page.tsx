import React from "react"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { branches } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getAccountsByBranch } from "@/lib/actions/accounts"
import { getBranchAddresses } from "@/lib/actions/branchAddresses"
import BranchDetailClient from "@/components/account/BranchDetailClient"

// Ensure this page renders dynamically on each request to pick up DB changes
export const dynamic = "force-dynamic"

interface BranchDetailPageProps {
  params: Promise<{
    branchId: string
  }>
}

export default async function BranchDetailPage({
  params,
}: BranchDetailPageProps) {
  const { branchId } = await params

  // Fetch the current branch details
  const [branch] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, branchId))
    .limit(1)

  // Trigger 404 page if the branch does not exist
  if (!branch) {
    notFound()
  }

  // Fetch accounts connected to this branch
  const accounts = await getAccountsByBranch(branchId)

  // Fetch saved addresses for this branch
  const addresses = await getBranchAddresses(branchId)

  return (
    <BranchDetailClient
      branch={branch}
      initialAccounts={accounts}
      initialAddresses={addresses}
    />
  )
}
