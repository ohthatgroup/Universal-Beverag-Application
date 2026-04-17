import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next')
  const targetPath = next === '/auth/reset-password' ? '/auth/reset-password' : '/auth/login'
  const targetUrl = new URL(targetPath, origin)

  for (const [key, value] of searchParams.entries()) {
    if (key !== 'next') {
      targetUrl.searchParams.set(key, value)
    }
  }

  if (targetPath === '/auth/login' && next && next !== '/auth/login') {
    targetUrl.searchParams.set('redirect', next)
  }

  return NextResponse.redirect(targetUrl)
}
