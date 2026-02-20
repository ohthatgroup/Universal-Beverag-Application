'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { Copy, Download, ExternalLink, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import { isInteractiveRowTarget } from '@/lib/row-navigation'
import { formatCurrency, formatDeliveryDate, todayISODate } from '@/lib/utils'
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

const STATUS_VARIANT_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border border-border',
  submitted: 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  delivered: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
}

function StatusPill({ status, orderId }: { status: OrderStatus; orderId: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = async (newStatus: string) => {
    setIsSaving(true)
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      router.refresh()
    } finally {
      setIsSaving(false)
      setIsOpen(false)
    }
  }

  return (
    <Select open={isOpen} onOpenChange={setIsOpen} value={status} onValueChange={handleChange}>
      <SelectTrigger
        className={`h-7 w-auto min-w-0 gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border-0 focus:ring-0 focus:ring-offset-0 ${STATUS_VARIANT_CLASSES[status]} ${isSaving ? 'opacity-60' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="submitted">Submitted</SelectItem>
        <SelectItem value="delivered">Delivered</SelectItem>
      </SelectContent>
    </Select>
  )
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

  const statusTabs: Array<{ label: string; value: 'all' | OrderStatus }> = [
    { label: 'All', value: 'all' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Drafts', value: 'draft' },
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

    try {
      let customerId = selectedCustomerId

      // Create new customer if in new customer mode
      if (newCustomerMode) {
        if (!newBizName.trim()) { setIsCreating(false); return }
        const createResp = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName: newBizName.trim(), email: newEmail.trim() || null }),
        })
        if (createResp.ok) {
          const payload = await createResp.json()
          customerId = payload?.data?.id ?? ''
        }
      }

      if (!customerId) { setIsCreating(false); return }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, deliveryDate: draftDeliveryDate }),
      })

      if (response.ok) {
        const payload = await response.json()
        const orderId = payload?.data?.order?.id
        if (orderId) {
          setDraftDialogOpen(false)
          router.push(orderDetailHref(orderId))
          return
        }
      }
      router.refresh()
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
      <h2 className="text-lg font-semibold">Orders</h2>

      {/* Top controls: stacked by row on mobile */}
      <div className="space-y-2 sm:flex sm:items-center sm:gap-2 sm:space-y-0">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setDraftDialogOpen(true); setNewCustomerMode(false); setSelectedCustomerId(''); setNewBizName(''); setNewEmail('') }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Draft Order
          </Button>
        </div>
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

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Button
            key={tab.value}
            asChild
            size="sm"
            variant={selectedStatus === tab.value ? 'default' : 'outline'}
          >
            <Link href={buildQuery({ status: tab.value !== 'all' ? tab.value : undefined })}>
              {tab.label}
            </Link>
          </Button>
        ))}
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
          {dateGroups.map(([deliveryDate, dateOrders]) => (
            <section key={deliveryDate} className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {formatDeliveryDate(deliveryDate)}
              </h3>

              {/* Mobile cards */}
              <div className="space-y-0 md:hidden">
                {dateOrders.map((order) => {
                  const checked = selectedOrderIds.has(order.id)
                  return (
                    <div
                      key={order.id}
                      className={`border-b py-3 last:border-0 ${checked ? 'bg-muted/30' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={checked}
                          onChange={(event) => toggleSelectOrder(order.id, event.target.checked)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <Link href={orderDetailHref(order.id)} className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">
                                {(order.customer_id ? customerById.get(order.customer_id) : null) ?? 'Unknown customer'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {order.item_count ?? 0} items - {formatCurrency(order.total ?? 0)}
                              </div>
                            </Link>
                            <StatusPill status={asOrderStatus(order.status)} orderId={order.id} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                              <a href={`/api/orders/${order.id}/csv`}>
                                <Download className="mr-1 h-3 w-3" />
                                CSV
                              </a>
                            </Button>
                            <DeepLinkButton
                              orderId={order.id}
                              customerToken={order.customer_id ? tokenByCustomerId.get(order.customer_id) ?? null : null}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
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
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateOrders.map((order) => {
                      const checked = selectedOrderIds.has(order.id)
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
                          <StatusPill status={asOrderStatus(order.status)} orderId={order.id} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="Download CSV">
                              <a href={`/api/orders/${order.id}/csv`}>
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
                    )})}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
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
                onClick={() => setNewCustomerMode(false)}
              >
                Existing Customer
              </Button>
              <Button
                size="sm"
                variant={newCustomerMode ? 'default' : 'outline'}
                onClick={() => setNewCustomerMode(true)}
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
                  <Label htmlFor="dlg-email">Email (optional)</Label>
                  <Input
                    id="dlg-email"
                    type="email"
                    placeholder="owner@acme.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
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

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                onClick={handleCreateDraft}
                disabled={isCreating || (!newCustomerMode && !selectedCustomerId) || (newCustomerMode && !newBizName.trim())}
              >
                {isCreating ? 'Creating...' : 'Create Draft'}
              </Button>
              <Button variant="outline" onClick={() => setDraftDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
