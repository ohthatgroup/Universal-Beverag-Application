// Resolves the "Default" customer_groups id, cached per request via React
// `cache()`. Single source of truth for the Default-group lookup so the
// migration's seeded row is referenced by name (not by a hard-coded UUID).
//
// The Default group is created by migration
// 202604260007_admin_rebuild_groups_only_targeting.sql with name='Default'
// (case-insensitive unique). After that migration, every customer is
// assigned to it on creation if no other group is chosen.

import { cache } from 'react'
import { getRequestDb } from '@/lib/server/db'

export const resolveDefaultGroupId = cache(async (): Promise<string> => {
  const db = await getRequestDb()
  const { rows } = await db.query<{ id: string }>(
    `select id from customer_groups where lower(name) = 'default' limit 1`,
  )
  const id = rows[0]?.id
  if (!id) {
    // The migration seeds this row; if it's missing in production we want a
    // loud failure rather than silent fallback to NULL group_id.
    throw new Error(
      'Default customer_groups row not found. Migration 202604260007 must run first.',
    )
  }
  return id
})

/** True iff the supplied id matches the Default group. Used for the
 *  delete-guard in /api/admin/customer-groups/[id]. */
export async function isDefaultGroup(id: string): Promise<boolean> {
  const defaultId = await resolveDefaultGroupId()
  return defaultId === id
}
