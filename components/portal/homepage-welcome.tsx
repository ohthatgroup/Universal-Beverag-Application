'use client'

import { useEffect, useState } from 'react'

interface HomepageWelcomeProps {
  /** Customer's contact name (e.g. "Maya"). Empty falls back to greeting-only. */
  contactName: string | null
  /** Customer's business name (e.g. "Maya Deli"). Empty falls back to "you". */
  businessName: string | null
}

/**
 * The customer's first impression — type-driven, no effects.
 *
 *   Good evening, Maya
 *   Saturday, April 25 · 9:03 PM
 *
 *   What can we get for Maya Deli today?
 *
 * Time-aware: reads the browser's local clock and ticks every minute.
 * Pre-hydration the time line is suppressed and the period-of-day
 * defaults to "Hello" so the layout doesn't shift on hydration.
 */
export function HomepageWelcome({
  contactName,
  businessName,
}: HomepageWelcomeProps) {
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

  return (
    <header className="space-y-1.5 pt-2">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {greeting}
        {personSuffix}
      </h1>
      {dayLine && (
        <p className="text-sm text-muted-foreground">{dayLine}</p>
      )}
      <p className="pt-3 text-base text-foreground md:text-lg">
        What can we get for{' '}
        <span className="font-semibold">{businessForQuestion}</span> today?
      </p>
    </header>
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
