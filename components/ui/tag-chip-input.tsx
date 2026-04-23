'use client'

import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface TagChipInputProps {
  value: string[]
  onChange: (next: string[]) => void
  suggestions?: string[]
  placeholder?: string
  id?: string
  className?: string
}

export function TagChipInput({
  value,
  onChange,
  suggestions = [],
  placeholder = '+ add',
  id,
  className,
}: TagChipInputProps) {
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = draft.trim()
  const matches = useMemo(() => {
    if (!trimmed) return []
    const lower = trimmed.toLowerCase()
    return suggestions
      .filter((s) => !value.includes(s) && s.toLowerCase().includes(lower))
      .slice(0, 6)
  }, [suggestions, value, trimmed])

  const showPopover = focused && matches.length > 0

  const commit = (raw: string) => {
    const tag = raw.trim()
    if (!tag) return
    if (value.includes(tag)) {
      setDraft('')
      return
    }
    onChange([...value, tag])
    setDraft('')
    setActiveIdx(0)
  }

  const remove = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
    inputRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (showPopover && matches[activeIdx]) {
        commit(matches[activeIdx])
      } else {
        commit(draft)
      }
      return
    }
    if (e.key === 'Backspace' && !draft && value.length > 0) {
      e.preventDefault()
      onChange(value.slice(0, -1))
      return
    }
    if (showPopover) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, matches.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Escape') {
        setDraft('')
      }
    }
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-1 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {value.length === 0 && !focused && (
          <span className="px-1 text-muted-foreground">(no tags yet)</span>
        )}
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(e) => {
                e.stopPropagation()
                remove(tag)
              }}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-secondary-foreground/70 hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
            >
              <span aria-hidden>×</span>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setActiveIdx(0)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => setFocused(false), 120)
          }}
          placeholder={value.length === 0 && focused ? placeholder : value.length === 0 ? '' : placeholder}
          className="flex-1 min-w-[6rem] bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showPopover && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <ul role="listbox" className="max-h-48 overflow-y-auto py-1">
            {matches.map((m, i) => (
              <li key={m}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    commit(m)
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={cn(
                    'flex w-full items-center px-3 py-1.5 text-left text-sm',
                    i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                  )}
                >
                  {m}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
