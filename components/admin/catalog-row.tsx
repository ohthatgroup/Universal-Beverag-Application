import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CatalogRowData {
  id: string
  title: string
  brandName: string | null
  packLabel: string | null
  imageUrl: string | null
  /** Effective customer-facing case price. */
  price: number
  isNew: boolean
  isDiscontinued: boolean
  /** Number of active deals containing this product (0 = no chip). */
  inActiveDealsCount: number
}

/**
 * One catalog row — mirrors the customer's product tile content
 * (image, title, brand, pack, price) with admin overlay (status,
 * in-deals chip, edit verb). Full-width tappable; entire row is the
 * edit link.
 *
 * Image: square thumbnail with white background and contained padding,
 * matching the customer ProductTile's contained-image treatment.
 */
export function CatalogRow({ row }: { row: CatalogRowData }) {
  const status = row.isDiscontinued
    ? 'Discontinued'
    : row.isNew
      ? 'New'
      : 'Active'

  return (
    <Link
      href={`/admin/catalog/${row.id}`}
      className={cn(
        'group/row flex items-center gap-4 border-b border-foreground/10 px-2 py-3 transition-colors',
        'hover:bg-muted/40 last:border-0',
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-white sm:h-20 sm:w-20">
        {row.imageUrl ? (
          <Image
            src={row.imageUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 80px, 64px"
            className="object-contain p-2"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 p-2">
            <span className="line-clamp-3 text-center text-[10px] font-bold leading-tight text-muted-foreground">
              {row.title}
            </span>
          </div>
        )}
      </div>

      {/* Title + brand · pack */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-medium leading-tight text-foreground">
          {row.title}
        </h3>
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
          {[row.brandName, row.packLabel].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>

      {/* Right-side admin fields. Stack on mobile, inline on sm+. */}
      <div className="flex shrink-0 flex-col items-end gap-1 text-[12.5px] sm:flex-row sm:items-baseline sm:gap-3">
        <span className="font-medium tabular-nums text-foreground">
          ${row.price.toFixed(2)}
        </span>
        <span
          className={cn(
            'text-[11px] uppercase tracking-[0.1em]',
            row.isDiscontinued
              ? 'text-destructive/80'
              : row.isNew
                ? 'text-[hsl(var(--success))]'
                : 'text-muted-foreground/70',
          )}
        >
          {status}
        </span>
        {row.inActiveDealsCount > 0 && (
          <span className="text-[11px] text-muted-foreground/70">
            in {row.inActiveDealsCount} deal{row.inActiveDealsCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <span
        className="hidden shrink-0 items-center gap-1 text-[13px] font-medium text-[hsl(var(--primary))] sm:inline-flex"
        aria-hidden
      >
        Edit
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/row:-translate-y-0.5 group-hover/row:translate-x-0.5" />
      </span>
    </Link>
  )
}
