'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Panel } from '@/components/ui/panel'

interface NewCustomerGroupDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the new group's id after a successful POST. The parent
   *  picker uses this to update its `value` and append the new group to
   *  its local cache. */
  onCreated: (group: { id: string; name: string }) => void
}

/**
 * Inline drawer launched from `<CustomerTypePicker>` when the salesman
 * picks "+ Create new…". POSTs to /api/admin/customer-groups; on success
 * notifies the parent (which selects the new group in its form) and
 * closes.
 *
 * Lives as a centered Panel instead of an actual side-sheet — same
 * primitive everything else uses, less new chrome.
 */
export function NewCustomerGroupDrawer({
  open,
  onOpenChange,
  onCreated,
}: NewCustomerGroupDrawerProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setBusy(false)
      setError(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/customer-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? 'Failed to create group.')
        return
      }
      const body = (await response.json()) as {
        data?: { group?: { id: string; name: string } }
      }
      const created = body.data?.group
      if (!created) {
        setError('Group created but no row returned. Refresh.')
        return
      }
      onCreated(created)
      onOpenChange(false)
    } catch {
      setError('Network error creating group.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      open={open}
      onOpenChange={onOpenChange}
      variant="centered"
      contentClassName="w-[calc(100vw-1.5rem)] max-w-md"
      srTitle="New customer group"
    >
      <Panel.Header>
        <h2 className="flex-1 text-base font-semibold">New customer group</h2>
      </Panel.Header>
      <Panel.Body className="space-y-3 px-4 py-4">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="new-group-name">Name</Label>
          <Input
            id="new-group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Downtown delis"
            autoFocus
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-group-desc">Description (optional)</Label>
          <Input
            id="new-group-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What makes this group different?"
            disabled={busy}
          />
        </div>
      </Panel.Body>
      <Panel.Footer className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : 'Create group'}
        </Button>
      </Panel.Footer>
    </Panel>
  )
}
