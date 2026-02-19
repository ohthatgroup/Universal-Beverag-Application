'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  folder: string
  className?: string
  compact?: boolean
  iconOnly?: boolean
}

export function ImageUpload({ value, onChange, folder, className, compact = false, iconOnly = false }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)

        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          const msg =
            payload && 'error' in payload
              ? payload.error?.message ?? 'Upload failed'
              : 'Upload failed'
          setError(msg)
          return
        }

        const url = payload?.data?.url
        if (url) {
          onChange(url)
        } else {
          setError('Upload succeeded but no URL returned')
        }
      } catch {
        setError('Network error - please try again')
      } finally {
        setIsUploading(false)
      }
    },
    [folder, onChange]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
    // Reset input so re-selecting the same file works
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) upload(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  if (iconOnly) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border text-muted-foreground transition-colors hover:border-primary hover:text-primary',
              isUploading && 'pointer-events-none opacity-60'
            )}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="Uploaded image" className="h-full w-full object-cover" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </button>
          {value ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-9 w-9"
              onClick={() => onChange(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded image"
            className={cn(compact ? 'h-16 w-16' : 'h-24 w-24', 'rounded-md border object-cover')}
          />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -right-2 -top-2 h-6 w-6"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          disabled={isUploading}
          className={cn(
            compact
              ? 'flex h-16 w-full items-center justify-center rounded-md border-2 border-dashed text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary'
              : 'flex h-24 w-full items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary',
            dragOver && 'border-primary bg-primary/5 text-primary',
            isUploading && 'pointer-events-none opacity-60'
          )}
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Click or drop image
            </span>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

