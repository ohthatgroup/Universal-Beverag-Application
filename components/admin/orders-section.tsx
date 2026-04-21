'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { Copy, Download, ExternalLink, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import { isInteractiveRowTarget } from '@/lib/row-navigation'
import { formatCurrency, formatDeliveryDate, todayISODate } from '@/lib/utils'
import { StatusDot } from '@/components/ui/status-dot'
import { StatusFilterChip } from '@/components/ui/status-filter-chip'
import type { OrderStatus } from '@/lib/types'

interface Customer {
  id: string
  business_name: string | null
  contact_name: string | null
  email: string | null
  access_token: string | null
}

interface OrderRow {
  id: string
  customer_id: string | null
  delivery_date: string
  item_count: number | null
  total: number | null
  status: string
  created_at: string
}

interface OrdersSectionProps {
  orders: OrderRow[]
  customers: Customer[]
  basePath: string
}

function asOrderStatus(value: string): OrderStatus {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'draft'
}

function normalizeStatus(value: string | null): OrderStatus | 'all' {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') {
    return value
  }
  return 'all'
}

function DeepLinkButton({ orderId, customerToken }: { orderId: string; customerToken: string | null }) {
  const [copied, setCopied] = useState(false)
  const canCopy = Boolean(customerToken)

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const path = buildCustomerOrderDeepLink(customerToken, orderId)
    if (!path) {
      return
    }
    const url = `${window.location.origin}${path}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0"
      title={canCopy ? 'Copy customer portal order link' : 'Customer has no portal token'}
      disabled={!canCopy}
      onClick={handleCopy}
    >
      {copied ? (
        <Copy className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <ExternalLink className={`h-3.5 w-3.5 ${canCopy ? '' : 'text-muted-foreground'}`} />
      )}
    </Button>
  )
}

export function OrdersSection({ orders, customers, basePath }: OrdersSectionProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Live search state
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') ?? '')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [isBulkApplying, setIsBulkApplying] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  // New Draft Order dialog state
  const [draftDialogOpen, setDraftDialogOpen] = useState(false)
  const [newCustomerMode, setNewCustomerMode] = useState(false)
  const [newBizName, setNewBizName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [draftDeliveryDate, setDraftDeliveryDate] = useState(todayISODate())
  const [isCreating, setIsCreating] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
  const selectedStatus = normalizeStatus(searchParams.get('status'))
  const selectedDeliveryDateParam = searchParams.get('deliveryDate') ?? ''
  const selectedDeliveryDate =
    selectedDeliveryDateParam && isoDateRegex.test(selectedDeliveryDateParam) ? selectedDeliveryDateParam : ''
  const returnTo = (() => {
    const qs = searchParams.toString()
    return qs ? `${pathname}?${qs}` : pathname
  })()
  const orderDetailHref = (orderId: string) =>
    `/admin/orders/${orderId}?returnTo=${encodeURIComponent(returnTo)}`

  const customerById = new Map(
    customers.map((customer) => [
      customer.id,
      customer.business_name || customer.contact_name || customer.email || customer.id,
    ])
  )
  const tokenByCustomerId = new Map(
    customers.map((customer) => [customer.id, customer.access_token ?? null] as const)
  )

  const searchTerm = localSearch.toLowerCase().trim()
  const filteredOrders = orders.filter((order) => {
    if (selectedStatus !== 'all' && order.status !== selectedStatus) return false
    if (selectedDeliveryDate && order.delivery_date !== selectedDeliveryDate) return false
    if (searchTerm) {
      const customerLabel = ((order.customer_id ? customerById.get(order.customer_id) : null) ?? '').toLowerCase()
      if (!customerLabel.includes(searchTerm)) return false
    }
    return true
  })

  const visibleOrderIds = filteredOrders.map((order) => order.id)
  const selectedOrderCount = selectedOrderIds.size
  const allVisibleSelected =
    visibleOrderIds.length > 0 && visibleOrderIds.every((id) => selectedOrderIds.has(id))

  const ordersByDate = new Map<string, typeof filteredOrders>()
  for (const order of filteredOrders) {
    const bucket = ordersByDate.get(order.delivery_date)
    if (bucket) {
      bucket.push(order)
    } else {
      ordersByDate.set(order.delivery_date, [order])
    }
  }

  const dateGroups = Array.from(ordersByDate.entries()).sort(([left], [right]) =>
    left < right ? 1 : left > right ? -1 : 0
  )

  const statusTabs: Array<{ label: string; value: OrderStatus }> = [
    { label: 'Drafts', value: 'draft' },
    { label: 'Needs review', value: 'submitted' },
    { label: 'Delivered', value: 'delivered' },
  ]

  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      deliveryDate: selectedDeliveryDate || undefined,
      ...overrides,
    }
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value)
    }
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      router.push(buildQuery({ q: value.trim() || undefined }), { scroll: false })
    }, 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, basePath, selectedDeliveryDate])

  const handleCreateDraft = async () => {
    if (!draftDeliveryDate || !isoDateRegex.test(draftDeliveryDate)) return
    setIsCreating(true)
    setDraftError(null)

    try {
      let customerId = selectedCustomerId

      // Create new customer if in new customer mode
      if (newCustomerMode) {
        if (!newBizName.trim()) {
          setDraftError('Business name is required')
          setIsCreating(false)
          return
        }
        if (!newEmail.trim()) {
          setDraftError('Email is required to provision a customer portal access link')
          setIsCreating(false)
          return
        }
        const createResp = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName: newBizName.trim(), email: newEmail.trim() }),
        })
        const createPayload = (await createResp.json().catch(() => null)) as
          | { data?: { id?: string }; error?: { message?: string } }
          | null
        if (!createResp.ok) {
          setDraftError(createPayload?.error?.message ?? 'Failed to create customer')
          setIsCreating(false)
          return
        }
        customerId = createPayload?.data?.id ?? ''
      }

      if (!customerId) {
        setDraftError('Select a customer before creating a draft')
        setIsCreating(false)
        return
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, deliveryDate: draftDeliveryDate }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { data?: { order?: { id?: string } }; error?: { message?: string } }
        | null

      if (response.ok) {
        const orderId = payload?.data?.order?.id
        if (orderId) {
          setDraftDialogOpen(false)
          router.push(orderDetailHref(orderId))
          return
        }
      }
      setDraftError(payload?.error?.message ?? 'Failed to create draft order')
    } finally {
      setIsCreating(false)
    }
  }

  const toggleSelectOrder = (orderId: string, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(orderId)
      else next.delete(orderId)
      return next
    })
  }

  const toggleSelectAllVisible = (checked: boolean) => {
    if (!checked) {
      setSelectedOrderIds(new Set())
      return
    }
    setSelectedOrderIds(new Set(visibleOrderIds))
  }

  const applyBulkAction = async (
    action: 'delete' | 'set_status',
    status?: OrderStatus
  ) => {
    const ids = Array.from(selectedOrderIds)
    if (ids.length === 0) return

    if (action === 'delete') {
      const confirmed = window.confirm(`Delete ${ids.length} selected order(s)?`)
      if (!confirmed) return
    }

    setBulkError(null)
    setIsBulkApplying(true)
    try {
      const response = await fetch('/api/admin/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'delete' ? { action, ids } : { action, ids, status }
        ),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to apply bulk action')
      }

      setSelectedOrderIds(new Set())
      router.refresh()
    } catch (bulkApplyError) {
      setBulkError(
        bulkApplyError instanceof Error
          ? bulkApplyError.message
          : 'Failed to apply bulk action'
      )
    } finally {
      setIsBulkApplying(false)
    }
  }

  return (
    <section className="space-y-4">
      {/* FAB: primary action in the thumb zone */}
      <button
        type="button"
        aria-label="New order"
        onClick={() => { setDraftDialogOpen(true); setDraftError(null); setNewCustomerMode(false); setSelectedCustomerId(''); setNewBizName(''); setNewEmail('') }}
        className="fixed bottom-6 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg backdrop-blur transition-transform hover:scale-105 md:bottom-8"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Filter row */}
      <div className="space-y-2 sm:flex sm:items-center sm:gap-2 sm:space-y-0">
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by customer..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>
      </div>

      {/* Status filter chips — click active chip to clear */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => {
          const isActive = selectedStatus === tab.value
          return (
            <StatusFilterChip
              key={tab.value}
              status={tab.value}
              label={tab.label}
              active={isActive}
              href={buildQuery({ status: isActive ? undefined : tab.value })}
            />
          )
        })}
      </div>

      {selectedOrderCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <span className="text-sm text-muted-foreground">{selectedOrderCount} selected</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isBulkApplying}
            onClick={() => applyBulkAction('set_status', 'draft')}
          >
            Mark Draft
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isBulkApplying}
            onClick={() => applyBulkAction('set_status', 'submitted')}
          >
            Mark Submitted
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isBulkApplying}
            onClick={() => applyBulkAction('set_status', 'delivered')}
          >
            Mark Delivered
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isBulkApplying}
            onClick={() => applyBulkAction('delete')}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedOrderIds(new Set())}>
            Clear
          </Button>
        </div>
      )}
      {bulkError && <p className="text-sm text-destructive">{bulkError}</p>}

      {/* Orders grouped by date */}
      {dateGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders found.</p>
      ) : (
        <div className="space-y-6">
          {/* Mobile cards — grouped by date */}
          <div className="space-y-6 md:hidden">
            {dateGroups.map(([deliveryDate, dateOrders]) => (
              <section key={deliveryDate} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {formatDeliveryDate(deliveryDate)}
                </h3>
                <ul className="divide-y rounded-xl border bg-card">
                  {dateOrders.map((order) => {
                    const status = asOrderStatus(order.status)
                    return (
                      <li key={order.id}>
                        <Link
                          href={orderDetailHref(order.id)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                        >
                          <StatusDot status={status} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {(order.customer_id ? customerById.get(order.customer_id) : null) ?? 'Unknown customer'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.item_count ?? 0} items · {formatCurrency(order.total ?? 0)}
                            </div>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>

          {/* Desktop table — single header, date separators between groups */}
          <div className="hidden md:block rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-8 px-2 py-3 text-left" aria-label="Status" />
                  <th className="w-10 px-2 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) => toggleSelectAllVisible(event.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-right font-medium">Items</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              {dateGroups.map(([deliveryDate, dateOrders]) => (
                <tbody key={deliveryDate}>
                  <tr className="border-b bg-muted/20">
                    <td
                      colSpan={6}
                      className="px-4 py-2 text-xs font-medium text-muted-foreground"
                    >
                      {formatDeliveryDate(deliveryDate)}
                    </td>
                  </tr>
                  {dateOrders.map((order) => {
                    const checked = selectedOrderIds.has(order.id)
                    const status = asOrderStatus(order.status)
                    return (
                      <tr
                        key={order.id}
                        className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer ${checked ? 'bg-muted/30' : ''}`}
                        onClick={(event) => {
                          if (isInteractiveRowTarget(event.target)) return
                          router.push(orderDetailHref(order.id))
                        }}
                      >
                        <td className="px-2 py-3">
                          <StatusDot status={status} />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => toggleSelectOrder(order.id, event.target.checked)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">
                            {(order.customer_id ? customerById.get(order.customer_id) : null) ?? 'Unknown customer'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{order.item_count ?? 0}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(order.total ?? 0)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="Download CSV">
                              <a href={`/api/orders/${order.id}/csv`} onClick={(e) => e.stopPropagation()}>
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <DeepLinkButton
                              orderId={order.id}
                              customerToken={order.customer_id ? tokenByCustomerId.get(order.customer_id) ?? null : null}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              ))}
            </table>
          </div>
        </div>
      )}

      {/* New Draft Order dialog */}
      <Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Draft Order</DialogTitle>
            <DialogDescription>
              Create a draft for an existing customer or create a new customer inline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Toggle: existing customer vs new customer */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={!newCustomerMode ? 'default' : 'outline'}
                onClick={() => { setDraftError(null); setNewCustomerMode(false) }}
              >
                Existing Customer
              </Button>
              <Button
                size="sm"
                variant={newCustomerMode ? 'default' : 'outline'}
                onClick={() => { setDraftError(null); setNewCustomerMode(true) }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New Customer
              </Button>
            </div>

            {newCustomerMode ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="dlg-biz-name">Business Name</Label>
                  <Input
                    id="dlg-biz-name"
                    placeholder="Acme Beverages"
                    value={newBizName}
                    onChange={(e) => setNewBizName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dlg-email">Email</Label>
                  <Input
                    id="dlg-email"
                    type="email"
                    placeholder="owner@acme.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="dlg-customer">Customer</Label>
                <select
                  id="dlg-customer"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.business_name || customer.contact_name || customer.email || customer.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dlg-delivery-date">Delivery Date</Label>
              <Input
                id="dlg-delivery-date"
                type="date"
                value={draftDeliveryDate}
                onChange={(e) => setDraftDeliveryDate(e.target.value)}
                required
              />
            </div>

            {draftError ? <p className="text-sm text-destructive">{draftError}</p> : null}

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                onClick={handleCreateDraft}
                disabled={isCreating || (!newCustomerMode && !selectedCustomerId) || (newCustomerMode && (!newBizName.trim() || !newEmail.trim()))}
              >
                {isCreating ? 'Creating...' : 'Create Draft'}
              </Button>
              <Button variant="outline" onClick={() => { setDraftDialogOpen(false); setDraftError(null) }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
