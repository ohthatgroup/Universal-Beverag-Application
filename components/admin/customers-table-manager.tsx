'use client'

import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { CopyUrlButton } from '@/components/admin/copy-url-button'
import { Button } from '@/components/ui/button'
import { isInteractiveRowTarget } from '@/lib/row-navigation'
import { formatDeliveryDate } from '@/lib/utils'

export interface CustomerListRow {
  id: string
  businessName: string
  email: string | null
  phone: string | null
  lastOrderDate: string | null
  portalUrl: string | null
}

interface CustomersTableManagerProps {
  rows: CustomerListRow[]
}

export function CustomersTableManager({ rows: initialRows }: CustomersTableManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState<CustomerListRow[]>(initialRows)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows(initialRows)
    setSelectedIds(new Set())
  }, [initialRows])

  const selectedCount = selectedIds.size
  const allSelected = rows.length > 0 && selectedCount === rows.length

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(rows.map((row) => row.id)))
  }

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (busy || ids.length === 0) return

    const confirmed = window.confirm(`Delete ${ids.length} selected customer(s)?`)
    if (!confirmed) return

    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/customers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to delete selected customers')
      }

      setRows((prev) => prev.filter((row) => !selectedIds.has(row.id)))
      setSelectedIds(new Set())
      router.refresh()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Failed to delete selected customers'
      )
    } finally {
      setBusy(false)
    }
  }

  const onRowClick = (event: MouseEvent<HTMLElement>, id: string) => {
    if (isInteractiveRowTarget(event.target)) return
    router.push(`/admin/customers/${id}`)
  }

  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (isInteractiveRowTarget(event.target)) return
    event.preventDefault()
    router.push(`/admin/customers/${id}`)
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No customers found.</p>
  }

  return (
    <div className="space-y-3">
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={deleteSelected}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-0 md:hidden">
        {rows.map((row) => {
          const checked = selectedIds.has(row.id)
          return (
            <div
              key={row.id}
              className={`border-b py-3 last:border-0 ${checked ? 'bg-muted/30' : ''}`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={checked}
                  onChange={(event) => toggleSelected(row.id, event.target.checked)}
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => router.push(`/admin/customers/${row.id}`)}
                  >
                    <div className="truncate text-sm font-medium">{row.businessName}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.email ?? 'No email'}
                      {row.phone && ` - ${row.phone}`}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.lastOrderDate ? formatDeliveryDate(row.lastOrderDate) : 'No orders'}
                    </div>
                  </button>
                  {row.portalUrl ? (
                    <div className="mt-2">
                      <CopyUrlButton url={row.portalUrl} label="Copy URL" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-2 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                  disabled={busy}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium">Business Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Last Order</th>
              <th className="px-4 py-3 text-right font-medium">Portal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const checked = selectedIds.has(row.id)
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-b last:border-0 hover:bg-muted/30 ${checked ? 'bg-muted/30' : ''}`}
                  onClick={(event) => onRowClick(event, row.id)}
                  onKeyDown={(event) => onRowKeyDown(event, row.id)}
                  tabIndex={0}
                  role="button"
                >
                  <td className="px-2 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => toggleSelected(row.id, event.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{row.businessName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.email ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.phone ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.lastOrderDate ? formatDeliveryDate(row.lastOrderDate) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.portalUrl ? <CopyUrlButton url={row.portalUrl} label="Copy URL" /> : <span className="text-muted-foreground">-</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
