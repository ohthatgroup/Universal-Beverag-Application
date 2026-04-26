'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface CustomerGroupRow {
  id: string
  name: string
  description: string | null
  sortOrder: number
  memberCount: number
}

interface CustomerGroupsManagerProps {
  initialGroups: CustomerGroupRow[]
}

interface ApiGroup {
  id: string
  name: string
  description: string | null
  sort_order: number
  member_count: number
}

function apiToRow(g: ApiGroup): CustomerGroupRow {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    sortOrder: g.sort_order,
    memberCount: Number(g.member_count ?? 0),
  }
}

/**
 * Customer Groups admin manager.
 *
 * Surface:
 *   - Inline create row (name + optional description) — POST.
 *   - Per-row inline-edit for name + description — PATCH on save.
 *   - Per-row delete with confirm — DELETE (cascades group-scope overrides
 *     server-side; profiles.customer_group_id ON DELETE SET NULL clears
 *     membership).
 *   - Member count is read-only here; managed from the customer-edit page.
 */
export function CustomerGroupsManager({
  initialGroups,
}: CustomerGroupsManagerProps) {
  const [groups, setGroups] = useState<CustomerGroupRow[]>(initialGroups)
  const [creatingName, setCreatingName] = useState('')
  const [creatingDesc, setCreatingDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyRowId, setBusyRowId] = useState<string | null>(null)

  const surfaceError = async (response: Response, fallback: string) => {
    try {
      const payload = (await response.json()) as
        | { error?: { message?: string } }
        | null
      setError(payload?.error?.message ?? fallback)
    } catch {
      setError(fallback)
    }
  }

  const createGroup = async () => {
    const name = creatingName.trim()
    if (!name) {
      setError('Name is required.')
      return
    }
    setError(null)
    setCreating(true)
    try {
      const response = await fetch('/api/admin/customer-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: creatingDesc.trim() || null,
        }),
      })
      if (!response.ok) {
        await surfaceError(response, 'Failed to create group.')
        return
      }
      const body = (await response.json()) as { data?: { group?: ApiGroup } }
      const created = body.data?.group
      if (!created) {
        setError('Created, but the server returned no row. Refresh.')
        return
      }
      setGroups((prev) => [...prev, apiToRow(created)])
      setCreatingName('')
      setCreatingDesc('')
    } catch {
      setError('Failed to create group.')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (group: CustomerGroupRow) => {
    setEditingId(group.id)
    setEditName(group.name)
    setEditDesc(group.description ?? '')
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDesc('')
  }

  const saveEdit = async (id: string) => {
    const name = editName.trim()
    if (!name) {
      setError('Name is required.')
      return
    }
    setError(null)
    setBusyRowId(id)
    const previous = groups
    setGroups((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, name, description: editDesc.trim() || null }
          : g,
      ),
    )
    try {
      const response = await fetch(`/api/admin/customer-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: editDesc.trim() || null,
        }),
      })
      if (!response.ok) {
        setGroups(previous)
        await surfaceError(response, 'Failed to update group.')
        return
      }
      const body = (await response.json()) as { data?: { group?: ApiGroup } }
      const updated = body.data?.group
      if (updated) {
        setGroups((prev) => prev.map((g) => (g.id === id ? apiToRow(updated) : g)))
      }
      cancelEdit()
    } catch {
      setGroups(previous)
      setError('Failed to update group.')
    } finally {
      setBusyRowId(null)
    }
  }

  const deleteGroup = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Delete "${name}"? Customers in this group will be unassigned, and any deal overrides set at this group level will be removed.`,
    )
    if (!confirmed) return
    setError(null)
    setBusyRowId(id)
    const previous = groups
    setGroups((prev) => prev.filter((g) => g.id !== id))
    try {
      const response = await fetch(`/api/admin/customer-groups/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        setGroups(previous)
        await surfaceError(response, 'Failed to delete group.')
        return
      }
    } catch {
      setGroups(previous)
      setError('Failed to delete group.')
    } finally {
      setBusyRowId(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Inline create row */}
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            placeholder="New group name (e.g. Downtown delis)"
            className="sm:w-64"
            disabled={creating}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                createGroup()
              }
            }}
          />
          <Input
            value={creatingDesc}
            onChange={(e) => setCreatingDesc(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1"
            disabled={creating}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                createGroup()
              }
            }}
          />
          <Button
            type="button"
            onClick={createGroup}
            disabled={creating || !creatingName.trim()}
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Adding…' : 'Add group'}
          </Button>
        </div>
      </div>

      {/* Group list */}
      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No customer groups yet. Create one above to start grouping customers
          for shared deal ordering or visibility.
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="w-28 px-4 py-3 text-left font-medium">
                  Members
                </th>
                <th className="w-32 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const isEditing = editingId === group.id
                const isBusy = busyRowId === group.id
                return (
                  <tr key={group.id} className="border-b last:border-0">
                    <td className="px-4 py-3 align-top font-medium">
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          disabled={isBusy}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              saveEdit(group.id)
                            } else if (e.key === 'Escape') {
                              cancelEdit()
                            }
                          }}
                        />
                      ) : (
                        group.name
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      {isEditing ? (
                        <Input
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Description"
                          disabled={isBusy}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              saveEdit(group.id)
                            } else if (e.key === 'Escape') {
                              cancelEdit()
                            }
                          }}
                        />
                      ) : (
                        group.description ?? (
                          <span className="text-muted-foreground/60">—</span>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      {group.memberCount}
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div
                        className={cn(
                          'flex items-center justify-end gap-1',
                          isBusy && 'opacity-60',
                        )}
                      >
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => saveEdit(group.id)}
                              disabled={isBusy || !editName.trim()}
                              aria-label="Save"
                              title="Save"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEdit}
                              disabled={isBusy}
                              aria-label="Cancel"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEdit(group)}
                              disabled={isBusy}
                              aria-label={`Edit ${group.name}`}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteGroup(group.id, group.name)}
                              disabled={isBusy}
                              aria-label={`Delete ${group.name}`}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
