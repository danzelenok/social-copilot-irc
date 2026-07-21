"use client"

import React, { useState } from "react"
import { BranchWithAccounts, createBranch, updateBranch, deleteBranch } from "@/lib/actions/branches"
import BranchCard from "./BranchCard"
import BranchForm from "./BranchForm"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import EmptyState from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus, Building2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface BranchListClientProps {
  initialBranches: BranchWithAccounts[]
}

export default function BranchListClient({ initialBranches }: BranchListClientProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<BranchWithAccounts | null>(null)
  
  // Deletion state
  const [deletingBranch, setDeletingBranch] = useState<BranchWithAccounts | null>(null)
  const [activeAccountsWarning, setActiveAccountsWarning] = useState<
    { id: string; platform_type: "telegram" | "instagram" | "framer" | "subsplash" }[] | null
  >(null)



  // Create Flow
  const handleCreateSubmit = async (data: { name: string }) => {
    const res = await createBranch(data)
    if (res.success) {
      toast.success(`Branch "${data.name}" created successfully.`)
      setIsCreateOpen(false)
    } else {
      toast.error(res.error || "Failed to create branch.")
      throw new Error(res.error)
    }
  }

  // Edit Flow
  const handleEditSubmit = async (data: { name: string }) => {
    if (!editingBranch) return
    const res = await updateBranch(editingBranch.id, data)
    if (res.success) {
      toast.success(`Branch renamed to "${data.name}".`)
      setEditingBranch(null)
    } else {
      toast.error(res.error || "Failed to rename branch.")
      throw new Error(res.error)
    }
  }

  // Delete Flow
  const handleDeleteConfirm = async () => {
    if (!deletingBranch) return
    const res = await deleteBranch(deletingBranch.id)
    if (res.success) {
      toast.success(`Branch "${deletingBranch.name}" deleted.`)
      setDeletingBranch(null)
      setActiveAccountsWarning(null)
    } else {
      if (res.activeAccounts) {
        // Blocks deletion and displays active accounts warning
        setActiveAccountsWarning(res.activeAccounts as { id: string; platform_type: "telegram" | "instagram" | "framer" | "subsplash" }[])
        toast.error("Deletion blocked: branch has active accounts.")
      } else {
        toast.error(res.error || "Failed to delete branch.")
        setDeletingBranch(null)
      }
    }
  }

  const handleDeleteCancel = () => {
    setDeletingBranch(null)
    setActiveAccountsWarning(null)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        title="Branches"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="cursor-pointer gap-1.5 text-xs font-semibold text-foreground border-[1.5px] border-ring bg-transparent hover:bg-ring/10 shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Branch
          </Button>
        }
      />

      {/* Branches Grid */}
      {initialBranches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No branches configured"
          description="Create a branch to start configuring platform accounts and templates."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="cursor-pointer gap-1.5 text-xs font-semibold text-foreground border-[1.5px] border-ring bg-transparent hover:bg-ring/10 shrink-0"
            >
              <Plus className="h-4 w-4" /> Create First Branch
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              accountCount={branch.accountCount}
              platforms={branch.platforms}
              onEdit={() => setEditingBranch(branch)}
              onDelete={() => setDeletingBranch(branch)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Branch</DialogTitle>
            <DialogDescription>
              Enter a unique name for the new branch.
            </DialogDescription>
          </DialogHeader>
          <BranchForm
            onSubmit={handleCreateSubmit}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingBranch}
        onOpenChange={(open) => {
          if (!open) setEditingBranch(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Branch</DialogTitle>
            <DialogDescription>
              Provide a new name for the selected branch.
            </DialogDescription>
          </DialogHeader>
          {editingBranch && (
            <BranchForm
              defaultValues={{ name: editingBranch.name }}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditingBranch(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deletingBranch && (
        <ConfirmDialog
          open={!!deletingBranch}
          title={activeAccountsWarning ? "Deletion Blocked" : "Delete Branch"}
          description={
            activeAccountsWarning
              ? `The branch "${deletingBranch.name}" cannot be deleted because it currently has active connected accounts.`
              : `Are you sure you want to delete the branch "${deletingBranch.name}"? This action is permanent and cannot be undone.`
          }
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          destructive={!activeAccountsWarning}
          showConfirm={!activeAccountsWarning}
          cancelText={activeAccountsWarning ? "Close" : "Cancel"}
        >
          {activeAccountsWarning && (
            <div className="mt-4 space-y-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-2 text-destructive font-medium text-xs">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                <span>Active Accounts Linked:</span>
              </div>
              <ul className="space-y-1.5 max-h-[160px] overflow-y-auto pl-1 pr-1">
                {activeAccountsWarning.map((acc) => (
                  <li
                    key={acc.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-background border border-border"
                  >
                    <span className="font-mono text-muted-foreground truncate select-all">
                      ID: {acc.id.slice(0, 8)}...
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize font-medium">
                      {acc.platform_type}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground pt-1.5 leading-normal">
                Please deactivate or remove these accounts in the settings page before deleting this branch.
              </p>
            </div>
          )}
        </ConfirmDialog>
      )}
    </div>
  )
}
