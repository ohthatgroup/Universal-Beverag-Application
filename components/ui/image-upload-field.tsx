'use client'

import { useState } from 'react'
import { ImageUpload } from '@/components/ui/image-upload'
import { Label } from '@/components/ui/label'

interface ImageUploadFieldProps {
  name: string
  label: string
  folder: string
  defaultValue?: string | null
}

/**
 * A wrapper around ImageUpload that stores the URL in a hidden input
 * so it works seamlessly with server action forms.
 */
export function ImageUploadField({ name, label, folder, defaultValue }: ImageUploadFieldProps) {
  const [url, setUrl] = useState(defaultValue ?? null)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={url ?? ''} />
      <ImageUpload value={url} onChange={setUrl} folder={folder} />
    </div>
  )
}
