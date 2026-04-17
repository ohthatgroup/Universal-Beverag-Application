import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/types'
import { getAuthContext, isRouteError } from '@/lib/server/auth'

export async function requirePageAuth(allowedRoles?: UserRole[]) {
  const context = await getAuthContext().catch((error) => {
    if (isRouteError(error)) {
      if (error.code === 'admin_disabled') {
        redirect('/auth/login?error=admin_disabled')
      }
      if (error.code === 'profile_missing') {
        redirect('/auth/login?error=profile_missing')
      }
    }
    return { hasSession: false as const }
  })

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
