'use client'

import { type ReactNode } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ListToolbarProps {
  /** The search input element, typically <LiveQueryInput />. Takes up flex-1. */
  search?: ReactNode
  /** Optional custom slot rendered between search and edit (e.g. filter chips). */
  extra?: ReactNode
  /** Current edit-mode state. When undefined, the edit toggle is not rendered. */
  editMode?: boolean
  /** Called when the edit pencil is clicked. */
  onEditModeChange?: (next: boolean) => void
  /** Called when the add button is clicked. When undefined, no add button renders. */
  onAdd?: () => void
  /** Accessible label for the add button. */
  addLabel?: string
  /** Tooltip override for the edit button. */
  editTitle?: string
  className?: string
}

export function ListToolbar({
  search,
  extra,
  editMode,
  onEditModeChange,
  onAdd,
  addLabel = 'Add',
  editTitle,
  className,
}: ListToolbarProps) {
  const showEdit = typeof editMode === 'boolean' && onEditModeChange
  const showAdd = Boolean(onAdd)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {search ? <div className="min-w-0 flex-1">{search}</div> : <div className="flex-1" />}
      {extra}
      {showEdit && (
        <Button
          type="button"
          size="icon"
          variant={editMode ? 'default' : 'outline'}
          aria-label={editMode ? 'Exit edit mode' : 'Enter edit mode'}
          title={editTitle ?? (editMode ? 'Exit edit mode' : 'Edit')}
          onClick={() => onEditModeChange(!editMode)}
        >
          {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </Button>
      )}
      {showAdd && (
        <Button
          type="button"
          size="icon"
          aria-label={addLabel}
          title={addLabel}
          onClick={onAdd}
          className="hidden sm:inline-flex"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
