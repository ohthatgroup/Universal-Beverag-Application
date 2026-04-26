'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { OrderStatusDot } from '@/components/ui/status-dot'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import { formatDeliveryDate } from '@/lib/utils'

interface HomepageHeroProps {
  /** Customer's contact name (e.g. "Maya"). Empty falls back to greeting-only. */
  contactName: string | null
  /** Customer's business name (e.g. "Maya Deli"). Empty falls back to "you". */
  businessName: string | null
  /** Magic-link token, used to build the resume-draft href. */
  token: string
  /** In-flight draft to surface as the glass card. Null hides the card. */
  primaryDraft: {
    id: string
    deliveryDate: string
    itemCount: number
  } | null
}

/**
 * The customer's first impression. A deep navy gradient panel with an
 * amber radial glow on the top-right corner, white display typography
 * for the greeting, and (when present) a glass-blur Resume Draft card
 * layered over the gradient.
 *
 * Time-aware: reads the browser's local clock and ticks every minute.
 * Pre-hydration the time line is suppressed and the period-of-day
 * defaults to a neutral "Hello" so the layout doesn't shift on hydration.
 */
export function HomepageHero({
  contactName,
  businessName,
  token,
  primaryDraft,
}: HomepageHeroProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const greeting = now ? periodOfDayGreeting(now) : 'Hello'
  const dayLine = now ? formatDayLine(now) : null
  const personSuffix = contactName?.trim() ? `, ${contactName.trim()}` : ''
  const businessForQuestion =
    businessName?.trim() || contactName?.trim() || 'you'

  const draftHref = primaryDraft
    ? buildCustomerOrderDeepLink(token, primaryDraft.id) ?? '#'
    : '#'

  return (
    <section
      className="
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-primary via-primary to-primary/85
        px-5 py-7 text-white shadow-xl
        md:px-8 md:py-10
      "
    >
      {/* Amber radial glow, top-right */}
      <div
        aria-hidden
        className="
          pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full
          bg-accent/40 blur-3xl
          md:-right-12 md:-top-12 md:h-72 md:w-72
        "
      />
      {/* Soft secondary highlight, bottom-left for depth */}
      <div
        aria-hidden
        className="
          pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full
          bg-white/5 blur-3xl
        "
      />

      <div className="relative space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {greeting}
            {personSuffix}
          </h1>
          {dayLine && (
            <p className="text-sm text-white/70">{dayLine}</p>
          )}
        </div>

        <p className="text-base text-white/90 md:text-lg">
          What can we get for{' '}
          <span className="font-semibold text-white">{businessForQuestion}</span>{' '}
          today?
        </p>

        {primaryDraft && (
          <Link
            href={draftHref}
            className="
              group mt-2 flex items-center gap-3
              rounded-xl border border-white/20 bg-white/15 px-4 py-3
              text-white shadow-md backdrop-blur-md
              transition-all hover:bg-white/20
            "
          >
            <OrderStatusDot status="draft" className="bg-accent" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">
                Resume draft for {formatDeliveryDate(primaryDraft.deliveryDate)}
              </div>
              <div className="text-xs text-white/70">
                {primaryDraft.itemCount}{' '}
                {primaryDraft.itemCount === 1 ? 'item' : 'items'}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </section>
  )
}

function periodOfDayGreeting(date: Date): string {
  const hour = date.getHours()
  if (hour < 5) return 'Good evening'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDayLine(date: Date): string {
  const dayName = date.toLocaleDateString(undefined, { weekday: 'long' })
  const monthDay = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  })
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `Today is ${dayName}, ${monthDay} · It's ${time}`
}
