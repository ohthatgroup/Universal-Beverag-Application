import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { StaffInviteForm } from '@/components/admin/staff-invite-form'
import { StaffTableManager, type StaffListRow as StaffManagerRow } from '@/components/admin/staff-table-manager'
import { buildStaffInvitePath, buildStaffInviteToken, listStaffRows } from '@/lib/server/staff-invites'
import { requirePageAuth } from '@/lib/server/page-auth'

function mapStatus(row: Awaited<ReturnType<typeof listStaffRows>>[number]): StaffManagerRow {
  const status = row.disabled_at
    ? 'disabled'
    : row.invite_id && row.invite_status === 'pending'
      ? 'invited'
      : 'active'

  return {
    id: row.id,
    displayName: row.contact_name ?? row.business_name ?? row.email ?? row.id,
    email: row.email,
    status,
    disabled: Boolean(row.disabled_at),
    inviteUrl: row.invite_id && row.invite_status === 'pending'
      ? buildStaffInvitePath(buildStaffInviteToken(row.invite_id))
      : null,
    lastInviteSentAt: row.last_sent_at,
  }
}

export default async function StaffPage() {
  await requirePageAuth(['salesman'])
  const rows = (await listStaffRows()).map(mapStatus)

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin
        </Link>
        <h1 className="text-2xl font-semibold">Staff</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} member{rows.length === 1 ? '' : 's'}
        </p>
      </div>

      <StaffInviteForm />

      <StaffTableManager rows={rows} />
    </div>
  )
}
