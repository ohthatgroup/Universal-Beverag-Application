'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { StatusDot } from '@/components/ui/status-dot'
import type { OrderStatus } from '@/lib/types'

function formatShortDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function toStatus(value: string | null): OrderStatus | null {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') return value
  return null
}

function statusLabel(status: OrderStatus | null): string | null {
  if (!status) return null
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatOrderMeta(date: string | null, status: OrderStatus | null): string | null {
  if (!date) return null
  const datePart = formatShortDate(date)
  const label = statusLabel(status)
  return label ? `${datePart} · ${label}` : datePart
}

export interface CustomerIndexRow {
  id: string
  businessName: string
  email: string | null
  phone: string | null
  lastOrderDate: string | null
  lastOrderStatus: string | null
}

interface CustomersSearchIndexProps {
  rows: CustomerIndexRow[]
  recentIds?: string[]
}

export function CustomersSearchIndex({ rows, recentIds = [] }: CustomersSearchIndexProps) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()

  const recents = useMemo(() => {
    if (!recentIds.length) return rows.slice(0, 4)
    const byId = new Map(rows.map((r) => [r.id, r]))
    return recentIds.map((id) => byId.get(id)).filter(Boolean).slice(0, 5) as CustomerIndexRow[]
  }, [rows, recentIds])

  const results = useMemo(() => {
    if (!term) return []
    return rows.filter((r) =>
      [r.businessName, r.email, r.phone]
        .map((v) => (v ?? '').toLowerCase())
        .some((v) => v.includes(term))
    ).slice(0, 25)
  }, [rows, term])

  const grouped = useMemo(() => {
    const groups = new Map<string, CustomerIndexRow[]>()
    const sorted = [...rows].sort((a, b) => a.businessName.localeCompare(b.businessName))
    for (const r of sorted) {
      const firstChar = (r.businessName || '').trim().charAt(0).toUpperCase()
      const key = /[A-Z]/.test(firstChar) ? firstChar : '#'
      const arr = groups.get(key) ?? []
      arr.push(r)
      groups.set(key, arr)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [rows])

  return (
    <div className="mx-auto w-full max-w-xl pt-6 md:pt-10">
      <div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a customer"
            autoFocus
            className="h-14 w-full rounded-2xl border bg-card/80 pl-12 pr-12 text-base shadow-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!term && recents.length > 0 && (
          <div className="mt-6">
            <div className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recently opened
            </div>
            <ul className="mt-1">
              {recents.map((r) => {
                const status = toStatus(r.lastOrderStatus)
                const meta = formatOrderMeta(r.lastOrderDate, status)
                return (
                  <li key={r.id}>
                    <Link
                      href={`/admin/customers/${r.id}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60"
                    >
                      {status ? <StatusDot status={status} /> : <span className="h-2 w-2 shrink-0" aria-hidden />}
                      <span className="font-medium">{r.businessName}</span>
                      {meta && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {meta}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {!term && grouped.length > 0 && (
          <div className="mt-8">
            <div className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              All customers
            </div>
            <div className="mt-2 space-y-4">
              {grouped.map(([letter, list]) => (
                <section key={letter}>
                  <div className="sticky top-12 z-10 bg-background/95 px-2 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
                    {letter}
                  </div>
                  <ul>
                    {list.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/admin/customers/${r.id}`}
                          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted/60"
                        >
                          <span className="text-sm font-medium">{r.businessName}</span>
                          {r.email && (
                            <span className="truncate text-xs text-muted-foreground">
                              {r.email}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        )}

        {term && (
          <ul className="mt-4 divide-y">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matches for &ldquo;{query}&rdquo;
              </li>
            )}
            {results.map((r) => {
              const status = toStatus(r.lastOrderStatus)
              const meta = formatOrderMeta(r.lastOrderDate, status)
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/customers/${r.id}`}
                    className="flex items-start gap-3 px-3 py-3 hover:bg-muted/60"
                  >
                    {status ? <StatusDot status={status} className="mt-1.5" /> : <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium">{r.businessName}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.email ?? r.phone ?? '—'}
                        {meta && ` · ${meta}`}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
