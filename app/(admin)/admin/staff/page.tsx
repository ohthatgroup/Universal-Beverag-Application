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
  const context = await requirePageAuth(['salesman'])
  const rows = (await listStaffRows()).map(mapStatus)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Invite and manage salesman accounts for the admin dashboard.
          </p>
        </div>

        <StaffInviteForm />
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        Salesmen are invite-only. An invite email sends the staff member into password setup, then
        they sign in through the normal admin login screen.
      </div>

      <StaffTableManager rows={rows} />

      <div className="text-sm text-muted-foreground">
        Signed in as {context.profile.contact_name ?? context.profile.email ?? 'salesman'}
      </div>
    </div>
  )
}
