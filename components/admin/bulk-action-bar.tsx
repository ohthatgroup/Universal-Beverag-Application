'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BulkActionBarProps {
  selectedCount: number
  onDelete: () => void
  onClear: () => void
  busy?: boolean
  deleteLabel?: string
  className?: string
}

export function BulkActionBar({
  selectedCount,
  onDelete,
  onClear,
  busy = false,
  deleteLabel = 'Delete',
  className,
}: BulkActionBarProps) {
  if (selectedCount <= 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-md border p-2', className)}>
      <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={busy}
        onClick={onDelete}
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        {deleteLabel}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  )
}
