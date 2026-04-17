import path from 'node:path'
import { fileURLToPath } from 'node:url'

const assetBaseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const configDir = path.dirname(fileURLToPath(import.meta.url))

function toRemotePattern(rawUrl, pathname = '/**') {
  if (!rawUrl) return null

  const url = new URL(rawUrl)
  return {
    protocol: url.protocol.replace(':', ''),
    hostname: url.hostname,
    port: url.port || undefined,
    pathname,
  }
}

const remotePatterns = [
  toRemotePattern(assetBaseUrl),
  toRemotePattern(supabaseUrl, '/storage/v1/object/public/**'),
].filter(Boolean)

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: configDir,
  images: {
    remotePatterns,
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

export default nextConfig
