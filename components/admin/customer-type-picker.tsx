'use client'

import { useState } from 'react'
import { NewCustomerGroupDrawer } from '@/components/admin/new-customer-group-drawer'

export interface GroupOption {
  id: string
  name: string
  isDefault?: boolean
}

interface CustomerTypePickerProps {
  groups: GroupOption[]
  value: string | null
  onChange: (groupId: string) => void
  /** Default group's id — the picker pins it at the top with a badge. */
  defaultGroupId: string
  /** Optional id for the underlying select (label association). */
  id?: string
  name?: string
  disabled?: boolean
  /** When provided AND `value` is null, the select renders a leading
   *  disabled placeholder option with this label. Used by drawers
   *  that require an explicit selection (e.g. bulk-assign-group). */
  placeholder?: string
}

/** Sentinel value for the "+ Create new…" option. Picked → opens the
 *  inline drawer; never set as the form value. */
const CREATE_NEW = '__create_new__'

/**
 * Customer "Type" picker — a select with each existing group and a
 * "+ Create new…" sentinel that opens `<NewCustomerGroupDrawer>`. On
 * successful create, the new group is selected and added to the local
 * cache so it appears in subsequent renders without a page reload.
 *
 * Used in:
 *   - `<NewCustomerDialog>` (customer-create) — required field, default = Default group.
 *   - `<CustomerEditForm>` (customer-edit) — replaces the bare `<select>`.
 *
 * The picker assumes `groups` already contains the Default group (the
 * RSC fetches all groups including Default; see migration 202604260007
 * which seeds it).
 */
export function CustomerTypePicker({
  groups,
  value,
  onChange,
  defaultGroupId,
  id,
  name,
  disabled = false,
  placeholder,
}: CustomerTypePickerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [extraGroups, setExtraGroups] = useState<GroupOption[]>([])

  // Prefer the parent's groups; append any newly-created ones we
  // haven't seen yet (parent RSC won't have re-fetched).
  const allGroups = [...groups]
  for (const extra of extraGroups) {
    if (!allGroups.some((g) => g.id === extra.id)) {
      allGroups.push(extra)
    }
  }

  // Default first, then the rest by name.
  const sorted = [...allGroups].sort((a, b) => {
    if (a.id === defaultGroupId) return -1
    if (b.id === defaultGroupId) return 1
    return a.name.localeCompare(b.name)
  })

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value
    if (next === CREATE_NEW) {
      setDrawerOpen(true)
      // Don't change value yet; restore the previous selection by
      // forcing the select back to its current value on the next render.
      return
    }
    onChange(next)
  }

  return (
    <>
      <select
        id={id}
        name={name}
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      >
        {placeholder && value === null && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {sorted.map((group) => (
          <option key={group.id} value={group.id}>
            {group.id === defaultGroupId ? `${group.name} (default)` : group.name}
          </option>
        ))}
        <option disabled>──────────</option>
        <option value={CREATE_NEW}>+ Create new…</option>
      </select>

      <NewCustomerGroupDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCreated={(created) => {
          setExtraGroups((prev) => [...prev, created])
          onChange(created.id)
        }}
      />
    </>
  )
}
