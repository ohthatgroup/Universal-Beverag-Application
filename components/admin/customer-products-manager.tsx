'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, formatCurrency, getProductPackLabel, PACK_UOM_OPTIONS } from '@/lib/utils'

export interface CustomerBrandOption {
  id: string
  name: string
}

export interface CustomerProductRowData {
  id: string
  title: string
  brandId: string | null
  brandLabel: string
  packLabel: string
  price: number
  isCustom: boolean
}

export interface CustomerProductGroupData {
  brandId: string
  label: string
  products: CustomerProductRowData[]
}

export interface CustomerProductOverrideData {
  productId: string
  excluded: boolean
  customPrice: number | null
  isUsual: boolean
}

interface CustomerProductsManagerProps {
  customerId: string
  customPricing: boolean
  groups: CustomerProductGroupData[]
  brands: CustomerBrandOption[]
  overrides: CustomerProductOverrideData[]
}

interface ProductDraftState {
  hidden: boolean
  isUsual: boolean
  savedCustomPrice: number | null
  draftCustomPrice: string
}

interface CreateCustomProductFormState {
  brandId: string
  title: string
  packDetails: string
  packCount: string
  sizeValue: string
  sizeUom: string
  price: string
}

function buildInitialDrafts(
  groups: CustomerProductGroupData[],
  overrides: CustomerProductOverrideData[]
) {
  const overridesByProductId = new Map(overrides.map((override) => [override.productId, override]))
  const nextState: Record<string, ProductDraftState> = {}

  for (const group of groups) {
    for (const product of group.products) {
      const override = overridesByProductId.get(product.id)
      const savedCustomPrice = override?.customPrice ?? null
      nextState[product.id] = {
        hidden: override?.excluded ?? false,
        isUsual: override?.isUsual ?? false,
        savedCustomPrice,
        draftCustomPrice: savedCustomPrice === null ? '' : String(savedCustomPrice),
      }
    }
  }

  return nextState
}

function parseCustomPriceInput(rawValue: string) {
  const value = rawValue.trim()
  if (!value) {
    return { valid: true as const, value: null as number | null }
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { valid: false as const, value: null as number | null }
  }

  return { valid: true as const, value: Number(parsed.toFixed(2)) }
}

function pricesMatch(left: number | null, right: number | null) {
  if (left === null || right === null) return left === right
  return Number(left.toFixed(2)) === Number(right.toFixed(2))
}

const DEFAULT_CREATE_FORM: CreateCustomProductFormState = {
  brandId: '',
  title: '',
  packDetails: '',
  packCount: '',
  sizeValue: '',
  sizeUom: '',
  price: '',
}

export function CustomerProductsManager({
  customerId,
  customPricing,
  groups,
  brands,
  overrides,
}: CustomerProductsManagerProps) {
  const [localGroups, setLocalGroups] = useState<CustomerProductGroupData[]>(groups)
  const [drafts, setDrafts] = useState<Record<string, ProductDraftState>>(() => buildInitialDrafts(groups, overrides))
  const [savingToggleIds, setSavingToggleIds] = useState<Set<string>>(new Set())
  const [isSavingPrices, setIsSavingPrices] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isCreatingCustomProduct, setIsCreatingCustomProduct] = useState(false)
  const [createForm, setCreateForm] = useState<CreateCustomProductFormState>(DEFAULT_CREATE_FORM)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setLocalGroups(groups)
  }, [groups])

  useEffect(() => {
    setDrafts(buildInitialDrafts(groups, overrides))
  }, [groups, overrides])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 1800)
    return () => window.clearTimeout(timer)
  }, [success])

  const products = useMemo(() => localGroups.flatMap((group) => group.products), [localGroups])
  const brandsById = useMemo(() => new Map(brands.map((brand) => [brand.id, brand.name])), [brands])

  const dirtyPriceIds = useMemo(() => {
    if (!customPricing) return []
    const dirtyIds: string[] = []

    for (const product of products) {
      const draft = drafts[product.id]
      if (!draft) continue

      const parsed = parseCustomPriceInput(draft.draftCustomPrice)
      if (!parsed.valid) {
        dirtyIds.push(product.id)
        continue
      }

      if (!pricesMatch(parsed.value, draft.savedCustomPrice)) {
        dirtyIds.push(product.id)
      }
    }

    return dirtyIds
  }, [customPricing, drafts, products])

  const hasDirtyPrices = dirtyPriceIds.length > 0

  const hasInvalidDirtyPrices = useMemo(() => {
    if (!customPricing || dirtyPriceIds.length === 0) return false
    return dirtyPriceIds.some((productId) => {
      const draft = drafts[productId]
      return draft ? !parseCustomPriceInput(draft.draftCustomPrice).valid : false
    })
  }, [customPricing, dirtyPriceIds, drafts])

  const updateDraft = (productId: string, patch: Partial<ProductDraftState>) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: {
        hidden: prev[productId]?.hidden ?? false,
        isUsual: prev[productId]?.isUsual ?? false,
        savedCustomPrice: prev[productId]?.savedCustomPrice ?? null,
        draftCustomPrice: prev[productId]?.draftCustomPrice ?? '',
        ...patch,
      },
    }))
  }

  const saveHiddenState = async (productId: string, hidden: boolean) => {
    const current = drafts[productId]
    if (!current || savingToggleIds.has(productId)) return

    const previousHidden = current.hidden
    updateDraft(productId, { hidden })
    setSavingToggleIds((prev) => new Set(prev).add(productId))
    setError(null)

    try {
      const response = await fetch(`/api/customers/${customerId}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          hidden,
          customPrice: current.savedCustomPrice,
          isUsual: current.isUsual,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(payload?.error?.message ?? 'Failed to update product visibility')
      }

      setSuccess('Visibility saved')
    } catch (toggleError) {
      updateDraft(productId, { hidden: previousHidden })
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update product visibility')
    } finally {
      setSavingToggleIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const saveUsualState = async (productId: string, isUsual: boolean) => {
    const current = drafts[productId]
    if (!current || savingToggleIds.has(productId)) return

    const previousIsUsual = current.isUsual
    updateDraft(productId, { isUsual })
    setSavingToggleIds((prev) => new Set(prev).add(productId))
    setError(null)

    try {
      const response = await fetch(`/api/customers/${customerId}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          hidden: current.hidden,
          customPrice: current.savedCustomPrice,
          isUsual,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(payload?.error?.message ?? 'Failed to pin product')
      }

      setSuccess(isUsual ? 'Pinned to usuals' : 'Unpinned')
    } catch (toggleError) {
      updateDraft(productId, { isUsual: previousIsUsual })
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to pin product')
    } finally {
      setSavingToggleIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  const discardDirtyPrices = () => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const productId of dirtyPriceIds) {
        const draft = next[productId]
        if (!draft) continue
        next[productId] = {
          ...draft,
          draftCustomPrice: draft.savedCustomPrice === null ? '' : String(draft.savedCustomPrice),
        }
      }
      return next
    })
    setError(null)
  }

  const saveDirtyPrices = async () => {
    if (!customPricing || dirtyPriceIds.length === 0 || isSavingPrices) return

    const updates: Array<{ productId: string; customPrice: number | null }> = []
    for (const productId of dirtyPriceIds) {
      const draft = drafts[productId]
      if (!draft) continue
      const parsed = parseCustomPriceInput(draft.draftCustomPrice)
      if (!parsed.valid) {
        setError('Please enter valid custom prices before saving')
        return
      }
      updates.push({ productId, customPrice: parsed.value })
    }

    setIsSavingPrices(true)
    setError(null)

    try {
      const response = await fetch(`/api/customers/${customerId}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(payload?.error?.message ?? 'Failed to save custom prices')
      }

      const nextByProductId = new Map(updates.map((update) => [update.productId, update.customPrice]))
      setDrafts((prev) => {
        const next = { ...prev }
        for (const [productId, customPrice] of nextByProductId.entries()) {
          const draft = next[productId]
          if (!draft) continue
          next[productId] = {
            ...draft,
            savedCustomPrice: customPrice,
            draftCustomPrice: customPrice === null ? '' : String(customPrice),
          }
        }
        return next
      })

      setSuccess(`Saved ${updates.length} price change${updates.length === 1 ? '' : 's'}`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save custom prices')
    } finally {
      setIsSavingPrices(false)
    }
  }

  const createCustomProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isCreatingCustomProduct) return

    const payload = {
      brandId: createForm.brandId || null,
      title: createForm.title.trim(),
      packDetails: createForm.packDetails.trim() || null,
      packCount: createForm.packCount.trim() ? Number(createForm.packCount) : null,
      sizeValue: createForm.sizeValue.trim() ? Number(createForm.sizeValue) : null,
      sizeUom: createForm.sizeUom.trim() || null,
      price: createForm.price.trim() ? Number(createForm.price) : null,
    }

    if (!payload.title) {
      setError('Custom product title is required')
      return
    }
    if (payload.price === null || !Number.isFinite(payload.price) || payload.price <= 0) {
      setError('Price must be a positive number')
      return
    }

    setIsCreatingCustomProduct(true)
    setError(null)

    try {
      const response = await fetch(`/api/customers/${customerId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = (await response.json().catch(() => null)) as
        | {
            data?: {
              product?: {
                id: string
                title: string
                brand_id: string | null
                pack_details: string | null
                pack_count: number | null
                size_value: number | null
                size_uom: string | null
                price: number
                customer_id: string | null
              }
            }
            error?: { message?: string }
          }
        | null

      if (!response.ok || !body?.data?.product) {
        throw new Error(body?.error?.message ?? 'Failed to create custom product')
      }

      const created = body.data.product
      const brandLabel = created.brand_id ? brandsById.get(created.brand_id) ?? 'No brand' : 'No brand'
      const packLabel =
        getProductPackLabel({
          title: created.title,
          pack_details: created.pack_details,
          pack_count: created.pack_count,
          size_value: created.size_value,
          size_uom: created.size_uom,
        }) ?? 'N/A'

      const groupKey = created.brand_id ?? 'unbranded'
      const groupLabel = created.brand_id ? brandsById.get(created.brand_id) ?? 'Other Products' : 'Other Products'
      const nextProduct: CustomerProductRowData = {
        id: created.id,
        title: created.title,
        brandId: created.brand_id,
        brandLabel,
        packLabel,
        price: Number(created.price ?? 0),
        isCustom: true,
      }

      setLocalGroups((prev) => {
        const next = [...prev]
        const groupIndex = next.findIndex((group) => group.brandId === groupKey)
        if (groupIndex >= 0) {
          next[groupIndex] = {
            ...next[groupIndex],
            products: [nextProduct, ...next[groupIndex].products],
          }
          return next
        }
        return [{ brandId: groupKey, label: groupLabel, products: [nextProduct] }, ...next]
      })

      setDrafts((prev) => ({
        ...prev,
        [created.id]: {
          hidden: false,
          isUsual: false,
          savedCustomPrice: null,
          draftCustomPrice: '',
        },
      }))

      setCreateForm(DEFAULT_CREATE_FORM)
      setCreateDialogOpen(false)
      setSuccess('Custom product created')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create custom product')
    } finally {
      setIsCreatingCustomProduct(false)
    }
  }

  const rootPaddingClass = customPricing && hasDirtyPrices ? 'pb-24 md:pb-20' : ''

  return (
    <div className={cn('space-y-4', rootPaddingClass)}>
      <div className="flex items-center gap-2">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Custom Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-4 sm:w-[calc(100vw-1.5rem)] sm:p-6">
            <DialogHeader>
              <DialogTitle>Create Custom Product</DialogTitle>
              <DialogDescription>
                This product will be available only for this customer.
              </DialogDescription>
            </DialogHeader>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={createCustomProduct}>
              <div className="space-y-1">
                <Label htmlFor="custom-brand-id">Brand</Label>
                <select
                  id="custom-brand-id"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={createForm.brandId}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, brandId: event.target.value }))}
                >
                  <option value="">No brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-title">Flavor / Details</Label>
                <Input
                  id="custom-title"
                  value={createForm.title}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-pack-details">Pack details</Label>
                <Input
                  id="custom-pack-details"
                  value={createForm.packDetails}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, packDetails: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-pack-count">Pack count</Label>
                <Input
                  id="custom-pack-count"
                  type="number"
                  min="1"
                  step="1"
                  value={createForm.packCount}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, packCount: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-size-value">Size value</Label>
                <Input
                  id="custom-size-value"
                  type="number"
                  min="0"
                  step="0.001"
                  value={createForm.sizeValue}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, sizeValue: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-size-uom">Size unit</Label>
                <select
                  id="custom-size-uom"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={createForm.sizeUom}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, sizeUom: event.target.value }))}
                >
                  <option value="">Select unit</option>
                  {PACK_UOM_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="custom-price">Price</Label>
                <Input
                  id="custom-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={createForm.price}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, price: event.target.value }))}
                  required
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreatingCustomProduct}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingCustomProduct}>
                  {isCreatingCustomProduct ? 'Creating...' : 'Create Custom Product'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}

      {localGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products found.</p>
      ) : (
        <div className="space-y-6">
          {localGroups.map((group) => (
            <section key={group.brandId} className="space-y-1">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>

              <div className="md:hidden">
                {group.products.map((product) => {
                  const draft = drafts[product.id]
                  const hidden = draft?.hidden ?? false
                  const parsed = parseCustomPriceInput(draft?.draftCustomPrice ?? '')
                  const hasInvalidPrice = customPricing && !parsed.valid
                  const toggleSaving = savingToggleIds.has(product.id)

                  return (
                    <div key={product.id} className={cn('border-b py-3 last:border-0', hidden && 'opacity-50')}>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{product.title}</span>
                            {product.isCustom ? (
                              <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                Custom
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {product.packLabel} - {formatCurrency(product.price)}
                          </div>
                          {customPricing && (
                            <Input
                              value={draft?.draftCustomPrice ?? ''}
                              placeholder="Custom price"
                              className={cn('mt-1.5 h-8 text-xs', hasInvalidPrice && 'border-destructive')}
                              onChange={(event) => updateDraft(product.id, { draftCustomPrice: event.target.value })}
                            />
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            aria-label={draft?.isUsual ? 'Unpin from usuals' : 'Pin to usuals'}
                            aria-pressed={draft?.isUsual ?? false}
                            disabled={toggleSaving}
                            onClick={() => void saveUsualState(product.id, !(draft?.isUsual ?? false))}
                            className={cn(
                              'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted',
                              (draft?.isUsual ?? false) ? 'text-amber-500' : 'text-muted-foreground'
                            )}
                          >
                            <Star
                              className="h-4 w-4"
                              fill={(draft?.isUsual ?? false) ? 'currentColor' : 'none'}
                            />
                          </button>
                          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Hide
                            <span className="relative inline-flex h-5 w-9 cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={hidden}
                                className="peer sr-only"
                                disabled={toggleSaving}
                                onChange={(event) => void saveHiddenState(product.id, event.target.checked)}
                              />
                              <span className="h-5 w-9 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                              <span className="absolute left-[2px] h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
                            </span>
                          </label>
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
                      <th className="px-4 py-2 text-left font-medium">Product</th>
                      <th className="px-4 py-2 text-left font-medium">Pack</th>
                      <th className="px-4 py-2 text-right font-medium">Default Price</th>
                      {customPricing && (
                        <th className="px-4 py-2 text-right font-medium">Custom Price</th>
                      )}
                      <th className="px-4 py-2 text-center font-medium">Pin</th>
                      <th className="px-4 py-2 text-center font-medium">Hide</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.products.map((product) => {
                      const draft = drafts[product.id]
                      const hidden = draft?.hidden ?? false
                      const parsed = parseCustomPriceInput(draft?.draftCustomPrice ?? '')
                      const hasInvalidPrice = customPricing && !parsed.valid
                      const toggleSaving = savingToggleIds.has(product.id)

                      return (
                        <tr key={product.id} className={cn('border-b last:border-0', hidden && 'opacity-50')}>
                          <td className="px-4 py-2 font-medium">
                            <div className="flex items-center gap-2">
                              <span>{product.title}</span>
                              {product.isCustom ? (
                                <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                  Custom
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{product.packLabel}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(product.price)}</td>
                          {customPricing ? (
                            <td className="px-4 py-2 text-right">
                              <Input
                                value={draft?.draftCustomPrice ?? ''}
                                placeholder="-"
                                className={cn('ml-auto h-8 w-28 text-right text-xs', hasInvalidPrice && 'border-destructive')}
                                onChange={(event) => updateDraft(product.id, { draftCustomPrice: event.target.value })}
                              />
                            </td>
                          ) : null}
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              aria-label={draft?.isUsual ? 'Unpin from usuals' : 'Pin to usuals'}
                              aria-pressed={draft?.isUsual ?? false}
                              disabled={toggleSaving}
                              onClick={() => void saveUsualState(product.id, !(draft?.isUsual ?? false))}
                              className={cn(
                                'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted',
                                (draft?.isUsual ?? false) ? 'text-amber-500' : 'text-muted-foreground'
                              )}
                            >
                              <Star
                                className="h-4 w-4"
                                fill={(draft?.isUsual ?? false) ? 'currentColor' : 'none'}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <label className="relative inline-flex h-5 w-9 cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={hidden}
                                className="peer sr-only"
                                disabled={toggleSaving}
                                onChange={(event) => void saveHiddenState(product.id, event.target.checked)}
                              />
                              <span className="h-5 w-9 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                              <span className="absolute left-[2px] h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
                            </label>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {/*
        Autosave-style indicator — replaces the old sticky save/discard footer.
        Per st-9 design theory: prices should autosave per-row with debounce;
        this visible bar is a transitional pattern until the row-level autosave
        is wired. Engineer TODO (see docs/st-9-engineer-followups.md): move
        price writes to a 500ms debounced per-row PATCH and drop this banner.
      */}
      {customPricing && hasDirtyPrices && (
        <div className="sticky bottom-20 z-30 mx-auto w-full md:bottom-4">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-amber-500/30 bg-amber-50/90 px-4 py-2 text-sm shadow-lg backdrop-blur">
            <span className="text-amber-900">
              {dirtyPriceIds.length} price{dirtyPriceIds.length === 1 ? '' : 's'} pending
              {hasInvalidDirtyPrices ? ' — fix invalid' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discardDirtyPrices}
                disabled={isSavingPrices}
                className="text-xs text-amber-900/70 hover:text-amber-900"
              >
                Discard
              </button>
              <Button
                type="button"
                size="sm"
                onClick={saveDirtyPrices}
                disabled={isSavingPrices || hasInvalidDirtyPrices}
              >
                {isSavingPrices ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
