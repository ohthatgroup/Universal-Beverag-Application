import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const next = searchParams.get('next')
  const targetPath = next === '/auth/reset-password' ? '/auth/reset-password' : '/auth/login'
  const targetSearchParams = new URLSearchParams()

  for (const [key, value] of searchParams.entries()) {
    if (key !== 'next') {
      targetSearchParams.set(key, value)
    }
  }

  if (targetPath === '/auth/login' && next && next !== '/auth/login') {
    targetSearchParams.set('redirect', next)
  }

  const pathAndQuery = targetSearchParams.size > 0 ? `${targetPath}?${targetSearchParams}` : targetPath

  return new Response(null, {
    status: 307,
    headers: {
      location: pathAndQuery,
    },
  })
}
