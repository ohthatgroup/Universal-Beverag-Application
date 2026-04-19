import type { NextRequest } from 'next/server'
import { getAuth } from '@/lib/auth/server'

export default function middleware(request: NextRequest) {
  return getAuth().middleware({ loginUrl: '/auth/login' })(request)
}

export const config = {
  matcher: ['/admin/:path*'],
}
