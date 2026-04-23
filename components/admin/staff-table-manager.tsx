'use client'

import { useEffect, useState } from 'react'
import { Loader2, Mail, MoreVertical, RotateCcw, ShieldOff, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CopyUrlButton } from '@/components/admin/copy-url-button'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StaffStatusDot } from '@/components/ui/status-dot'
import { cn } from '@/lib/utils'

export interface StaffListRow {
  id: string
  displayName: string
  email: string | null
  status: 'active' | 'invited' | 'disabled'
  disabled: boolean
  inviteUrl: string | null
  lastInviteSentAt: string | null
}

interface StaffTableManagerProps {
  rows: StaffListRow[]
}

type ConfirmState =
  | { type: 'revoke'; row: StaffListRow }
  | { type: 'disable'; row: StaffListRow }
  | { type: 'delete'; row: StaffListRow }
  | null

export function StaffTableManager({ rows: initialRows }: StaffTableManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [flash, setFlash] = useState<{ id: string; message: string } | null>(null)

  function showFlash(id: string, message: string) {
    setFlash({ id, message })
    setTimeout(() => {
      setFlash((prev) => (prev && prev.id === id ? null : prev))
    }, 1200)
  }

  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  async function postAction(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : '{}',
    })
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null

    if (!response.ok) {
      throw new Error(payload?.error?.message ?? 'Request failed')
    }
  }

  async function sendInvite(row: StaffListRow) {
    setBusyId(row.id)
    setError(null)
    try {
      await postAction(`/api/admin/staff/${row.id}/invite`)
      showFlash(row.id, row.status === 'invited' ? 'Invite resent' : 'Invite sent')
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to send invite')
    } finally {
      setBusyId(null)
    }
  }

  async function revokeInvite(row: StaffListRow) {
    setBusyId(row.id)
    setError(null)
    try {
      await postAction(`/api/admin/staff/${row.id}/revoke`)
      showFlash(row.id, 'Invite revoked')
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to revoke invite')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleDisabled(row: StaffListRow) {
    setBusyId(row.id)
    setError(null)
    try {
      await postAction(`/api/admin/staff/${row.id}/disable`, { disabled: !row.disabled })
      showFlash(row.id, row.disabled ? 'Access restored' : 'Access disabled')
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update staff access')
    } finally {
      setBusyId(null)
    }
  }

  async function deleteStaff(row: StaffListRow) {
    setBusyId(row.id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/staff/${row.id}`, { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to delete staff record')
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to delete staff record')
    } finally {
      setBusyId(null)
    }
  }

  if (rows.length === 0) {
    return <EmptyState title="No staff accounts yet" description="Invite a staff member to get started." />
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <ul className="divide-y rounded-lg border bg-card">
        {rows.map((row) => {
          const inviteTitle = row.status === 'invited' ? 'Resend invite' : 'Send invite'
          const isBusy = busyId === row.id
          const rowFlash = flash?.id === row.id ? flash.message : null
          return (
            <li key={row.id} className="flex items-center gap-3 px-3 py-3">
              <StaffStatusDot status={row.status} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{row.displayName}</div>
                <div className="text-xs text-muted-foreground">{row.email ?? 'No email'}</div>
              </div>

              {rowFlash ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {rowFlash}
                </span>
              ) : null}

              <div className="flex shrink-0 items-center gap-1">
                {row.inviteUrl && row.status === 'invited' ? (
                  <CopyUrlButton url={row.inviteUrl} iconOnly />
                ) : null}

                {!row.disabled ? (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => sendInvite(row)}
                      aria-label={inviteTitle}
                      title={inviteTitle}
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    </Button>
                    {row.status === 'invited' ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => setConfirm({ type: 'revoke', row })}
                        aria-label="Revoke invite"
                        title="Revoke invite"
                        className="text-destructive hover:text-destructive"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </>
                ) : null}

                {row.status !== 'invited' ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={isBusy}
                    onClick={() => (row.disabled ? toggleDisabled(row) : setConfirm({ type: 'disable', row }))}
                    aria-label={row.disabled ? 'Enable access' : 'Disable access'}
                    title={row.disabled ? 'Enable access' : 'Disable access'}
                    className={row.disabled ? '' : 'text-destructive hover:text-destructive'}
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                  </Button>
                ) : null}

                {row.disabled ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={isBusy}
                        aria-label="More actions"
                        title="More actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={(event) => {
                          event.preventDefault()
                          setConfirm({ type: 'delete', row })
                        }}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete staff record
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === 'revoke'
                ? 'Revoke invite?'
                : confirm?.type === 'delete'
                  ? 'Delete staff record?'
                  : 'Disable access?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === 'revoke'
                ? `The invite link for ${confirm.row.displayName} will stop working.`
                : confirm?.type === 'delete'
                  ? `Delete staff record for ${confirm.row.displayName}? This cannot be undone.`
                  : confirm?.type === 'disable'
                    ? `${confirm.row.displayName} will lose access to the admin portal.`
                    : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              onClick={() => {
                if (!confirm) return
                const { type, row } = confirm
                setConfirm(null)
                if (type === 'revoke') void revokeInvite(row)
                else if (type === 'delete') void deleteStaff(row)
                else void toggleDisabled(row)
              }}
            >
              {confirm?.type === 'revoke'
                ? 'Revoke invite'
                : confirm?.type === 'delete'
                  ? 'Delete staff record'
                  : 'Disable access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
