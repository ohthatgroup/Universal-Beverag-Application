'use client'

import { useEffect, useMemo, useState, type DragEvent, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { LiveQueryInput } from '@/components/admin/live-query-input'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { moveSelectedRows, reorderByDrag } from '@/lib/reorder'
import { isInteractiveRowTarget } from '@/lib/row-navigation'
import { formatCurrency, PACK_UOM_OPTIONS } from '@/lib/utils'

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
}

const CREATE_NEW_BRAND_VALUE = '__create_new_brand__'
const CREATE_NEW_SIZE_UNIT_VALUE = '__create_new_size_unit__'

export function CatalogProductsManager({ products, brands, searchQuery }: CatalogProductsManagerProps) {
  const router = useRouter()
  const [rows, setRows] = useState<CatalogProductRow[]>(products)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateRow, setShowCreateRow] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [movePosition, setMovePosition] = useState('1')
  const [createBrandValue, setCreateBrandValue] = useState('')
  const [createBrandName, setCreateBrandName] = useState('')
  const [createSizeUnitValue, setCreateSizeUnitValue] = useState('')
  const [createSizeUnitName, setCreateSizeUnitName] = useState('')

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
      const payload = await response.json().catch(() => null)
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

  const onDropRow = (targetId: string) => {
    if (busy || searchIsActive || !draggingId || draggingId === targetId) return
    const nextRows = reorderByDrag(rows, draggingId, targetId)
    if (nextRows === rows) return
    void applyOrder(nextRows)
  }

  const moveSelected = (mode: 'top' | 'bottom' | 'position') => {
    if (busy || searchIsActive || selectedRows.length === 0) return

    const desiredPosition = Number.isFinite(Number(movePosition)) ? Number(movePosition) : null
    const nextRows = moveSelectedRows(rows, selectedIds, mode, desiredPosition)
    if (nextRows === rows) return

    void applyOrder(nextRows)
  }

  const deleteSelected = async () => {
    if (busy || selectedRows.length === 0) return
    const confirmed = window.confirm(`Delete ${selectedRows.length} selected product(s)?`)
    if (!confirmed) return

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
      const payload = await response.json().catch(() => null)
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
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error?.message ?? 'Failed to create product')
      }
      setShowCreateRow(false)
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          size="sm"
          onClick={() =>
            setShowCreateRow((prev) => {
              const next = !prev
              if (!next) {
                setCreateBrandValue('')
                setCreateBrandName('')
                setCreateSizeUnitValue('')
                setCreateSizeUnitName('')
              }
              return next
            })
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {showCreateRow ? 'Cancel' : 'Add Product'}
        </Button>
        <LiveQueryInput
          placeholder="Search products..."
          initialValue={searchQuery}
          className="w-full sm:w-80"
        />
      </div>

      {showCreateRow && (
        <div className="rounded-lg border border-dashed p-3">
          <form onSubmit={onCreateProduct} className="grid gap-3 md:grid-cols-3">
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
            <div className="md:col-span-3">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button type="button" size="sm" variant="outline" disabled={busy || searchIsActive} onClick={() => moveSelected('top')}>
            Move Top
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy || searchIsActive} onClick={() => moveSelected('bottom')}>
            Move Bottom
          </Button>
          <Input
            value={movePosition}
            onChange={(event) => setMovePosition(event.target.value)}
            className="h-8 w-20"
            inputMode="numeric"
            placeholder="Pos"
            disabled={busy || searchIsActive}
          />
          <Button type="button" size="sm" variant="outline" disabled={busy || searchIsActive} onClick={() => moveSelected('position')}>
            Move To
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={deleteSelected}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {searchIsActive && (
        <p className="text-xs text-muted-foreground">Clear search to enable drag reorder and move actions.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products available.</p>
      ) : (
        <>
          <div className="space-y-0 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex cursor-pointer items-start gap-2 border-b py-3 last:border-0"
                onClick={(event) => onRowClick(event, row.id)}
                onKeyDown={(event) => onRowKeyDown(event, row.id)}
                role="button"
                tabIndex={0}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selectedIds.has(row.id)}
                  onChange={(event) => toggleSelected(row.id, event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{row.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.brandName ?? 'No brand'} - {row.packLabel ?? 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(row.price)} - {row.isDiscontinued ? 'Discontinued' : row.isNew ? 'New' : 'Active'}
                  </div>
                </div>
              </div>
            ))}
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
                  <th className="w-10 px-2 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left font-medium">Flavor / Details</th>
                  <th className="px-4 py-3 text-left font-medium">Brand</th>
                  <th className="px-4 py-3 text-left font-medium">Pack</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    draggable={!busy && !searchIsActive}
                    onDragStart={() => setDraggingId(row.id)}
                    onDragOver={(event: DragEvent<HTMLTableRowElement>) => event.preventDefault()}
                    onDrop={() => onDropRow(row.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`cursor-pointer border-b last:border-0 hover:bg-muted/30 ${selectedIds.has(row.id) ? 'bg-muted/30' : ''}`}
                    onClick={(event) => onRowClick(event, row.id)}
                    onKeyDown={(event) => onRowKeyDown(event, row.id)}
                    tabIndex={0}
                    role="button"
                  >
                    <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={(event) => toggleSelected(row.id, event.target.checked)}
                      />
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      <GripVertical className="h-4 w-4" data-no-row-nav="true" />
                    </td>
                    <td className="px-4 py-3 font-medium">{row.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.brandName ?? '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.packLabel ?? '-'}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(row.price)}</td>
                    <td className="px-4 py-3">
                      {row.isDiscontinued && <span className="text-xs text-muted-foreground line-through">Discontinued</span>}
                      {!row.isDiscontinued && row.isNew && <span className="text-xs text-primary">New</span>}
                      {!row.isDiscontinued && !row.isNew && <span className="text-xs text-muted-foreground">Active</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
