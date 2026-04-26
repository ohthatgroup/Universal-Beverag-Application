'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Panel } from '@/components/ui/panel'
import { Switch } from '@/components/ui/switch'
import { TagChipInput } from '@/components/ui/tag-chip-input'
import {
  ProductPicker,
  type PickerProduct,
} from '@/components/admin/product-picker'
import type {
  Announcement,
  AnnouncementContentType,
  CtaTargetKind,
} from '@/components/portal/announcements-stack'
import { cn } from '@/lib/utils'

interface AnnouncementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialAnnouncement?: Announcement | null
  onSave: (data: Partial<Announcement>) => void
  /**
   * Products to feed the search-as-you-type picker. Empty array hides the
   * picker results — the Customer-Homepage manager stub passes nothing
   * because it doesn't have an RSC parent that fetches them yet.
   */
  pickerProducts?: PickerProduct[]
}

interface TypeOption {
  value: AnnouncementContentType
  label: string
  glyph: string
  description: string
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'text', label: 'Text card', glyph: 'Aā', description: 'Title + body + CTA' },
  { value: 'image_text', label: 'Image + text', glyph: '▓+Aā', description: 'Hero image with body copy' },
  { value: 'image', label: 'Image banner', glyph: '▓▓▓▓', description: 'Full-bleed image with CTA' },
  { value: 'product', label: 'Product spotlight', glyph: '★ img', description: 'Featured product' },
  { value: 'specials_grid', label: 'Specials grid', glyph: '★ ⊞⊞⊞', description: 'Curated tile grid' },
]

interface FormState {
  content_type: AnnouncementContentType | null
  title: string
  body: string
  image_url: string
  cta_label: string
  /** When the editorial card has a CTA, where does it go? */
  cta_target_kind: CtaTargetKind | null
  cta_target_url: string
  cta_target_product_id: string | null
  cta_target_product_ids: string[]
  /** Product spotlight subject (independent of CTA destination). */
  product_id: string | null
  /** Specials grid contents (independent of CTA destination). */
  product_ids: string[]
  audience_tags: string[]
  starts_at: string
  ends_at: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  content_type: null,
  title: '',
  body: '',
  image_url: '',
  cta_label: '',
  cta_target_kind: null,
  cta_target_url: '',
  cta_target_product_id: null,
  cta_target_product_ids: [],
  product_id: null,
  product_ids: [],
  audience_tags: [],
  starts_at: '',
  ends_at: '',
  is_active: true,
}

function announcementToForm(a: Announcement): FormState {
  return {
    content_type: a.content_type,
    title: a.title ?? '',
    body: a.body ?? '',
    image_url: a.image_url ?? '',
    cta_label: a.cta_label ?? '',
    cta_target_kind: a.cta_target_kind,
    cta_target_url: a.cta_target_url ?? '',
    cta_target_product_id: a.cta_target_product_id,
    cta_target_product_ids: a.cta_target_product_ids,
    product_id: a.product_id,
    product_ids: a.product_ids,
    audience_tags: a.audience_tags,
    starts_at: a.starts_at ? a.starts_at.slice(0, 10) : '',
    ends_at: a.ends_at ? a.ends_at.slice(0, 10) : '',
    is_active: a.is_active,
  }
}

export function AnnouncementDialog({
  open,
  onOpenChange,
  initialAnnouncement = null,
  onSave,
  pickerProducts = [],
}: AnnouncementDialogProps) {
  const isEditing = initialAnnouncement !== null
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [step, setStep] = useState<1 | 2>(isEditing ? 2 : 1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (initialAnnouncement) {
      setForm(announcementToForm(initialAnnouncement))
      setStep(2)
    } else {
      setForm(EMPTY_FORM)
      setStep(1)
    }
    setError(null)
  }, [open, initialAnnouncement])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const pickType = (type: AnnouncementContentType) => {
    setForm((prev) => ({ ...prev, content_type: type }))
    setStep(2)
  }

  const handleSave = () => {
    setError(null)
    const type = form.content_type
    if (!type) {
      setError('Pick a content type first.')
      return
    }

    // Required-field checks per type.
    if ((type === 'text' || type === 'image_text') && !form.title.trim()) {
      setError('Title is required.')
      return
    }
    if ((type === 'image' || type === 'image_text') && !form.image_url.trim()) {
      setError('Image URL is required.')
      return
    }
    if (type === 'product' && !form.product_id) {
      setError('Pick a featured product.')
      return
    }
    if (type === 'specials_grid' && form.product_ids.length === 0) {
      setError('Pick at least one product for the grid.')
      return
    }

    // CTA target validation for editorial cards (only if cta_label given).
    const isEditorial = type === 'text' || type === 'image' || type === 'image_text'
    let ctaTargetKind = form.cta_target_kind
    let ctaTargetUrl: string | null = form.cta_target_url.trim() || null
    let ctaTargetProductId = form.cta_target_product_id
    let ctaTargetProductIds = form.cta_target_product_ids
    if (isEditorial && form.cta_label.trim()) {
      if (!ctaTargetKind) {
        setError('Pick a destination for the CTA, or remove the CTA label.')
        return
      }
      if (ctaTargetKind === 'url' && !ctaTargetUrl) {
        setError('Enter a URL for the CTA destination.')
        return
      }
      if (ctaTargetKind === 'product' && !ctaTargetProductId) {
        setError('Pick a product for the CTA destination.')
        return
      }
      if (ctaTargetKind === 'products' && ctaTargetProductIds.length === 0) {
        setError('Pick at least one product for the CTA destination.')
        return
      }
    } else if (!isEditorial || !form.cta_label.trim()) {
      // Clear unused CTA target fields so we don't persist orphan data.
      ctaTargetKind = null
      ctaTargetUrl = null
      ctaTargetProductId = null
      ctaTargetProductIds = []
    }

    const partial: Partial<Announcement> = {
      content_type: type,
      title: form.title.trim() || null,
      body: form.body.trim() || null,
      image_url: form.image_url.trim() || null,
      cta_label: form.cta_label.trim() || null,
      cta_target_kind: ctaTargetKind,
      cta_target_url: ctaTargetUrl,
      cta_target_product_id: ctaTargetProductId,
      cta_target_product_ids: ctaTargetProductIds,
      product_id: form.product_id,
      product_ids: form.product_ids,
      audience_tags: form.audience_tags,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      is_active: form.is_active,
    }
    onSave(partial)
    onOpenChange(false)
  }

  const dialogTitle = isEditing
    ? 'Edit Announcement'
    : step === 1
    ? 'New Announcement'
    : `New Announcement: ${TYPE_OPTIONS.find((o) => o.value === form.content_type)?.label ?? ''}`

  return (
    <Panel
      open={open}
      onOpenChange={onOpenChange}
      variant="centered"
      contentClassName="w-[calc(100vw-1.5rem)] max-w-lg max-h-[85dvh]"
      srTitle={dialogTitle}
    >
      <Panel.Header>
        {step === 2 && !isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label="Back to type picker"
            onClick={() => setStep(1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="flex-1 text-base font-semibold">{dialogTitle}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </Panel.Header>

      <Panel.Body className="px-4 py-4">
        {step === 1 ? (
          <TypePicker onPick={pickType} />
        ) : (
          <FieldsForm
            type={form.content_type ?? 'text'}
            form={form}
            setField={setField}
            error={error}
            pickerProducts={pickerProducts}
          />
        )}
      </Panel.Body>

      {step === 2 && (
        <Panel.Footer className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </Panel.Footer>
      )}
    </Panel>
  )
}

function TypePicker({ onPick }: { onPick: (t: AnnouncementContentType) => void }) {
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Choose a content type:
      </p>
      <div className="grid grid-cols-3 gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPick(opt.value)}
            className={cn(
              'rounded-xl border bg-card p-3 text-center text-sm transition-colors',
              'hover:bg-muted/50',
            )}
          >
            <div className="text-xl leading-none">{opt.glyph}</div>
            <div className="mt-2 font-medium">{opt.label}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {opt.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

interface FieldsFormProps {
  type: AnnouncementContentType
  form: FormState
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  error: string | null
  pickerProducts: PickerProduct[]
}

function FieldsForm({
  type,
  form,
  setField,
  error,
  pickerProducts,
}: FieldsFormProps) {
  const isEditorial =
    type === 'text' || type === 'image' || type === 'image_text'
  const showCtaTargetPicker = isEditorial && form.cta_label.trim().length > 0

  return (
    <div className="space-y-4">
      {/* Type-specific fields */}
      {(type === 'image' || type === 'image_text') && (
        <Field label="Image URL" required>
          {/* TODO: replace with ImageUploadField */}
          <Input
            value={form.image_url}
            onChange={(e) => setField('image_url', e.target.value)}
            placeholder="https://…"
          />
        </Field>
      )}

      {(type === 'text' ||
        type === 'image' ||
        type === 'image_text' ||
        type === 'specials_grid') && (
        <Field
          label="Title"
          required={type === 'text' || type === 'image_text'}
        >
          <Input
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
          />
        </Field>
      )}

      {(type === 'text' ||
        type === 'image_text' ||
        type === 'product') && (
        <Field label={type === 'product' ? 'Note (optional)' : 'Body'}>
          <textarea
            value={form.body}
            onChange={(e) => setField('body', e.target.value)}
            rows={3}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </Field>
      )}

      {/* Product spotlight subject */}
      {type === 'product' && (
        <Field label="Featured product" required>
          <ProductPicker
            mode="single"
            products={pickerProducts}
            value={form.product_id}
            onChange={(next) => setField('product_id', next)}
          />
        </Field>
      )}

      {/* Specials grid contents */}
      {type === 'specials_grid' && (
        <Field
          label={`Products in this grid (${form.product_ids.length})`}
          required
        >
          <ProductPicker
            mode="multi"
            products={pickerProducts}
            value={form.product_ids}
            onChange={(next) => setField('product_ids', next)}
          />
        </Field>
      )}

      {/* CTA — editorial cards only (text / image / image_text). */}
      {isEditorial && (
        <>
          <Field label="CTA label">
            <Input
              value={form.cta_label}
              onChange={(e) => setField('cta_label', e.target.value)}
              placeholder="Learn more"
            />
          </Field>

          {showCtaTargetPicker && (
            <CtaDestinationField
              form={form}
              setField={setField}
              pickerProducts={pickerProducts}
            />
          )}
        </>
      )}

      <hr className="border-foreground/10" />

      {/* Common fields */}
      <Field label="Audience tags">
        <TagChipInput
          value={form.audience_tags}
          onChange={(next) => setField('audience_tags', next)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Go live">
          <Input
            type="date"
            value={form.starts_at}
            onChange={(e) => setField('starts_at', e.target.value)}
          />
        </Field>
        <Field label="Expires">
          <Input
            type="date"
            value={form.ends_at}
            onChange={(e) => setField('ends_at', e.target.value)}
          />
        </Field>
      </div>

      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Active</span>
        <Switch
          checked={form.is_active}
          onCheckedChange={(checked) => setField('is_active', checked)}
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface CtaDestinationFieldProps {
  form: FormState
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  pickerProducts: PickerProduct[]
}

function CtaDestinationField({
  form,
  setField,
  pickerProducts,
}: CtaDestinationFieldProps) {
  const KINDS: { value: CtaTargetKind; label: string; hint: string }[] = [
    { value: 'products', label: 'Product list', hint: 'Open a curated list' },
    { value: 'product', label: 'Single product', hint: 'Open one product' },
    { value: 'url', label: 'External URL', hint: 'Open a website' },
  ]

  return (
    <Field label="When customers tap it…">
      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((opt) => {
            const active = form.cta_target_kind === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField('cta_target_kind', opt.value)}
                aria-pressed={active}
                className={cn(
                  'rounded-md border bg-background px-2 py-2 text-left transition-colors',
                  active
                    ? 'border-accent ring-1 ring-accent'
                    : 'hover:bg-muted/50',
                )}
              >
                <div className="text-xs font-semibold">{opt.label}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {opt.hint}
                </div>
              </button>
            )
          })}
        </div>

        {form.cta_target_kind === 'url' && (
          <Input
            value={form.cta_target_url}
            onChange={(e) => setField('cta_target_url', e.target.value)}
            placeholder="https://…"
          />
        )}

        {form.cta_target_kind === 'product' && (
          <ProductPicker
            mode="single"
            products={pickerProducts}
            value={form.cta_target_product_id}
            onChange={(next) => setField('cta_target_product_id', next)}
          />
        )}

        {form.cta_target_kind === 'products' && (
          <ProductPicker
            mode="multi"
            products={pickerProducts}
            value={form.cta_target_product_ids}
            onChange={(next) => setField('cta_target_product_ids', next)}
          />
        )}
      </div>
    </Field>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}
