'use client'

import Link from 'next/link'
import { ChevronRight, Paperclip } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { MomentDrawerProps } from './registry'

/**
 * Directory + inline image upload. Each row shows missing-field
 * badges; rows with `[no image]` get a small upload button that fires
 * `POST /api/admin/products/<id>/image`. The right-arrow link goes
 * to the product edit page for brand/pack fields.
 *
 * Note: the image upload endpoint is presumed to exist at
 * `/api/admin/products/<id>/image`; if not, slice 4 follow-up wires
 * it (the products edit page already has an image upload mechanism;
 * this drawer just kicks the same endpoint).
 */
export function ProductsMissingInfoDrawer({
  moment,
  onClose,
}: MomentDrawerProps) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            {moment.narrative}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Upload an image inline for missing-image rows, or click a
            row to fix brand and pack details on its edit page.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ul className="divide-y rounded-md border">
            {moment.subjects.map((subject) => (
              <ProductRow
                key={subject.id}
                subjectId={subject.id}
                label={subject.label}
                sublabel={subject.sublabel}
                onClose={onClose}
              />
            ))}
          </ul>
        </div>

        <div className="border-t px-5 py-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="ml-auto block"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface ProductRowProps {
  subjectId: string
  label: string
  sublabel?: string
  onClose: () => void
}

function ProductRow({ subjectId, label, sublabel, onClose }: ProductRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const missingImage = sublabel?.includes('image') ?? false
  const focus = pickFocusField(sublabel)
  const editHref = `/admin/catalog/${subjectId}${focus ? `?focus=${focus}` : ''}`

  const triggerUpload = () => fileInputRef.current?.click()

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`/api/admin/products/${subjectId}/image`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      // Successful upload — best-effort reload by closing the drawer.
      // The parent's `router.refresh()` is wired via `onCompleted`,
      // but for a single-row mutation in a directory drawer we can
      // just keep the drawer open and let the row refresh naturally
      // on the next prompt-band re-resolve.
    } catch {
      window.alert('Could not upload image. Try again from the edit page.')
    }
  }

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label}</div>
        {sublabel && (
          <div className="truncate text-[11px] text-muted-foreground">
            {sublabel}
          </div>
        )}
      </div>
      {missingImage && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={triggerUpload}
            className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted/40"
            aria-label="Upload image"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Upload
          </button>
        </>
      )}
      <Link
        href={editHref}
        onClick={onClose}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        aria-label={`Open ${label}`}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </li>
  )
}

function pickFocusField(sublabel?: string): string | null {
  if (!sublabel) return null
  if (sublabel.includes('brand')) return 'brand'
  if (sublabel.includes('pack')) return 'pack'
  return null
}
