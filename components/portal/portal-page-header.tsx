'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BackProp = { href: string } | 'history'

interface PortalPageHeaderProps {
  back?: BackProp
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
  sticky?: boolean
}

export function PortalPageHeader({
  back,
  title,
  subtitle,
  action,
  className,
  sticky,
}: PortalPageHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-3 pb-2',
        sticky && 'sticky top-0 z-20 -mx-4 bg-background/90 px-4 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {back ? <BackButton back={back} /> : null}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  )
}

function BackButton({ back }: { back: BackProp }) {
  const router = useRouter()
  if (back === 'history') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Back"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
    )
  }
  return (
    <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Back">
      <Link href={back.href}>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  )
}
