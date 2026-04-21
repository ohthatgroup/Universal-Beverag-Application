'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { Eye, Loader2, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandLogoSlotProps {
  name: string
  logoUrl: string | null
  editable: boolean
  onChange?: (nextUrl: string | null) => void
  folder?: string
}

const COLOR_CLASSES = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-yellow-100 text-yellow-700',
  'bg-lime-100 text-lime-700',
  'bg-green-100 text-green-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
  'bg-sky-100 text-sky-700',
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-purple-100 text-purple-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-pink-100 text-pink-700',
  'bg-rose-100 text-rose-700',
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function initialFor(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '·'
  return trimmed.charAt(0).toUpperCase()
}

export function BrandLogoSlot({
  name,
  logoUrl,
  editable,
  onChange,
  folder = 'brands',
}: BrandLogoSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const paletteIndex = hashName(name) % COLOR_CLASSES.length
  const paletteClass = COLOR_CLASSES[paletteIndex]

  const uploadFile = async (file: File) => {
    if (!onChange) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('folder', folder)
      const response = await fetch('/api/uploads', { method: 'POST', body })
      const payload = (await response.json().catch(() => null)) as
        | { data?: { url?: string | null } }
        | null
      const url = payload?.data?.url ?? null
      if (url) onChange(url)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="group relative h-10 w-10 shrink-0">
      {logoUrl ? (
        <div className="h-10 w-10 overflow-hidden rounded-md border bg-background">
          <Image
            src={logoUrl}
            alt={`${name} logo`}
            width={40}
            height={40}
            className="h-full w-full object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold',
            paletteClass
          )}
          aria-hidden="true"
        >
          {initialFor(name)}
        </div>
      )}

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/70">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Hover actions */}
      <div
        className={cn(
          'pointer-events-none absolute -bottom-1 -right-1 flex gap-0.5 opacity-0 transition-opacity',
          'group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'
        )}
      >
        {logoUrl && (
          <a
            href={logoUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border bg-background p-1 text-muted-foreground shadow-sm hover:text-foreground"
            aria-label="View logo"
            title="View logo"
          >
            <Eye className="h-3 w-3" />
          </a>
        )}
        {editable && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border bg-background p-1 text-muted-foreground shadow-sm hover:text-foreground"
              aria-label="Replace logo"
              title="Replace logo"
            >
              <Upload className="h-3 w-3" />
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => onChange?.(null)}
                className="rounded-full border bg-background p-1 text-destructive shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                aria-label="Remove logo"
                title="Remove logo"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </>
        )}
      </div>

      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void uploadFile(file)
            event.target.value = ''
          }}
        />
      )}
    </div>
  )
}
