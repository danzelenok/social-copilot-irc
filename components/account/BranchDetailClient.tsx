"use client"

import React, { useState } from "react"
import { Branch } from "@/lib/db/schema"
import { DecryptedAccount, createAccount, updateAccount, deleteAccount } from "@/lib/actions/accounts"
import { AccountCard } from "./AccountCard"
import { PageHeader } from "@/components/shared/PageHeader"
import EmptyState from "@/components/shared/EmptyState"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AccountForm } from "./AccountForm"
import { Plus, Link, ArrowLeft } from "lucide-react"
import LinkNext from "next/link"
import { toast } from "sonner"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

interface BranchDetailClientProps {
  branch: Branch
  initialAccounts: DecryptedAccount[]
}

export default function BranchDetailClient({
  branch,
  initialAccounts,
}: BranchDetailClientProps) {
  const [accounts, setAccounts] = useState<DecryptedAccount[]>(initialAccounts)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    const successMsg = searchParams.get("success")
    const errorMsg = searchParams.get("error")

    if (successMsg) {
      toast.success(successMsg)
      const params = new URLSearchParams(searchParams.toString())
      params.delete("success")
      router.replace(`${pathname}?${params.toString()}`)
    }

    if (errorMsg) {
      toast.error(errorMsg)
      const params = new URLSearchParams(searchParams.toString())
      params.delete("error")
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [searchParams, router, pathname])

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<DecryptedAccount | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<DecryptedAccount | null>(null)

  // Handlers
  const handleOpenAdd = () => {
    setEditingAccount(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (account: DecryptedAccount) => {
    setEditingAccount(account)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingAccount(null)
  }

  const handleFormSubmit = async (data: {
    platformType: "telegram" | "instagram" | "framer" | "subsplash"
    credentials: Record<string, string>
  }) => {
    if (editingAccount) {
      // Edit mode
      const res = await updateAccount(editingAccount.id, {
        credentials: data.credentials,
      })

      if (res.success && res.account) {
        // Update client state
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === editingAccount.id
              ? {
                  ...acc,
                  credentials: {
                    ...acc.credentials,
                    ...data.credentials, // masked values are already handled on server
                  },
                  // Derive new handle if channelId/username changed
                  handle:
                    data.platformType === "telegram"
                      ? data.credentials.channelId || acc.handle
                      : data.credentials.username || acc.handle,
                }
              : acc
          )
        )
        toast.success("Account credentials updated successfully.")
        handleCloseForm()
      } else {
        throw new Error(res.error || "Failed to update account.")
      }
    } else {
      // Create mode
      const res = await createAccount({
        branchId: branch.id,
        platformType: data.platformType,
        credentials: data.credentials,
      })

      if (res.success && res.account) {
        // Construct the new decrypted account object for client state
        const newAcc: DecryptedAccount = {
          id: res.account.id,
          branch_id: res.account.branch_id,
          platform_type: res.account.platform_type as DecryptedAccount["platform_type"],
          is_active: res.account.is_active,
          created_at: new Date(res.account.created_at),
          credentials: data.credentials, // store submitted values for client view
          handle:
            data.platformType === "telegram"
              ? data.credentials.channelId
              : data.credentials.username || "Instagram Account",
        }
        setAccounts((prev) => [newAcc, ...prev])
        toast.success("Account connected successfully.")
        handleCloseForm()
      } else {
        throw new Error(res.error || "Failed to connect account.")
      }
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const res = await updateAccount(id, { isActive })
    if (res.success) {
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === id ? { ...acc, is_active: isActive } : acc))
      )
    }
    return res
  }

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return

    const res = await deleteAccount(deletingAccount.id)
    if (res.success) {
      setAccounts((prev) => prev.filter((acc) => acc.id !== deletingAccount.id))
      toast.success("Account removed successfully.")
      setDeletingAccount(null)
    } else {
      toast.error(res.error || "Failed to remove account.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <LinkNext
          href="/branches"
          className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="h-3 w-3" />
          Branches
        </LinkNext>
        <span>/</span>
        <span className="text-foreground font-semibold truncate max-w-[120px] sm:max-w-[200px]">
          {branch.name}
        </span>
      </div>

      {/* Page Header */}
      <PageHeader
        title={branch.name}
        action={
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="cursor-pointer font-semibold shadow-xs"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Connect Account
          </Button>
        }
      />

      {/* Account Cards Grid */}
      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {accounts.map((acc) => (
            <AccountCard
              key={`${acc.id}-${acc.is_active}`}
              account={acc}
              onEdit={handleOpenEdit}
              onDelete={setDeletingAccount}
              onToggle={handleToggleActive}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Link}
          title="No Connected Accounts"
          description="Link social media accounts to this branch to start scheduling and distributing content."
          action={
            <Button onClick={handleOpenAdd} className="cursor-pointer shadow-xs font-semibold">
              <Plus className="mr-1.5 h-4 w-4" /> Link Your First Account
            </Button>
          }
        />
      )}

      {/* Add / Edit Account Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleCloseForm() }}>
        <DialogContent className="max-w-md bg-popover border border-border/80 shadow-lg p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingAccount ? "Edit Account Credentials" : "Connect Social Account"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {editingAccount
                ? "Update authorization tokens or channel identifiers for this account connection."
                : "Select a social publishing platform and enter its required credentials to connect it to this branch."}
            </DialogDescription>
          </DialogHeader>

          <AccountForm
            branchId={branch.id}
            defaultValues={editingAccount || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      {/* Remove Account Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingAccount}
        title="Remove Social Account"
        description={`Are you sure you want to disconnect ${
          deletingAccount ? `@${deletingAccount.handle}` : "this account"
        }? This action will permanently delete this connection and its publishing configurations. It cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingAccount(null)}
        destructive
        confirmText="Disconnect Account"
        cancelText="Cancel"
      />
    </div>
  )
}
