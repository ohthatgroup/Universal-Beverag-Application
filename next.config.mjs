import { withSentryConfig } from '@sentry/nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: 'https',
            hostname: supabaseHost,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
  widenClientFileUpload: false,
})
