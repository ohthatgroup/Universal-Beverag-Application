'use client'

import { useEffect, useState } from 'react'

interface HomepageGreetingProps {
  /** The customer's contact name (e.g. "Maya"). Empty falls back to greeting-only. */
  contactName: string | null
  /** The customer's business name (e.g. "Maya Deli"). Empty falls back to "you". */
  businessName: string | null
}

/**
 * The first thing customers see on the portal homepage. Personalized,
 * time-aware welcome that ticks every minute. Three lines:
 *
 *   1. "Good morning, Maya"             — period-of-day + first name
 *   2. "Today is Tuesday, May 4 · It's 4:15 PM"  — temporal context
 *   3. "What can we get for Maya Deli today?"     — lead-in to the fork
 *
 * Client component because (a) the period-of-day reads the browser's
 * local clock (server-side rendering would lie about the customer's
 * timezone) and (b) the time ticks live.
 */
export function HomepageGreeting({
  contactName,
  businessName,
}: HomepageGreetingProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Pre-hydration / SSR placeholder — render the static frame so layout doesn't
  // shift when the time string mounts. The time line just stays empty until
  // hydration; the greeting + question render immediately using a neutral
  // period of day.
  const greeting = now
    ? periodOfDayGreeting(now)
    : 'Hello'
  const dayLine = now ? formatDayLine(now) : null
  const personSuffix = contactName?.trim() ? `, ${contactName.trim()}` : ''
  const businessForQuestion = businessName?.trim() || contactName?.trim() || 'you'

  return (
    <header className="space-y-1 pt-2">
      <h1 className="text-2xl font-semibold tracking-tight">
        {greeting}
        {personSuffix}
      </h1>
      {dayLine && (
        <p className="text-sm text-muted-foreground">{dayLine}</p>
      )}
      <p className="pt-3 text-base text-foreground">
        What can we get for{' '}
        <span className="font-medium">{businessForQuestion}</span> today?
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
