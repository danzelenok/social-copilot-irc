"use client"

import React, { useState } from "react"
import { Branch, BranchAddress } from "@/lib/db/schema"
import { DecryptedAccount, createAccount, updateAccount, deleteAccount } from "@/lib/actions/accounts"
import {
  createBranchAddress,
  updateBranchAddress,
  deleteBranchAddress,
} from "@/lib/actions/branchAddresses"
import { updateBranchTimezone } from "@/lib/actions/branches"
import { TIMEZONES, getCurrentTimeInTimezone } from "@/lib/utils/timezones"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
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
import { Badge } from "@/components/ui/badge"
import { AccountForm } from "./AccountForm"
import BranchAddressForm from "@/components/branch/BranchAddressForm"
import { Plus, Link, ArrowLeft, MapPin, Edit2, Trash2, Clock } from "lucide-react"
import LinkNext from "next/link"
import { toast } from "sonner"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

interface BranchDetailClientProps {
  branch: Branch
  initialAccounts: DecryptedAccount[]
  initialAddresses: BranchAddress[]
}

export default function BranchDetailClient({
  branch,
  initialAccounts,
  initialAddresses,
}: BranchDetailClientProps) {
  const [accounts, setAccounts] = useState<DecryptedAccount[]>(initialAccounts)
  const [addresses, setAddresses] = useState<BranchAddress[]>(initialAddresses)
  const [timezone, setTimezone] = useState<string | null>(branch.timezone)

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

  // Address Dialog states
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<BranchAddress | null>(null)
  const [deletingAddress, setDeletingAddress] = useState<BranchAddress | null>(null)

  const handleOpenAddAddress = () => {
    setEditingAddress(null)
    setIsAddressFormOpen(true)
  }

  const handleOpenEditAddress = (address: BranchAddress) => {
    setEditingAddress(address)
    setIsAddressFormOpen(true)
  }

  const handleCloseAddressForm = () => {
    setIsAddressFormOpen(false)
    setEditingAddress(null)
  }

  const handleAddressFormSubmit = async (data: {
    label: string
    addressText: string
    isDefault: boolean
  }) => {
    if (editingAddress) {
      const res = await updateBranchAddress(editingAddress.id, {
        label: data.label,
        addressText: data.addressText,
        isDefault: data.isDefault,
      })

      if (res.success && res.address) {
        setAddresses((prev) =>
          prev.map((addr) => {
            if (addr.id === editingAddress.id) return res.address!
            // If the edited address became default, unset default on the rest locally
            if (data.isDefault) return { ...addr, is_default: false }
            return addr
          })
        )
        toast.success("Address updated successfully.")
        handleCloseAddressForm()
      } else {
        throw new Error(res.error || "Failed to update address.")
      }
    } else {
      const res = await createBranchAddress({
        branchId: branch.id,
        label: data.label,
        addressText: data.addressText,
        isDefault: data.isDefault,
      })

      if (res.success && res.address) {
        setAddresses((prev) => [
          res.address!,
          ...(data.isDefault ? prev.map((addr) => ({ ...addr, is_default: false })) : prev),
        ])
        toast.success("Address added successfully.")
        handleCloseAddressForm()
      } else {
        throw new Error(res.error || "Failed to create address.")
      }
    }
  }

  const handleConfirmDeleteAddress = async () => {
    if (!deletingAddress) return

    const res = await deleteBranchAddress(deletingAddress.id)
    if (res.success) {
      setAddresses((prev) => prev.filter((addr) => addr.id !== deletingAddress.id))
      toast.success("Address removed successfully.")
      setDeletingAddress(null)
    } else {
      toast.error(res.error || "Failed to remove address.")
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

      {/* Timezone Settings Card */}
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur-md p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">Branch Timezone</h3>
          <p className="text-xs text-muted-foreground">
            Configure this branch's physical location timezone. Required for scheduling event publications.
          </p>
          {timezone ? (
            <p className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5 pt-1 select-none">
              <Clock className="h-3.5 w-3.5" />
              Current local time: {getCurrentTimeInTimezone(timezone)} ({timezone})
            </p>
          ) : (
            <p className="text-xs font-semibold text-amber-500 flex items-center gap-1.5 pt-1 select-none animate-pulse">
              <Clock className="h-3.5 w-3.5" />
              Timezone not configured. Scheduled postings will be disabled.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect
            value={timezone || ""}
            onChange={async (e) => {
              const val = e.target.value || null
              setTimezone(val)
              const res = await updateBranchTimezone(branch.id, val)
              if (res.success) {
                toast.success("Timezone updated successfully.")
              } else {
                toast.error(res.error || "Failed to update timezone.")
              }
            }}
            className="bg-background/50 h-9.5 text-sm w-[260px]"
          >
            <NativeSelectOption value="">Select Timezone...</NativeSelectOption>
            {TIMEZONES.map((tz) => (
              <NativeSelectOption key={tz.value} value={tz.value}>
                {tz.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

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

      {/* Addresses Section */}
      <div className="pt-6 border-t border-border/60 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground tracking-tight">Addresses</h2>
          <Button
            onClick={handleOpenAddAddress}
            size="sm"
            variant="outline"
            className="cursor-pointer font-semibold shadow-xs"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Address
          </Button>
        </div>

        {addresses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="flex flex-col gap-2 p-4 rounded-xl border border-border/80 bg-card/40 backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-sm text-foreground truncate">
                      {address.label}
                    </span>
                  </div>
                  {address.is_default && (
                    <Badge className="h-5 px-2 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0">
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {address.address_text}
                </p>
                <div className="flex items-center justify-end gap-1 pt-1 mt-auto">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleOpenEditAddress(address)}
                    title="Edit Address"
                    className="cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeletingAddress(address)}
                    title="Delete Address"
                    className="cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MapPin}
            title="No Saved Addresses"
            description="Add reusable addresses for this branch so they can be picked in the Composer."
            action={
              <Button onClick={handleOpenAddAddress} className="cursor-pointer shadow-xs font-semibold">
                <Plus className="mr-1.5 h-4 w-4" /> Add Your First Address
              </Button>
            }
          />
        )}
      </div>

      {/* Add / Edit Address Dialog */}
      <Dialog open={isAddressFormOpen} onOpenChange={(open) => { if (!open) handleCloseAddressForm() }}>
        <DialogContent className="max-w-md bg-popover border border-border/80 shadow-lg p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingAddress ? "Edit Address" : "Add Address"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {editingAddress
                ? "Update this branch's saved address."
                : "Save a reusable address for this branch to pick from in the Composer."}
            </DialogDescription>
          </DialogHeader>

          <BranchAddressForm
            defaultValues={
              editingAddress
                ? {
                    label: editingAddress.label,
                    addressText: editingAddress.address_text,
                    isDefault: editingAddress.is_default,
                  }
                : undefined
            }
            onSubmit={handleAddressFormSubmit}
            onCancel={handleCloseAddressForm}
          />
        </DialogContent>
      </Dialog>

      {/* Remove Address Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingAddress}
        title="Remove Address"
        description={`Are you sure you want to remove ${
          deletingAddress ? `"${deletingAddress.label}"` : "this address"
        }? This action is permanent and cannot be undone.`}
        onConfirm={handleConfirmDeleteAddress}
        onCancel={() => setDeletingAddress(null)}
        destructive
        confirmText="Remove Address"
        cancelText="Cancel"
      />
    </div>
  )
}
