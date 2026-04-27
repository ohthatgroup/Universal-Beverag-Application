'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { usePromptDrawer } from '@/components/admin/prompt-drawers/registry'
import { cn } from '@/lib/utils'
import type { Prompt } from '@/lib/server/admin-prompts'

interface CreateCardBaseProps {
  icon: LucideIcon
  count?: number | null
  countLabel?: string
  headline: string
  description: string
}

interface CreateCardLinkProps extends CreateCardBaseProps {
  kind: 'link'
  href: string
}

interface CreateCardDrawerProps extends CreateCardBaseProps {
  kind: 'drawer'
  drawerKind: string
}

export type CreateCardProps = CreateCardLinkProps | CreateCardDrawerProps

/**
 * Single create-grid card. Count + icon + headline + description.
 * Tappable as a whole; clicking either opens the registered drawer
 * (for creatable cards) or navigates to the linked page (Settings).
 *
 * Settings card omits the count — the description does the teaching.
 */
export function CreateCard(props: CreateCardProps) {
  const drawer = usePromptDrawer()
  const Icon = props.icon

  const inner = (
    <>
      <div className="flex items-baseline justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {typeof props.count === 'number' && (
          <span className="text-[12px] tabular-nums text-muted-foreground/80">
            {props.count.toLocaleString()}
            {props.countLabel ? ` ${props.countLabel}` : ''}
          </span>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <h3 className="text-[15px] font-medium leading-snug text-foreground">
          {props.headline}
        </h3>
        <p className="text-[13px] leading-snug text-muted-foreground">
          {props.description}
        </p>
      </div>
    </>
  )

  const cardClass = cn(
    'group/card flex h-full flex-col rounded-xl border border-foreground/10 bg-card p-4',
    'transition-colors hover:bg-muted/40',
  )

  if (props.kind === 'link') {
    return (
      <Link href={props.href} className={cardClass}>
        {inner}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={() => drawer.open(props.drawerKind, asPromptShim(props))}
      className={cn(cardClass, 'text-left')}
    >
      {inner}
    </button>
  )
}

function asPromptShim(props: CreateCardDrawerProps): Prompt {
  return {
    id: `create/${props.drawerKind}`,
    category: 'evergreen',
    kind: props.drawerKind,
    severity: 'info',
    title: props.headline,
    subjects: [],
    count: 0,
    cta: props.headline,
    action: { kind: 'drawer', drawerKind: props.drawerKind },
  }
}
