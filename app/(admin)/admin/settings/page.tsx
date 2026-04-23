import { AccountSettingsForm } from '@/components/admin/account-settings-form'
import { PageHeader } from '@/components/ui/page-header'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'

export default async function AdminSettingsPage() {
  const auth = await requirePageAuth(['salesman'])
  const db = await getRequestDb()

  const { rows } = await db.query<{ office_email: string | null }>(
    `select office_email from profiles where id = $1 limit 1`,
    [auth.userId]
  )
  const initialOfficeEmail = rows[0]?.office_email ?? null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Your account preferences"
      />
      <AccountSettingsForm initialOfficeEmail={initialOfficeEmail} />
    </div>
  )
}
