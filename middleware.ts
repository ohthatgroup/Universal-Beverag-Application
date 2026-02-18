import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isStaticAsset =
    pathname === '/favicon.ico' ||
    pathname.startsWith('/_next') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)

  if (isStaticAsset || pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  const isCustomerRoute =
    pathname === '/' || pathname.startsWith('/orders') || pathname.startsWith('/order')
  const isAdminRoute = pathname.startsWith('/admin')
  const isApiRoute = pathname.startsWith('/api')
  const requiresPageAuth = isCustomerRoute || isAdminRoute

  if (isApiRoute || !requiresPageAuth) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role

  if (!role) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('error', 'profile_missing')
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute && role !== 'salesman') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (role === 'salesman' && isCustomerRoute) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  if (role === 'customer' && isAdminRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
