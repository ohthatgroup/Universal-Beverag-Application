'use client'

import { useEffect, useState } from 'react'
import { Mail, RotateCcw, ShieldOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CopyUrlButton } from '@/components/admin/copy-url-button'
import { Button } from '@/components/ui/button'

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

function StatusDot({ status }: { status: StaffListRow['status'] }) {
  const dotColor =
    status === 'active'
      ? 'bg-green-500'
      : status === 'invited'
        ? 'bg-yellow-500'
        : 'bg-muted-foreground/40'
  const label = status === 'active' ? 'Active' : status === 'invited' ? 'Invited' : 'Disabled'
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotColor}`}
      aria-label={label}
      title={label}
    />
  )
}

export function StaffTableManager({ rows: initialRows }: StaffTableManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update staff access')
    } finally {
      setBusyId(null)
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No staff accounts yet.</p>
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <ul className="divide-y rounded-lg border bg-card">
        {rows.map((row) => {
          const inviteTitle = row.status === 'invited' ? 'Resend invite' : 'Send invite'
          return (
            <li key={row.id} className="flex items-center gap-3 px-3 py-3">
              <StatusDot status={row.status} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{row.displayName}</div>
                <div className="truncate text-xs text-muted-foreground">{row.email ?? 'No email'}</div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {row.inviteUrl ? <CopyUrlButton url={row.inviteUrl} iconOnly /> : null}

                {!row.disabled ? (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={busyId === row.id}
                      onClick={() => sendInvite(row)}
                      aria-label={inviteTitle}
                      title={inviteTitle}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    {row.status === 'invited' ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={busyId === row.id}
                        onClick={() => revokeInvite(row)}
                        aria-label="Revoke invite"
                        title="Revoke invite"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </>
                ) : null}

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={busyId === row.id}
                  onClick={() => toggleDisabled(row)}
                  aria-label={row.disabled ? 'Enable access' : 'Disable access'}
                  title={row.disabled ? 'Enable access' : 'Disable access'}
                  className={row.disabled ? '' : 'text-destructive hover:text-destructive'}
                >
                  <ShieldOff className="h-4 w-4" />
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
