'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { Subject } from '@/lib/server/admin-prompts'
import {
  TEMPLATE_KINDS,
  type TemplateKind,
} from '@/lib/server/message-templates'
import type { PromptDrawerProps } from './registry'

type Channel = 'whatsapp' | 'sms' | 'email'

interface ContactInfo {
  email: string | null
  phone: string | null
}

interface SubjectMeta {
  subject: Subject
  contact: ContactInfo
  contacted: boolean
  /** Optional related order id for nudges launched from order prompts. */
  relatedOrderId?: string
}

/**
 * Generic outreach drawer. Pre-checks every subject; renders per-row
 * channel buttons (WhatsApp / Text / Email — only the ones the
 * customer has). Click → open the channel's URI prefilled with the
 * rendered template AND log the outreach via
 * `POST /api/admin/customers/log-outreach`.
 *
 * `prompt.action.payload.templateKind` selects which template the
 * drawer renders. `prompt.subjects[].id` is treated as the customer
 * id; the drawer fetches contact info via
 * `/api/admin/customers?ids=<csv>` (slice 4 builds that endpoint
 * inline below).
 */
export function OutreachDrawer({ prompt, onClose }: PromptDrawerProps) {
  const templateKind = useMemo<TemplateKind | null>(() => {
    if (prompt.action.kind !== 'drawer') return null
    const kind = prompt.action.payload?.templateKind
    if (typeof kind !== 'string') return null
    return TEMPLATE_KINDS.includes(kind as TemplateKind)
      ? (kind as TemplateKind)
      : null
  }, [prompt.action])

  const [template, setTemplate] = useState<string>('')
  const [subjectMetas, setSubjectMetas] = useState<SubjectMeta[]>(
    prompt.subjects.map((subject) => ({
      subject,
      contact: { email: null, phone: null },
      contacted: false,
    })),
  )
  const [error, setError] = useState<string | null>(null)

  // Lazy-load template + per-subject contact info on open.
  useEffect(() => {
    let cancelled = false

    if (templateKind) {
      fetch('/api/admin/message-templates')
        .then(
          (r) =>
            r.json() as Promise<{
              data?: { templates?: Record<string, string> }
            }>,
        )
        .then((payload) => {
          if (cancelled) return
          const body = payload.data?.templates?.[templateKind]
          setTemplate(body ?? '')
        })
        .catch(() => {
          if (cancelled) return
          setError('Could not load message template.')
        })
    }

    const ids = prompt.subjects.map((s) => s.id)
    if (ids.length > 0) {
      fetch(`/api/admin/customers/contact-info?ids=${ids.join(',')}`)
        .then(
          (r) =>
            r.json() as Promise<{
              data?: {
                customers?: Array<{
                  id: string
                  email: string | null
                  phone: string | null
                }>
              }
            }>,
        )
        .then((payload) => {
          if (cancelled) return
          const byId = new Map(
            (payload.data?.customers ?? []).map((c) => [
              c.id,
              { email: c.email, phone: c.phone },
            ]),
          )
          setSubjectMetas((prev) =>
            prev.map((meta) => ({
              ...meta,
              contact: byId.get(meta.subject.id) ?? meta.contact,
            })),
          )
        })
        .catch(() => {
          if (cancelled) return
          setError('Could not load customer contact details.')
        })
    }

    return () => {
      cancelled = true
    }
  }, [prompt.subjects, templateKind])

  const renderTemplate = (
    body: string,
    vars: Record<string, string | number | null | undefined>,
  ) =>
    body.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = vars[key]
      if (value === null || value === undefined || value === '') return match
      return String(value)
    })

  const buildMessage = (meta: SubjectMeta): string =>
    renderTemplate(template, {
      businessName: meta.subject.label,
      days: extractDays(meta.subject.sublabel),
      deliveryDate: extractDeliveryDate(meta.subject.sublabel),
    })

  const handleChannel = async (
    meta: SubjectMeta,
    channel: Channel,
  ) => {
    const message = buildMessage(meta)
    const phone = meta.contact.phone ?? ''
    const email = meta.contact.email ?? ''

    let uri: string | null = null
    if (channel === 'whatsapp') {
      uri = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    } else if (channel === 'sms') {
      uri = `sms:${phone}?body=${encodeURIComponent(message)}`
    } else {
      uri = `mailto:${email}?body=${encodeURIComponent(message)}`
    }

    // Open the native-app handoff URI.
    window.open(uri, '_blank', 'noopener,noreferrer')

    // Log the outreach so the prompt suppression resolves correctly.
    try {
      await fetch('/api/admin/customers/log-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: meta.subject.id,
          channel,
          kind: templateKind ?? prompt.kind,
          messageSnapshot: message,
          relatedOrderId: meta.relatedOrderId,
        }),
      })
      setSubjectMetas((prev) =>
        prev.map((row) =>
          row.subject.id === meta.subject.id
            ? { ...row, contacted: true }
            : row,
        ),
      )
    } catch {
      setError('Could not log the outreach. Try again.')
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            {prompt.title}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Pick a channel per row. The customer&apos;s app opens with the
            message prefilled. We mark them contacted automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {template && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <div className="mb-1 font-medium text-foreground/80">
                Message
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {template}
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground/70">
                Edit globally in Settings → Message templates.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <ul className="divide-y rounded-md border">
            {subjectMetas.map((meta) => (
              <li
                key={meta.subject.id}
                className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {meta.subject.label}
                  </div>
                  {meta.subject.sublabel && (
                    <div className="truncate text-[11px] text-muted-foreground">
                      {meta.subject.sublabel}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {meta.contacted ? (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Contacted
                    </span>
                  ) : (
                    <>
                      {meta.contact.phone && (
                        <ChannelButton
                          icon={<MessageCircle className="h-3.5 w-3.5" />}
                          label="WhatsApp"
                          onClick={() => handleChannel(meta, 'whatsapp')}
                        />
                      )}
                      {meta.contact.phone && (
                        <ChannelButton
                          icon={<Phone className="h-3.5 w-3.5" />}
                          label="Text"
                          onClick={() => handleChannel(meta, 'sms')}
                        />
                      )}
                      {meta.contact.email && (
                        <ChannelButton
                          icon={<Mail className="h-3.5 w-3.5" />}
                          label="Email"
                          onClick={() => handleChannel(meta, 'email')}
                        />
                      )}
                      {!meta.contact.phone && !meta.contact.email && (
                        <span className="text-[11px] text-muted-foreground/70">
                          No contact info
                        </span>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t px-5 py-3">
          <Button variant="outline" onClick={onClose} className="ml-auto block">
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ChannelButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium',
        'hover:bg-muted/40 transition-colors',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/** Pull "12 days" out of "12 days since last order" → "12". */
function extractDays(sublabel?: string): string | null {
  if (!sublabel) return null
  const match = sublabel.match(/(\d+)\s*days?/)
  return match ? match[1]! : null
}

/** Pull a delivery date out of a sublabel that mentions one. */
function extractDeliveryDate(sublabel?: string): string | null {
  if (!sublabel) return null
  const match = sublabel.match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1]! : null
}
