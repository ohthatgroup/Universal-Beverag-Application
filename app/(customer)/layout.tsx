import { CustomerNav } from '@/components/layout/customer-nav'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-mobile flex-col bg-background pb-16">
      <main className="flex-1">{children}</main>
      <CustomerNav />
    </div>
  )
}
