import React, { Suspense } from "react"
import { db } from "@/lib/db"
import { branches } from "@/lib/db/schema"
import { BranchProvider } from "@/lib/context/BranchContext"
import Sidebar from "@/components/shared/Sidebar"
import BranchSelector from "@/components/branch/BranchSelector"
import ClientUserButton from "@/components/shared/ClientUserButton"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch branch options from the database ordered by name
  const branchList = await db.select().from(branches).orderBy(branches.name)

  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-background text-muted-foreground text-sm">Loading workspace...</div>}>
      <BranchProvider>
        <div className="flex min-h-screen bg-background">
          {/* Persistent Sidebar */}
          <Sidebar />

          {/* Content Wrapper */}
          <div className="flex flex-1 flex-col min-w-0 h-screen">
            {/* Top Navbar */}
            <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-base text-foreground tracking-tight hidden sm:inline-block">
                  Social Co-Pilot
                </span>
                <span className="h-4 w-px bg-border hidden sm:inline-block" />
                <BranchSelector branches={branchList} />
              </div>
              <div className="flex items-center gap-4">
                <ClientUserButton />
              </div>
            </header>

            {/* Page Body */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="mx-auto max-w-7xl w-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </BranchProvider>
    </Suspense>
  )
}
