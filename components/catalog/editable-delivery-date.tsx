'use client'

import { useRef, useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn, formatDeliveryDate } from '@/lib/utils'

interface EditableDeliveryDateProps {
  orderId: string
  token: string
  deliveryDate: string
  className?: string
}

// Tap the formatted date → reveal a native date picker, on commit PATCH
// the order in place. No reroute. 409 collisions surface as inline error.
export function EditableDeliveryDate({
  orderId,
  token,
  deliveryDate,
  className,
}: EditableDeliveryDateProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(deliveryDate)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const beginEdit = () => {
    setDraft(deliveryDate)
    setError(null)
    setEditing(true)
    // Defer focus + open the picker so the input renders first.
    setTimeout(() => {
      inputRef.current?.focus()
      // showPicker is a noop in unsupported browsers.
      try {
        inputRef.current?.showPicker?.()
      } catch {
        /* swallow — focusing is enough on platforms without showPicker */
      }
    }, 0)
  }

  const commit = (next: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next) || next === deliveryDate) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      try {
        const response = await fetch(`/api/portal/orders/${orderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-Token': token,
          },
          body: JSON.stringify({ deliveryDate: next }),
        })
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        if (!response.ok) {
          setError(payload?.error?.message ?? 'Failed to update date')
          return
        }
        setEditing(false)
        setError(null)
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Failed to update date')
      }
    })
  }

  return (
    <div className={cn('flex flex-col items-start', className)}>
      {editing ? (
        <input
          ref={inputRef}
          type="date"
          value={draft}
          disabled={pending}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit(draft)
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setEditing(false)
              setError(null)
            }
          }}
          // rounded-xl per doctrine Rule 5: text-style inputs are containers, not pills.
          className="rounded-xl border bg-background px-2 py-1 text-lg font-semibold leading-tight focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <button
          type="button"
          onClick={beginEdit}
          className="group inline-flex items-center gap-1.5 rounded-xl px-1.5 py-0.5 text-lg font-semibold leading-tight transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={`Change delivery date — currently ${formatDeliveryDate(deliveryDate)}`}
        >
          <span>{formatDeliveryDate(deliveryDate)}</span>
          <Pencil className="h-3.5 w-3.5 text-muted-foreground/60 transition-opacity group-hover:text-muted-foreground" />
        </button>
      )}
      {error && (
        <span className="mt-1 text-xs font-medium text-destructive">{error}</span>
      )}
    </div>
  )
}
