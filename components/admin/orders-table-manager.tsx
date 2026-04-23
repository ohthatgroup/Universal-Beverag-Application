'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type ReactNode } from 'react'
import { Download, Link2, Mail, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { AdminFab } from '@/components/admin/admin-fab'
import { ListToolbar } from '@/components/admin/list-toolbar'
import { RowCheckbox } from '@/components/admin/row-actions'
import { Button } from '@/components/ui/button'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { StatusFilterChip } from '@/components/ui/status-filter-chip'
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

interface OrdersTableManagerProps {
  orders: OrderRow[]
  customers: Customer[]
  searchQuery: string
  selectedStatus: OrderStatus | 'all'
  basePath: string
  search?: ReactNode
}

function asOrderStatus(value: string): OrderStatus {
  if (value === 'draft' || value === 'submitted' || value === 'delivered') return value
  return 'draft'
}

export function OrdersTableManager({
  orders,
  customers,
  searchQuery,
  selectedStatus,
  basePath,
  search,
}: OrdersTableManagerProps) {
  const router = useRouter()
  const [editMode, setEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null)
  const [rowActionError, setRowActionError] = useState<string | null>(null)

  // Draft dialog state
  const [draftDialogOpen, setDraftDialogOpen] = useState(false)
  const [newCustomerMode, setNewCustomerMode] = useState(false)
  const [newBizName, setNewBizName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [draftDeliveryDate, setDraftDeliveryDate] = useState(todayISODate())
  const [isCreating, setIsCreating] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const customerById = useMemo(
    () =>
      new Map(
        customers.map((customer) => [
          customer.id,
          customer.business_name || customer.contact_name || customer.email || customer.id,
        ])
      ),
    [customers]
  )

  const tokenByCustomerId = useMemo(
    () => new Map(customers.map((c) => [c.id, c.access_token ?? null] as const)),
    [customers]
  )

  const filteredOrders = useMemo(() => {
    const term = searchQuery.trim().toLowerCase()
    return orders.filter((order) => {
      if (selectedStatus !== 'all' && order.status !== selectedStatus) return false
      if (term) {
        const customerLabel = ((order.customer_id ? customerById.get(order.customer_id) : null) ?? '').toLowerCase()
        if (!customerLabel.includes(term)) return false
      }
      return true
    })
  }, [orders, selectedStatus, searchQuery, customerById])

  const dateGroups = useMemo(() => {
    const map = new Map<string, OrderRow[]>()
    for (const order of filteredOrders) {
      const bucket = map.get(order.delivery_date)
      if (bucket) bucket.push(order)
      else map.set(order.delivery_date, [order])
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a < b ? 1 : a > b ? -1 : 0
    )
  }, [filteredOrders])

  const visibleOrderIds = filteredOrders.map((o) => o.id)
  const selectedCount = selectedIds.size
  const allVisibleSelected =
    visibleOrderIds.length > 0 && visibleOrderIds.every((id) => selectedIds.has(id))

  const orderDetailHref = (orderId: string) =>
    `/admin/orders/${orderId}?returnTo=${encodeURIComponent(basePath)}`

  const buildStatusHref = (next: OrderStatus | undefined) => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (next) params.set('status', next)
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  const statusTabs: Array<{ label: string; value: OrderStatus }> = [
    { label: 'Drafts', value: 'draft' },
    { label: 'Needs review', value: 'submitted' },
    { label: 'Delivered', value: 'delivered' },
  ]

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAllVisible = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(visibleOrderIds))
  }

  const applyBulkAction = async (
    action: 'delete' | 'set_status',
    status?: OrderStatus
  ) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setBulkError(null)
    setBusy(true)
    try {
      const response = await fetch('/api/admin/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'delete' ? { action, ids } : { action, ids, status }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to apply bulk action')
      }
      setSelectedIds(new Set())
      router.refresh()
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to apply bulk action')
    } finally {
      setBusy(false)
    }
  }

  const copyPortalLink = (orderId: string, customerToken: string | null) => {
    setRowActionError(null)
    const path = buildCustomerOrderDeepLink(customerToken, orderId)
    if (!path) {
      setRowActionError('Customer has no portal token')
      return
    }
    const url = `${window.location.origin}${path}`
    void navigator.clipboard.writeText(url)
  }

  const deleteSingleOrder = async (orderId: string) => {
    setRowActionError(null)
    setBusy(true)
    try {
      const response = await fetch('/api/admin/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: [orderId] }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to delete order')
      }
      router.refresh()
    } catch (err) {
      setRowActionError(err instanceof Error ? err.message : 'Failed to delete order')
    } finally {
      setBusy(false)
    }
  }

  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

  const handleCreateDraft = async () => {
    if (!draftDeliveryDate || !isoDateRegex.test(draftDeliveryDate)) return
    setIsCreating(true)
    setDraftError(null)

    try {
      let customerId = selectedCustomerId

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

  const openDraftDialog = () => {
    setDraftError(null)
    setNewCustomerMode(false)
    setSelectedCustomerId('')
    setNewBizName('')
    setNewEmail('')
    setDraftDeliveryDate(todayISODate())
    setDraftDialogOpen(true)
  }

  return (
    <div className="space-y-3">
      <ListToolbar
        search={search}
        editMode={editMode}
        onEditModeChange={(next) => {
          setEditMode(next)
          if (!next) setSelectedIds(new Set())
        }}
        editTitle={editMode ? 'Exit edit mode' : 'Edit: show checkboxes'}
        onAdd={openDraftDialog}
        addLabel="New draft order"
      />

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => {
          const isActive = selectedStatus === tab.value
          return (
            <StatusFilterChip
              key={tab.value}
              status={tab.value}
              label={tab.label}
              active={isActive}
              href={buildStatusHref(isActive ? undefined : tab.value)}
            />
          )
        })}
      </div>

      {editMode && selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => applyBulkAction('set_status', 'draft')}
          >
            Mark Draft
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => applyBulkAction('set_status', 'submitted')}
          >
            Mark Submitted
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => applyBulkAction('set_status', 'delivered')}
          >
            Mark Delivered
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {bulkError && <p className="text-sm text-destructive">{bulkError}</p>}

      <ConfirmSheet
        open={confirmDeleteOpen}
        onOpenChange={(next) => {
          if (!busy) setConfirmDeleteOpen(next)
        }}
        title={`Delete ${selectedCount} order${selectedCount === 1 ? '' : 's'}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={busy}
        destructive
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          void applyBulkAction('delete')
        }}
      />

      <ConfirmSheet
        open={confirmDeleteOrderId !== null}
        onOpenChange={(next) => {
          if (!busy && !next) setConfirmDeleteOrderId(null)
        }}
        title="Delete this order?"
        description="This can't be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={busy}
        destructive
        onConfirm={() => {
          const id = confirmDeleteOrderId
          setConfirmDeleteOrderId(null)
          if (id) void deleteSingleOrder(id)
        }}
      />

      {rowActionError && <p className="text-sm text-destructive">{rowActionError}</p>}

      {dateGroups.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matches' : 'No orders yet'}
          description={
            searchQuery
              ? `Nothing matched "${searchQuery}".`
              : 'Create a draft order to get started.'
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Mobile cards grouped by date */}
          <div className="space-y-6 md:hidden">
            {dateGroups.map(([deliveryDate, dateOrders]) => (
              <section key={deliveryDate} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {formatDeliveryDate(deliveryDate)}
                </h3>
                <ul className="divide-y rounded-xl border bg-card">
                  {dateOrders.map((order) => {
                    const status = asOrderStatus(order.status)
                    const checked = selectedIds.has(order.id)
                    return (
                      <li key={order.id}>
                        <div className={`flex items-center gap-3 px-4 py-3 ${checked ? 'bg-muted/30' : ''}`}>
                          {editMode && (
                            <RowCheckbox
                              label={`Select order ${order.id}`}
                              checked={checked}
                              onChange={(e) => toggleSelected(order.id, e.target.checked)}
                            />
                          )}
                          <Link
                            href={orderDetailHref(order.id)}
                            className="flex flex-1 items-center gap-3"
                          >
                            <OrderStatusDot status={status} />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">
                                {(order.customer_id ? customerById.get(order.customer_id) : null) ?? 'Unknown customer'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {order.item_count ?? 0} items · {formatCurrency(order.total ?? 0)}
                              </div>
                            </div>
                          </Link>
                          <OrderRowActions
                            orderId={order.id}
                            customerToken={order.customer_id ? tokenByCustomerId.get(order.customer_id) ?? null : null}
                            onCopyLink={copyPortalLink}
                            onRequestDelete={setConfirmDeleteOrderId}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {editMode && (
                    <th className="w-10 px-2 py-3 text-left">
                      <RowCheckbox
                        label="Select all visible orders"
                        checked={allVisibleSelected}
                        onChange={(e) => toggleAllVisible(e.target.checked)}
                      />
                    </th>
                  )}
                  <th className="w-6 px-2 py-3" aria-label="Status" />
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Delivery date</th>
                  <th className="px-4 py-3 text-right font-medium">Items</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="w-10 px-2 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const checked = selectedIds.has(order.id)
                  const status = asOrderStatus(order.status)
                  return (
                    <tr
                      key={order.id}
                      className={`cursor-pointer border-b last:border-0 hover:bg-muted/30 ${checked ? 'bg-muted/30' : ''}`}
                      onClick={(event) => {
                        if (isInteractiveRowTarget(event.target)) return
                        router.push(orderDetailHref(order.id))
                      }}
                    >
                      {editMode && (
                        <td className="px-2 py-3">
                          <RowCheckbox
                            label={`Select order ${order.id}`}
                            checked={checked}
                            onChange={(e) => toggleSelected(order.id, e.target.checked)}
                          />
                        </td>
                      )}
                      <td className="px-2 py-3">
                        <OrderStatusDot status={status} />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {(order.customer_id ? customerById.get(order.customer_id) : null) ?? 'Unknown customer'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDeliveryDate(order.delivery_date)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                        {order.item_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(order.total ?? 0)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <OrderRowActions
                          orderId={order.id}
                          customerToken={order.customer_id ? tokenByCustomerId.get(order.customer_id) ?? null : null}
                          onCopyLink={copyPortalLink}
                          onRequestDelete={setConfirmDeleteOrderId}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminFab icon={<Plus className="h-6 w-6" />} label="New draft order" onClick={openDraftDialog} />

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
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={!newCustomerMode ? 'default' : 'outline'}
                onClick={() => { setDraftError(null); setNewCustomerMode(false) }}
              >
                Existing customer
              </Button>
              <Button
                size="sm"
                variant={newCustomerMode ? 'default' : 'outline'}
                onClick={() => { setDraftError(null); setNewCustomerMode(true) }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New customer
              </Button>
            </div>

            {newCustomerMode ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="dlg-biz-name">Business name</Label>
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
              <Label htmlFor="dlg-delivery-date">Delivery date</Label>
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
                onClick={handleCreateDraft}
                disabled={
                  isCreating ||
                  (!newCustomerMode && !selectedCustomerId) ||
                  (newCustomerMode && (!newBizName.trim() || !newEmail.trim()))
                }
              >
                {isCreating ? 'Creating...' : 'Create draft'}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setDraftDialogOpen(false); setDraftError(null) }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OrderRowActions({
  orderId,
  customerToken,
  onCopyLink,
  onRequestDelete,
}: {
  orderId: string
  customerToken: string | null
  onCopyLink: (orderId: string, customerToken: string | null) => void
  onRequestDelete: (orderId: string) => void
}) {
  const canCopy = Boolean(customerToken)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Order actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild>
          <a href={`/api/orders/${orderId}/csv`} onClick={(e) => e.stopPropagation()}>
            <Download className="h-4 w-4" />
            Download CSV
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canCopy}
          onSelect={() => onCopyLink(orderId, customerToken)}
        >
          <Link2 className="h-4 w-4" />
          Copy Portal link
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="justify-between">
          <span className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Share Order With Office
          </span>
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
            Soon
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => onRequestDelete(orderId)}
        >
          <Trash2 className="h-4 w-4" />
          Delete Order
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
