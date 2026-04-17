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

function formatInviteDate(value: string | null) {
  if (!value) return '-'
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
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

      <div className="space-y-0 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="border-b py-3 last:border-0">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{row.displayName}</div>
                  <div className="text-xs text-muted-foreground">{row.email ?? 'No email'}</div>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium capitalize">
                  {row.status}
                </span>
              </div>

              <div className="text-xs text-muted-foreground">
                Last invite sent: {formatInviteDate(row.lastInviteSentAt)}
              </div>

              <div className="flex flex-wrap gap-2">
                {row.inviteUrl ? <CopyUrlButton url={row.inviteUrl} label="Copy Invite" /> : null}
                {!row.disabled ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => sendInvite(row)}
                    >
                      <Mail className="mr-1.5 h-3.5 w-3.5" />
                      {row.status === 'invited' ? 'Resend' : 'Send Invite'}
                    </Button>
                    {row.status === 'invited' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => revokeInvite(row)}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    ) : null}
                  </>
                ) : null}
                <Button
                  size="sm"
                  variant={row.disabled ? 'outline' : 'destructive'}
                  disabled={busyId === row.id}
                  onClick={() => toggleDisabled(row)}
                >
                  <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                  {row.disabled ? 'Enable' : 'Disable'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Last Invite</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{row.displayName}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.email ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border px-2 py-0.5 text-xs font-medium capitalize">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatInviteDate(row.lastInviteSentAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {row.inviteUrl ? <CopyUrlButton url={row.inviteUrl} label="Copy Invite" /> : null}
                    {!row.disabled ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => sendInvite(row)}
                        >
                          <Mail className="mr-1.5 h-3.5 w-3.5" />
                          {row.status === 'invited' ? 'Resend' : 'Send Invite'}
                        </Button>
                        {row.status === 'invited' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === row.id}
                            onClick={() => revokeInvite(row)}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Revoke
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                    <Button
                      size="sm"
                      variant={row.disabled ? 'outline' : 'destructive'}
                      disabled={busyId === row.id}
                      onClick={() => toggleDisabled(row)}
                    >
                      <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                      {row.disabled ? 'Enable' : 'Disable'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
