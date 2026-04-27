import { AdminClientShell } from '@/components/admin/admin-client-shell'
import { AdminNav } from '@/components/admin/admin-nav'

export const dynamic = 'force-dynamic'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main>
        <div className="mx-auto max-w-6xl p-4 md:p-6">
          <AdminClientShell>{children}</AdminClientShell>
        </div>
      </main>
    </div>
  )
}
