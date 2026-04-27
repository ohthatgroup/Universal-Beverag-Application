'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { usePromptDrawer } from '@/components/admin/prompt-drawers/registry'
import type { Doorway, Moment } from '@/lib/server/admin-prompts'
import { cn } from '@/lib/utils'

/**
 * The fade-down stream — the universal moment renderer.
 *
 * Takes a flat `Moment[]` already sorted by descending weight, and
 * lays them down the page in a single column whose typographic
 * volume fades from headline → subhead → body → footnote as the
 * eye descends. The first moment commands the page; subsequent
 * moments defer in volume and indentation.
 *
 * Empty state is a single typographic sentence — the page stays
 * honest about what's there.
 *
 * Behaviour:
 *   - Up to 1 moment with weight ≥ 0.85 renders as HEADLINE.
 *     If multiple, the rest become SUBHEAD.
 *   - Up to 1 moment with weight ≥ 0.55 renders as SUBHEAD.
 *   - Moments with weight ≥ 0.25 render as BODY.
 *   - Moments below 0.25 render as FOOTNOTE.
 *   - any-time moments are detached from the fade and rendered as
 *     a separate "Any time" line at the bottom.
 *
 * Each moment renders: narrative · when · primary verb · "Or:" + ghosted secondaries.
 */
export function MomentStream({
  moments,
  emptyState,
}: {
  moments: Moment[]
  emptyState?: ReactNode
}) {
  const live = moments.filter((m) => m.category !== 'any-time')
  const anytime = moments.filter((m) => m.category === 'any-time')

  if (live.length === 0) {
    return (
      <div className="space-y-12">
        {emptyState ?? <DefaultEmpty />}
        {anytime.length > 0 && <AnyTimeRow moments={anytime} />}
      </div>
    )
  }

  // Tier the live moments by weight. Each tier may absorb at most 1
  // headline-rank moment; the rest tumble down a tier.
  const sorted = [...live].sort((a, b) => b.weight - a.weight)
  const tiered: Array<{ moment: Moment; tier: Tier }> = []
  let usedHeadline = false
  let usedSubhead = false
  for (const moment of sorted) {
    let tier: Tier
    if (!usedHeadline && moment.weight >= 0.85) {
      tier = 'headline'
      usedHeadline = true
    } else if (!usedSubhead && moment.weight >= 0.55) {
      tier = 'subhead'
      usedSubhead = true
    } else if (moment.weight >= 0.25) {
      tier = 'body'
    } else {
      tier = 'footnote'
    }
    tiered.push({ moment, tier })
  }

  return (
    <div className="space-y-14">
      <ol className="space-y-12">
        {tiered.map(({ moment, tier }) => (
          <li key={moment.id}>
            <MomentRow moment={moment} tier={tier} />
          </li>
        ))}
      </ol>

      {anytime.length > 0 && <AnyTimeRow moments={anytime} />}
    </div>
  )
}

type Tier = 'headline' | 'subhead' | 'body' | 'footnote'

const TIER_INDENT: Record<Tier, string> = {
  headline: 'pl-0',
  subhead: 'pl-6 sm:pl-12',
  body: 'pl-10 sm:pl-20',
  footnote: 'pl-12 sm:pl-24',
}

const TIER_NARRATIVE: Record<Tier, string> = {
  headline:
    'font-serif text-[28px] leading-[1.18] tracking-[-0.012em] text-foreground sm:text-[34px]',
  subhead:
    'font-sans text-[20px] leading-[1.3] tracking-[-0.005em] text-foreground sm:text-[22px]',
  body: 'font-sans text-[16px] leading-[1.45] text-foreground/95 sm:text-[17px]',
  footnote: 'font-sans text-[13px] leading-[1.5] text-foreground/85',
}

const TIER_WHEN: Record<Tier, string> = {
  headline: 'text-[12px] uppercase tracking-[0.16em] text-muted-foreground/70',
  subhead: 'text-[11px] uppercase tracking-[0.14em] text-muted-foreground/65',
  body: 'text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60',
  footnote: 'text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground/60',
}

const TIER_VERB: Record<Tier, string> = {
  headline: 'text-[17px] font-normal leading-none tracking-[-0.005em]',
  subhead: 'text-[15px] font-medium leading-none tracking-[-0.003em]',
  body: 'text-[14px] font-medium leading-none',
  footnote: 'text-[13px] font-medium leading-none',
}

const TIER_OR: Record<Tier, string> = {
  headline: 'text-[14px]',
  subhead: 'text-[13px]',
  body: 'text-[12.5px]',
  footnote: 'text-[12px]',
}

const TIER_GAP: Record<Tier, string> = {
  headline: 'mt-7',
  subhead: 'mt-5',
  body: 'mt-3',
  footnote: 'mt-2',
}

function MomentRow({ moment, tier }: { moment: Moment; tier: Tier }) {
  return (
    <article className={cn('space-y-0', TIER_INDENT[tier])}>
      {moment.when && (
        <p className={cn('mb-2', TIER_WHEN[tier])}>{moment.when}</p>
      )}
      <h2 className={cn(TIER_NARRATIVE[tier], 'text-balance')}>
        {moment.narrative}
      </h2>

      <div className={cn('flex flex-wrap items-baseline gap-x-3', TIER_GAP[tier])}>
        <PrimaryVerb
          doorway={moment.primary}
          moment={moment}
          className={TIER_VERB[tier]}
        />
      </div>

      {moment.secondary.length > 0 && (
        <p className={cn('mt-1.5', TIER_OR[tier])}>
          <span className="italic text-muted-foreground/70">Or: </span>
          {moment.secondary.map((door, i) => (
            <span key={door.label}>
              <SecondaryVerb doorway={door} moment={moment} />
              {i < moment.secondary.length - 1 && (
                <span aria-hidden className="mx-2 text-muted-foreground/40">
                  ·
                </span>
              )}
            </span>
          ))}
        </p>
      )}
    </article>
  )
}

function PrimaryVerb({
  doorway,
  moment,
  className,
}: {
  doorway: Doorway
  moment: Moment
  className?: string
}) {
  const drawer = usePromptDrawer()
  const onClick = () => {
    if (doorway.action.kind === 'drawer') {
      drawer.open(doorway.action.drawerKind, moment)
    }
  }

  const baseClass = cn(
    'group/verb inline-flex items-baseline gap-1.5 text-[hsl(var(--primary))] underline-offset-[6px] transition-colors hover:text-foreground hover:underline',
    className,
  )

  if (doorway.action.kind === 'href') {
    return (
      <Link href={doorway.action.href} className={baseClass}>
        {doorway.label}
        <ArrowUpRight
          className="h-[0.85em] w-[0.85em] self-center transition-transform group-hover/verb:-translate-y-0.5 group-hover/verb:translate-x-0.5"
          aria-hidden
        />
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {doorway.label}
      <ArrowUpRight
        className="h-[0.85em] w-[0.85em] self-center transition-transform group-hover/verb:-translate-y-0.5 group-hover/verb:translate-x-0.5"
        aria-hidden
      />
    </button>
  )
}

function SecondaryVerb({
  doorway,
  moment,
}: {
  doorway: Doorway
  moment: Moment
}) {
  const drawer = usePromptDrawer()
  const baseClass =
    'inline text-muted-foreground/85 underline-offset-[5px] transition-colors hover:text-foreground hover:underline'

  if (doorway.action.kind === 'href') {
    return (
      <Link href={doorway.action.href} className={baseClass}>
        {doorway.label}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={() => {
        if (doorway.action.kind === 'drawer') {
          drawer.open(doorway.action.drawerKind, moment)
        }
      }}
      className={baseClass}
    >
      {doorway.label}
    </button>
  )
}

function AnyTimeRow({ moments }: { moments: Moment[] }) {
  if (moments.length === 0) return null
  return (
    <div className="border-t border-foreground/10 pt-6">
      <p className="text-[13px]">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
          Any time:&nbsp;&nbsp;
        </span>
        {moments.map((moment, i) => (
          <span key={moment.id}>
            <SecondaryVerb doorway={moment.primary} moment={moment} />
            {i < moments.length - 1 && (
              <span aria-hidden className="mx-2 text-muted-foreground/40">
                ·
              </span>
            )}
          </span>
        ))}
      </p>
    </div>
  )
}

function DefaultEmpty() {
  return (
    <p className="font-serif text-[28px] leading-[1.2] tracking-[-0.012em] text-foreground sm:text-[32px]">
      Quiet morning.
    </p>
  )
}

