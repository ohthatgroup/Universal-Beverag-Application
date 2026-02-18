import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/types'
import { getAuthContext } from '@/lib/server/auth'

export async function requirePageAuth(allowedRoles?: UserRole[]) {
  const context = await getAuthContext().catch(() => ({ hasSession: false as const }))

  if (!('hasSession' in context) || !context.hasSession) {
    redirect('/auth/login')
  }

  if (allowedRoles && !allowedRoles.includes(context.profile.role)) {
    if (context.profile.role === 'salesman') {
      redirect('/admin/dashboard')
    }
    redirect('/')
  }

  return context
}
