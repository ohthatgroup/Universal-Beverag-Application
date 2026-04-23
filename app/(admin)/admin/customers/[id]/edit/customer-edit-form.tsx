'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagChipInput } from '@/components/ui/tag-chip-input'
import { DangerZoneDeleteCustomer } from '@/components/admin/danger-zone-delete-customer'

type InitialValues = {
  business_name: string
  contact_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  tags: string[]
  location: string
  show_prices: boolean
  custom_pricing: boolean
  default_group: 'brand' | 'size'
}

export function CustomerEditForm({
  customerId,
  businessName,
  initialValues,
  tagSuggestions = [],
}: {
  customerId: string
  businessName: string
  initialValues: InitialValues
  tagSuggestions?: string[]
}) {
  const router = useRouter()
  const [values, setValues] = useState(initialValues)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof InitialValues>(key: K, value: InitialValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          businessName: values.business_name,
          contactName: values.contact_name,
          email: values.email,
          phone: values.phone,
          address: values.address,
          city: values.city,
          state: values.state,
          zip: values.zip,
          tags: values.tags,
          location: values.location,
          showPrices: values.show_prices,
          customPricing: values.custom_pricing,
          defaultGroup: values.default_group,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      if (!response.ok) {
        setError(payload?.error?.message || `Save failed (HTTP ${response.status})`)
        setSaving(false)
        return
      }
      router.push(`/admin/customers/${customerId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  const onDelete = async () => {
    const response = await fetch(`/api/admin/customers/${customerId}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      throw new Error(payload?.error?.message || `Delete failed (HTTP ${response.status})`)
    }
    router.push('/admin/customers')
    router.refresh()
  }

  return (
    <>
      <form
        method="post"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
        className="space-y-6"
      >
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contact
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business name</Label>
              <Input
                id="business_name"
                name="business_name"
                value={values.business_name}
                onChange={(e) => set('business_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact name</Label>
              <Input
                id="contact_name"
                name="contact_name"
                value={values.contact_name}
                onChange={(e) => set('contact_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={values.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={values.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={values.city}
                onChange={(e) => set('city', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                value={values.state}
                onChange={(e) => set('state', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Zip</Label>
              <Input
                id="zip"
                name="zip"
                value={values.zip}
                onChange={(e) => set('zip', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Targeting
          </h2>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <TagChipInput
                id="tags"
                value={values.tags}
                onChange={(next) => set('tags', next)}
                suggestions={tagSuggestions}
              />
              <p className="text-xs text-muted-foreground">
                Type and press Enter to add. Used for targeting banners and announcements.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={values.location}
                onChange={(e) => set('location', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Freeform. Targeting uses substring match (&quot;Austin&quot; matches &quot;Austin, TX&quot;).
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Catalog
          </h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Show prices</span>
              <input
                checked={values.show_prices}
                onChange={(e) => set('show_prices', e.target.checked)}
                name="show_prices"
                type="checkbox"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Custom pricing</span>
              <input
                checked={values.custom_pricing}
                onChange={(e) => set('custom_pricing', e.target.checked)}
                name="custom_pricing"
                type="checkbox"
              />
            </label>
            <div className="space-y-2">
              <Label>Default grouping</Label>
              <select
                name="default_group"
                value={values.default_group}
                onChange={(e) => set('default_group', e.target.value as 'brand' | 'size')}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="brand">Brand</option>
                <option value="size">Size</option>
              </select>
            </div>
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:px-0 md:py-0 md:pt-2 md:backdrop-blur-none">
          <div className="mx-auto flex max-w-lg items-center">
            <Button
              type="button"
              disabled={saving}
              onClick={() => {
                void save()
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </form>

      <DangerZoneDeleteCustomer businessName={businessName} action={onDelete} />
    </>
  )
}
