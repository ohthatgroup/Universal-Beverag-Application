'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Panel } from '@/components/ui/panel'
import {
  GroupOverridesPanel,
  type DirtyMap,
  type GroupOverrideRow,
} from '@/components/admin/group-overrides-panel'

interface EditGroupSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  customerBusinessName: string
  groupId: string
  groupName: string
  /** How many customers (incl. this one) belong to the group. Drives the
   *  propagation warning copy. */
  memberCount: number
  rows: GroupOverrideRow[]
}

type Stage =
  | { kind: 'editing' }
  | { kind: 'confirm' }
  | { kind: 'newGroup'; name: string; description: string }
  | { kind: 'submitting' }

/**
 * The "edit-anywhere" modal launched from `/admin/customers/[id]`.
 *
 * Body = `<GroupOverridesPanel>` editing the group this customer belongs
 * to — NOT customer-only overrides. Per-customer overrides went away in
 * migration 202604260007.
 *
 * Save flow:
 *   1. Click Save → confirm dialog stage. "Update [N] customers in
 *      [Group] — Continue / Save as new group?"
 *   2. Continue → flush each dirty row to the existing group.
 *   3. Save as new group → swap modal body to a name+description form
 *      (prefilled with `${customerBusinessName}'s segment`). On submit:
 *      a. POST /api/admin/customer-groups → newGroupId.
 *      b. PUT each dirty row with scope='group', scope_id=newGroupId.
 *      c. PATCH /api/admin/customers/[id] customerGroupId=newGroupId.
 *      d. router.refresh() so the parent picks up the new group label.
 *
 * Cancellation at any stage discards in-progress edits — no API calls
 * fired.
 */
export function EditGroupSettingsModal({
  open,
  onOpenChange,
  customerId,
  customerBusinessName,
  groupId,
  groupName,
  memberCount,
  rows,
}: EditGroupSettingsModalProps) {
  const router = useRouter()
  const [dirty, setDirty] = useState<DirtyMap>({})
  const [stage, setStage] = useState<Stage>({ kind: 'editing' })
  const [error, setError] = useState<string | null>(null)

  // Reset state when the modal opens — leftover edits from a prior open
  // shouldn't persist.
  useEffect(() => {
    if (open) {
      setDirty({})
      setStage({ kind: 'editing' })
      setError(null)
    }
  }, [open])

  const dirtyCount = Object.keys(dirty).length

  const flushDirty = async (scopeId: string): Promise<boolean> => {
    setError(null)
    for (const [announcementId, patch] of Object.entries(dirty)) {
      const body: Record<string, unknown> = {
        scope: 'group',
        scope_id: scopeId,
      }
      if ('is_hidden' in patch) body.is_hidden = patch.is_hidden ?? null
      if ('sort_order' in patch) body.sort_order = patch.sort_order ?? null
      try {
        const response = await fetch(
          `/api/admin/announcements/${announcementId}/overrides`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null
          setError(payload?.error?.message ?? 'Failed to save overrides.')
          return false
        }
      } catch {
        setError('Network error saving overrides.')
        return false
      }
    }
    return true
  }

  const onContinue = async () => {
    setStage({ kind: 'submitting' })
    const ok = await flushDirty(groupId)
    if (!ok) {
      setStage({ kind: 'confirm' })
      return
    }
    onOpenChange(false)
    router.refresh()
  }

  const onSaveAsNew = () => {
    setStage({
      kind: 'newGroup',
      name: `${customerBusinessName}'s segment`,
      description: '',
    })
  }

  const onSubmitNewGroup = async () => {
    if (stage.kind !== 'newGroup') return
    if (!stage.name.trim()) {
      setError('Group name is required.')
      return
    }
    const inProgressName = stage.name.trim()
    const inProgressDesc = stage.description.trim() || null
    setStage({ kind: 'submitting' })
    setError(null)
    try {
      // Step 1: create the group.
      const createResponse = await fetch('/api/admin/customer-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inProgressName,
          description: inProgressDesc,
        }),
      })
      if (!createResponse.ok) {
        const payload = (await createResponse.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? 'Failed to create group.')
        setStage({
          kind: 'newGroup',
          name: inProgressName,
          description: inProgressDesc ?? '',
        })
        return
      }
      const createBody = (await createResponse.json()) as {
        data?: { group?: { id: string } }
      }
      const newGroupId = createBody.data?.group?.id
      if (!newGroupId) {
        setError('Group created but no id returned.')
        setStage({
          kind: 'newGroup',
          name: inProgressName,
          description: inProgressDesc ?? '',
        })
        return
      }

      // Step 2: write overrides to the new group.
      const overridesOk = await flushDirty(newGroupId)
      if (!overridesOk) {
        // Group was created but overrides failed — leave it for now;
        // the salesman can retry from the customer page.
        setStage({
          kind: 'newGroup',
          name: inProgressName,
          description: inProgressDesc ?? '',
        })
        return
      }

      // Step 3: move the customer into the new group.
      const reassignResponse = await fetch(
        `/api/admin/customers/${customerId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerGroupId: newGroupId }),
        },
      )
      if (!reassignResponse.ok) {
        setError('Group + overrides created but customer reassignment failed.')
        setStage({
          kind: 'newGroup',
          name: inProgressName,
          description: inProgressDesc ?? '',
        })
        return
      }

      onOpenChange(false)
      router.refresh()
    } catch {
      setError('Network error during save-as-new flow.')
      setStage({
        kind: 'newGroup',
        name: inProgressName,
        description: inProgressDesc ?? '',
      })
    }
  }

  return (
    <Panel
      open={open}
      onOpenChange={onOpenChange}
      variant="centered"
      contentClassName="w-[calc(100vw-1.5rem)] max-w-xl max-h-[85dvh]"
      srTitle={`Edit settings for ${groupName}`}
    >
      <Panel.Header>
        <h2 className="flex-1 text-base font-semibold">
          {stage.kind === 'newGroup' ? 'Save as new group' : 'Group settings'}
        </h2>
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

        {stage.kind === 'newGroup' ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Creating a new group from {customerBusinessName}&apos;s in-progress
              edits. The original {groupName} group is left untouched. This
              customer becomes the only member of the new group.
            </p>
            <div className="space-y-1">
              <Label htmlFor="new-group-name">Group name</Label>
              <Input
                id="new-group-name"
                value={stage.name}
                onChange={(e) =>
                  setStage({ ...stage, name: e.target.value })
                }
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-group-description">
                Description (optional)
              </Label>
              <Input
                id="new-group-description"
                value={stage.description}
                onChange={(e) =>
                  setStage({ ...stage, description: e.target.value })
                }
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Editing settings for{' '}
              <span className="font-medium text-foreground">{groupName}</span>{' '}
              — affects {memberCount}{' '}
              {memberCount === 1 ? 'customer' : 'customers'}. Edits are
              held locally until you tap Save.
            </p>
            <GroupOverridesPanel
              rows={rows}
              dirty={dirty}
              onChange={setDirty}
              busy={stage.kind === 'submitting'}
            />
          </>
        )}
      </Panel.Body>

      <Panel.Footer className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={stage.kind === 'submitting'}
        >
          Cancel
        </Button>
        {stage.kind === 'editing' && (
          <Button
            onClick={() => setStage({ kind: 'confirm' })}
            disabled={dirtyCount === 0}
          >
            {dirtyCount === 0
              ? 'Save'
              : `Save (${dirtyCount} ${dirtyCount === 1 ? 'change' : 'changes'})`}
          </Button>
        )}
        {stage.kind === 'newGroup' && (
          <Button
            onClick={onSubmitNewGroup}
            disabled={!stage.name.trim()}
          >
            Create &amp; apply
          </Button>
        )}
        {stage.kind === 'submitting' && <Button disabled>Saving…</Button>}
      </Panel.Footer>

      {/* Confirm dialog overlays the modal — Panel allows nested by
          default since it portals. We render a second Panel with the
          'confirm' alert content. */}
      <Panel
        open={stage.kind === 'confirm'}
        onOpenChange={(next) => {
          if (!next && stage.kind === 'confirm') {
            setStage({ kind: 'editing' })
          }
        }}
        variant="centered"
        contentClassName="w-[calc(100vw-1.5rem)] max-w-md"
        srTitle="Confirm save"
      >
        <Panel.Header>
          <h2 className="flex-1 text-base font-semibold">
            Update {memberCount} {memberCount === 1 ? 'customer' : 'customers'}{' '}
            in {groupName}?
          </h2>
        </Panel.Header>
        <Panel.Body className="px-4 py-4 text-sm text-muted-foreground">
          Continue applies these {dirtyCount}{' '}
          {dirtyCount === 1 ? 'change' : 'changes'} to every customer in the{' '}
          {groupName} group. Save as new group keeps the original untouched
          and creates a new group with just {customerBusinessName}.
        </Panel.Body>
        <Panel.Footer className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setStage({ kind: 'editing' })}
          >
            Back
          </Button>
          <Button variant="outline" onClick={onSaveAsNew}>
            Save as new group
          </Button>
          <Button onClick={onContinue}>Continue</Button>
        </Panel.Footer>
      </Panel>
    </Panel>
  )
}
