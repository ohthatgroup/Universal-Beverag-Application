const EXPECTED_PUBLIC_HOST = 'universal-beverag-application.vercel.app'
let hasLoggedEnvDriftWarning = false

export const PUBLIC_APP_URL = 'https://universal-beverag-application.vercel.app'

function normalizeBaseUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl)
  const normalized = parsed.toString().replace(/\/$/, '')
  validatePublicUrl(normalized)
  return normalized
}

function validatePublicUrl(baseUrl: string) {
  const parsed = new URL(baseUrl)
  if (process.env.NODE_ENV === 'production') {
    if (parsed.protocol !== 'https:') {
      throw new Error(`PUBLIC_APP_URL must use https in production. Received: ${baseUrl}`)
    }
    if (parsed.hostname !== EXPECTED_PUBLIC_HOST) {
      throw new Error(
        `PUBLIC_APP_URL host must be ${EXPECTED_PUBLIC_HOST} in production. Received: ${parsed.hostname}`
      )
    }
  }

  const envConfiguredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL
  if (envConfiguredUrl) {
    const normalizedEnvUrl = new URL(envConfiguredUrl).toString().replace(/\/$/, '')
    if (normalizedEnvUrl !== baseUrl) {
      const message = `Configured env URL (${normalizedEnvUrl}) does not match pinned PUBLIC_APP_URL (${baseUrl}).`
      if (!hasLoggedEnvDriftWarning) {
        hasLoggedEnvDriftWarning = true
        console.warn(message)
      }
    }
  }
}

function sanitizePath(path: string): string {
  if (!path.startsWith('/')) return '/'
  if (path.startsWith('//')) return '/'
  return path
}

export function getPublicAppUrl(): string {
  return normalizeBaseUrl(PUBLIC_APP_URL)
}

export function buildAbsoluteUrl(path: string): string {
  const safePath = path.startsWith('/') ? path : `/${path}`
  return `${getPublicAppUrl()}${safePath}`
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const safeNextPath = sanitizePath(nextPath)
  return `${getPublicAppUrl()}/auth/callback?next=${encodeURIComponent(safeNextPath)}`
}
