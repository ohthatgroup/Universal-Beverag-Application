'use client'

import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { AdminFab } from '@/components/admin/admin-fab'
import { BulkActionBar } from '@/components/admin/bulk-action-bar'
import { ConfirmSheet } from '@/components/ui/confirm-sheet'
import { EmptyState } from '@/components/ui/empty-state'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { ListToolbar } from '@/components/admin/list-toolbar'
import { RowCheckbox, RowReorderArrows } from '@/components/admin/row-actions'
import { ProductStatusDot, type ProductLifecycle } from '@/components/ui/status-dot'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { moveSelectedRows } from '@/lib/reorder'
import { isInteractiveRowTarget } from '@/lib/row-navigation'
import { formatCurrency, PACK_UOM_OPTIONS } from '@/lib/utils'
import { cn } from '@/lib/utils'

function getLifecycle(row: { isDiscontinued: boolean }): ProductLifecycle {
  return row.isDiscontinued ? 'discontinued' : 'active'
}

const NEW_ROW_TINT = 'bg-blue-50/70'

export interface CatalogBrandOption {
  id: string
  name: string
}

export interface CatalogProductRow {
  id: string
  title: string
  brandName: string | null
  packLabel: string | null
  price: number
  isNew: boolean
  isDiscontinued: boolean
}

interface CatalogProductsManagerProps {
  products: CatalogProductRow[]
  brands: CatalogBrandOption[]
  searchQuery: string
  /** Optional search input rendered inside the toolbar row. */
  search?: React.ReactNode
}

const CREATE_NEW_BRAND_VALUE = '__create_new_brand__'
const CREATE_NEW_SIZE_UNIT_VALUE = '__create_new_size_unit__'

export function CatalogProductsManager({ products, brands, searchQuery, search }: CatalogProductsManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState<CatalogProductRow[]>(products)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createBrandValue, setCreateBrandValue] = useState('')
  const [createBrandName, setCreateBrandName] = useState('')
  const [createSizeUnitValue, setCreateSizeUnitValue] = useState('')
  const [createSizeUnitName, setCreateSizeUnitName] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const searchIsActive = searchQuery.trim().length > 0

  useEffect(() => {
    setRows(products)
    setSelectedIds(new Set())
  }, [products])

  const selectedCount = selectedIds.size
  const allSelected = rows.length > 0 && selectedCount === rows.length
  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.has(row.id)), [rows, selectedIds])

  const applyOrder = async (nextRows: CatalogProductRow[]) => {
    const previousRows = rows
    setRows(nextRows)
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder',
          orderedIds: nextRows.map((row) => row.id),
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to save order')
      }
      router.refresh()
    } catch (applyError) {
      setRows(previousRows)
      setError(applyError instanceof Error ? applyError.message : 'Failed to save order')
    } finally {
      setBusy(false)
    }
  }

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
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

  const moveRowBy = (id: string, mode: 'up' | 'down' | 'top' | 'bottom') => {
    if (busy || searchIsActive) return
    const singleton = new Set([id])
    let nextRows = rows
    if (mode === 'top') {
      nextRows = moveSelectedRows(rows, singleton, 'top', null)
    } else if (mode === 'bottom') {
      nextRows = moveSelectedRows(rows, singleton, 'bottom', null)
    } else {
      const index = rows.findIndex((r) => r.id === id)
      if (index < 0) return
      const swapWith = mode === 'up' ? index - 1 : index + 1
      if (swapWith < 0 || swapWith >= rows.length) return
      const copy = [...rows]
      ;[copy[index], copy[swapWith]] = [copy[swapWith], copy[index]]
      nextRows = copy
    }
    if (nextRows === rows) return
    void applyOrder(nextRows)
  }

  const requestDeleteSelected = () => {
    if (busy || selectedRows.length === 0) return
    setConfirmDeleteOpen(true)
  }

  const deleteSelected = async () => {
    if (busy || selectedRows.length === 0) return
    setBusy(true)
    setError(null)
    const ids = selectedRows.map((row) => row.id)
    try {
      const response = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          ids,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Failed to delete products')
      }
      setRows((prev) => prev.filter((row) => !ids.includes(row.id)))
      setSelectedIds(new Set())
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete products')
    } finally {
      setBusy(false)
    }
  }

  const onCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isCreating) return
    const formData = new FormData(event.currentTarget)

    setIsCreating(true)
    setError(null)
    try {
      let brandId: string | null = createBrandValue || null
      if (createBrandValue === CREATE_NEW_BRAND_VALUE) {
        const brandName = createBrandName.trim()
        if (!brandName) {
          throw new Error('New brand name is required')
        }

        const brandResponse = await fetch('/api/admin/brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: brandName, logoUrl: null }),
        })
        const brandPayload = (await brandResponse.json().catch(() => null)) as
          | { data?: { id?: string }; error?: { message?: string } }
          | null

        if (!brandResponse.ok || !brandPayload?.data?.id) {
          throw new Error(brandPayload?.error?.message ?? 'Failed to create brand')
        }

        brandId = brandPayload.data.id
      }

      const sizeUomValue =
        createSizeUnitValue === CREATE_NEW_SIZE_UNIT_VALUE
          ? createSizeUnitName.trim()
          : createSizeUnitValue.trim()

      if (createSizeUnitValue === CREATE_NEW_SIZE_UNIT_VALUE && !sizeUomValue) {
        throw new Error('New size unit is required')
      }

      const payload = {
        brandId,
        title: ((formData.get('title') as string) || '').trim(),
        packDetails: ((formData.get('pack_details') as string) || '').trim() || null,
        packCount: ((formData.get('pack_count') as string) || '').trim() || null,
        sizeValue: ((formData.get('size_value') as string) || '').trim() || null,
        sizeUom: sizeUomValue || null,
        price: ((formData.get('price') as string) || '').trim(),
        imageUrl: ((formData.get('image_url') as string) || '').trim() || null,
        isNew: formData.get('is_new') === 'on',
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        throw new Error(result?.error?.message ?? 'Failed to create product')
      }
      setShowCreateDialog(false)
      event.currentTarget.reset()
      setCreateBrandValue('')
      setCreateBrandName('')
      setCreateSizeUnitValue('')
      setCreateSizeUnitName('')
      router.refresh()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create product')
    } finally {
      setIsCreating(false)
    }
  }

  const onRowClick = (event: MouseEvent<HTMLElement>, id: string) => {
    if (isInteractiveRowTarget(event.target)) return
    router.push(`/admin/catalog/${id}`)
  }

  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (isInteractiveRowTarget(event.target)) return
    event.preventDefault()
    router.push(`/admin/catalog/${id}`)
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
        editTitle={editMode ? 'Exit edit mode' : 'Edit: show checkboxes + reorder arrows'}
        onAdd={() => setShowCreateDialog(true)}
        addLabel="New product"
      />

      <AdminFab
        icon={<Plus className="h-6 w-6" />}
        label="New product"
        onClick={() => setShowCreateDialog(true)}
      />

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] max-w-[42rem] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>New product</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreateProduct} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="create-brand-id">Brand</Label>
              <select
                id="create-brand-id"
                name="brand_id"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={createBrandValue}
                onChange={(event) => setCreateBrandValue(event.target.value)}
              >
                <option value="">No brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
                <option value={CREATE_NEW_BRAND_VALUE}>+ Create new brand</option>
              </select>
              {createBrandValue === CREATE_NEW_BRAND_VALUE && (
                <Input
                  className="mt-1"
                  placeholder="New brand name"
                  value={createBrandName}
                  onChange={(event) => setCreateBrandName(event.target.value)}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-title">Flavor / Details</Label>
              <Input id="create-title" name="title" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-pack-details">Pack details</Label>
              <Input id="create-pack-details" name="pack_details" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-pack-count">Pack count</Label>
              <Input id="create-pack-count" name="pack_count" type="number" min="1" step="1" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-size-value">Size value</Label>
              <Input id="create-size-value" name="size_value" type="number" min="0" step="0.001" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-size-uom">Size unit</Label>
              <select
                id="create-size-uom"
                name="size_uom"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={createSizeUnitValue}
                onChange={(event) => setCreateSizeUnitValue(event.target.value)}
              >
                <option value="">Select unit</option>
                {PACK_UOM_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
                <option value={CREATE_NEW_SIZE_UNIT_VALUE}>+ Create new size unit</option>
              </select>
              {createSizeUnitValue === CREATE_NEW_SIZE_UNIT_VALUE && (
                <Input
                  className="mt-1"
                  placeholder="Custom unit (e.g. CASE)"
                  value={createSizeUnitName}
                  onChange={(event) => setCreateSizeUnitName(event.target.value)}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-price">Price</Label>
              <Input id="create-price" name="price" type="number" min="0.01" step="0.01" required />
            </div>
            <ImageUploadField name="image_url" label="Image" folder="products" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_new" className="h-4 w-4" />
              Mark as new
            </label>
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {editMode && (
        <BulkActionBar
          selectedCount={selectedCount}
          onDelete={requestDeleteSelected}
          onClear={() => setSelectedIds(new Set())}
          busy={busy}
        />
      )}

      <ConfirmSheet
        open={confirmDeleteOpen}
        onOpenChange={(next) => {
          if (!busy) setConfirmDeleteOpen(next)
        }}
        title={`Delete ${selectedCount} product${selectedCount === 1 ? '' : 's'}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={busy}
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          void deleteSelected()
        }}
      />

      {searchIsActive && editMode && (
        <p className="text-xs text-muted-foreground">Clear search to enable reorder arrows.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {rows.length === 0 ? (
        <EmptyState title="No products yet" description="Add your first product to get started." />
      ) : (
        <>
          {/* Mobile list */}
          <div className="space-y-0 md:hidden">
            {rows.map((row, index) => {
              const lifecycle = getLifecycle(row)
              return (
                <div
                  key={row.id}
                  className={cn(
                    'flex items-start gap-2 border-b px-2 py-3 last:border-0',
                    row.isNew && NEW_ROW_TINT
                  )}
                >
                  {editMode && (
                    <RowCheckbox
                      className="mt-1"
                      label={`Select ${row.title}`}
                      checked={selectedIds.has(row.id)}
                      onChange={(event) => toggleSelected(row.id, event.target.checked)}
                    />
                  )}
                  <ProductStatusDot lifecycle={lifecycle} className="mt-1.5" />
                  <button
                    type="button"
                    onClick={(event) => onRowClick(event, row.id)}
                    onKeyDown={(event) => onRowKeyDown(event, row.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div
                      className={cn(
                        'text-sm font-medium',
                        lifecycle === 'discontinued' && 'text-muted-foreground'
                      )}
                    >
                      {row.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.brandName ?? 'No brand'} - {row.packLabel ?? 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(row.price)}</div>
                  </button>
                  {editMode && !searchIsActive && (
                    <RowReorderArrows
                      disabled={busy}
                      isFirst={index === 0}
                      isLast={index === rows.length - 1}
                      onUp={() => moveRowBy(row.id, 'up')}
                      onTop={() => moveRowBy(row.id, 'top')}
                      onDown={() => moveRowBy(row.id, 'down')}
                      onBottom={() => moveRowBy(row.id, 'bottom')}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Desktop table — no drag; arrows only in edit mode */}
          <div className="hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {editMode && (
                    <th className="w-10 px-2 py-3 text-left">
                      <RowCheckbox
                        label="Select all"
                        checked={allSelected}
                        onChange={(event) => toggleAll(event.target.checked)}
                        disabled={busy}
                      />
                    </th>
                  )}
                  <th className="w-6 px-2 py-3" aria-label="Status" />
                  <th className="px-4 py-3 text-left font-medium">Flavor / Details</th>
                  <th className="px-4 py-3 text-left font-medium">Brand</th>
                  <th className="px-4 py-3 text-left font-medium">Pack</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  {editMode && <th className="w-36 px-2 py-3 text-left font-medium">Order</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const lifecycle = getLifecycle(row)
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'cursor-pointer border-b last:border-0 hover:bg-muted/30',
                        row.isNew && NEW_ROW_TINT,
                        selectedIds.has(row.id) && 'bg-muted/30'
                      )}
                      onClick={(event) => onRowClick(event, row.id)}
                      onKeyDown={(event) => onRowKeyDown(event, row.id)}
                      tabIndex={0}
                      role="button"
                    >
                      {editMode && (
                        <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
                          <RowCheckbox
                            label={`Select ${row.title}`}
                            checked={selectedIds.has(row.id)}
                            onChange={(event) => toggleSelected(row.id, event.target.checked)}
                          />
                        </td>
                      )}
                      <td className="px-2 py-3">
                        <ProductStatusDot lifecycle={lifecycle} />
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 font-medium',
                          lifecycle === 'discontinued' && 'text-muted-foreground'
                        )}
                      >
                        {row.title}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.brandName ?? '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.packLabel ?? '-'}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.price)}</td>
                      {editMode && (
                        <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
                          <RowReorderArrows
                            disabled={busy || searchIsActive}
                            isFirst={index === 0}
                            isLast={index === rows.length - 1}
                            onUp={() => moveRowBy(row.id, 'up')}
                            onTop={() => moveRowBy(row.id, 'top')}
                            onDown={() => moveRowBy(row.id, 'down')}
                            onBottom={() => moveRowBy(row.id, 'bottom')}
                          />
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

