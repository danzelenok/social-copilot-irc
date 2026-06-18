"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface BranchContextType {
  selectedBranchId: string | null
  setSelectedBranchId: (id: string | null) => void
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Extract initial branch ID from URL parameter '?branch=<id>'
  const branchParam = searchParams.get("branch")
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(branchParam)

  // Sync state with URL parameter if URL changes (e.g. forward/back button)
  useEffect(() => {
    setSelectedBranchIdState(branchParam)
  }, [branchParam])

  const setSelectedBranchId = (id: string | null) => {
    setSelectedBranchIdState(id)
    
    // Update the URL search parameters
    const params = new URLSearchParams(searchParams.toString())
    if (id) {
      params.set("branch", id)
    } else {
      params.delete("branch")
    }
    
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <BranchContext.Provider value={{ selectedBranchId, setSelectedBranchId }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider")
  }
  return context
}
