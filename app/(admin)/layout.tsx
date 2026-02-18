import { AdminNav } from '@/components/layout/admin-nav'
import { AdminSidebar } from '@/components/layout/admin-sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex flex-col md:pl-60">
        <main className="flex-1 pb-20 md:pb-0">
          <div className="mx-auto max-w-6xl p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      <AdminNav />
    </div>
  )
}
