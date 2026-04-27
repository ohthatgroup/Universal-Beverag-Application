import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth/server'
import { getAuthContext, isRouteError } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export default async function PostLoginPage() {
  const context = await getAuthContext().catch((error) => {
    if (isRouteError(error) && error.code === 'profile_missing') {
      redirect('/auth/login?error=profile_missing')
    }

    if (isRouteError(error) && error.code === 'admin_disabled') {
      void getAuth().signOut().catch(() => undefined)
      redirect('/auth/login?error=admin_disabled')
    }

    return { hasSession: false as const }
  })

  if (!('hasSession' in context) || !context.hasSession) {
    redirect('/auth/login')
  }

  if (context.profile.role === 'salesman') {
    redirect('/admin')
  }

  redirect('/auth/login?error=admin_only')
}
