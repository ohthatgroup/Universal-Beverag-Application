'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Panel } from '@/components/ui/panel'
import { Switch } from '@/components/ui/switch'
import { TagChipInput } from '@/components/ui/tag-chip-input'
import type {
  Announcement,
  AnnouncementContentType,
} from '@/components/portal/announcements-stack'
import { cn } from '@/lib/utils'

interface AnnouncementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialAnnouncement?: Announcement | null
  onSave: (data: Partial<Announcement>) => void
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
  cta_url: string
  product_id: string
  product_ids: string
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
  cta_url: '',
  product_id: '',
  product_ids: '',
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
    cta_url: a.cta_url ?? '',
    product_id: a.product_id ?? '',
    product_ids: a.product_ids.join(', '),
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

    // Required-field checks per type
    const required: Array<keyof FormState> = []
    if (type === 'text') required.push('title')
    if (type === 'image') required.push('image_url')
    if (type === 'image_text') required.push('image_url', 'title')
    if (type === 'product') required.push('product_id')

    for (const field of required) {
      const value = form[field]
      if (typeof value === 'string' && value.trim() === '') {
        setError(`${field.replace('_', ' ')} is required.`)
        return
      }
    }

    const partial: Partial<Announcement> = {
      content_type: type,
      title: form.title.trim() || null,
      body: form.body.trim() || null,
      image_url: form.image_url.trim() || null,
      cta_label: form.cta_label.trim() || null,
      cta_url: form.cta_url.trim() || null,
      product_id: form.product_id.trim() || null,
      product_ids: form.product_ids
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
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
}

function FieldsForm({ type, form, setField, error }: FieldsFormProps) {
  return (
    <div className="space-y-4">
      {/* Type-specific fields */}
      {(type === 'image' || type === 'image_text') && (
        <Field label="Image URL" required>
          {/* TODO: replace with searchable ImageUploadField when image upload integrates with mock-mode */}
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

      {type === 'product' && (
        <Field label="Product ID" required>
          {/* TODO: replace with searchable product select */}
          <Input
            value={form.product_id}
            onChange={(e) => setField('product_id', e.target.value)}
            placeholder="prod_…"
          />
        </Field>
      )}

      {type === 'specials_grid' && (
        <Field label="Product IDs (comma-separated)">
          {/* TODO: replace with searchable multi-product select */}
          <Input
            value={form.product_ids}
            onChange={(e) => setField('product_ids', e.target.value)}
            placeholder="prod_a, prod_b, prod_c"
          />
        </Field>
      )}

      {(type === 'text' ||
        type === 'image' ||
        type === 'image_text' ||
        type === 'product') && (
        <>
          <Field label="CTA label">
            <Input
              value={form.cta_label}
              onChange={(e) => setField('cta_label', e.target.value)}
              placeholder="Learn more"
            />
          </Field>
          {type !== 'product' && (
            <Field label="CTA URL">
              <Input
                value={form.cta_url}
                onChange={(e) => setField('cta_url', e.target.value)}
                placeholder="https://…"
              />
            </Field>
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
