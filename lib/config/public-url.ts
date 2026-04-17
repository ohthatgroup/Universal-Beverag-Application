let hasLoggedEnvDriftWarning = false

function sanitizePath(path: string): string {
  if (!path.startsWith('/')) return '/'
  if (path.startsWith('//')) return '/'
  return path
}

function normalizeBaseUrl(rawUrl: string): string {
  return new URL(rawUrl).toString().replace(/\/$/, '')
}

function readConfiguredPublicUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL
  if (!configuredUrl?.trim()) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_APP_URL')
  }
  return configuredUrl
}

function validatePublicUrl(baseUrl: string) {
  const parsed = new URL(baseUrl)

  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error(`PUBLIC_APP_URL must use https in production. Received: ${baseUrl}`)
  }

  const envConfiguredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL
  if (envConfiguredUrl) {
    const normalizedEnvUrl = normalizeBaseUrl(envConfiguredUrl)
    if (normalizedEnvUrl !== baseUrl && !hasLoggedEnvDriftWarning) {
      hasLoggedEnvDriftWarning = true
      console.warn(
        `Configured env URL (${normalizedEnvUrl}) does not match resolved PUBLIC_APP_URL (${baseUrl}).`
      )
    }
  }
}

export function getPublicAppUrl(): string {
  const baseUrl = normalizeBaseUrl(readConfiguredPublicUrl())
  validatePublicUrl(baseUrl)
  return baseUrl
}

export function getInteractiveAppOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '')
  }

  return getPublicAppUrl()
}

export function buildAbsoluteUrl(path: string): string {
  const safePath = path.startsWith('/') ? path : `/${path}`
  return `${getPublicAppUrl()}${safePath}`
}

export function buildInteractiveUrl(path: string): string {
  const safePath = path.startsWith('/') ? path : `/${path}`
  return `${getInteractiveAppOrigin()}${safePath}`
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const safeNextPath = sanitizePath(nextPath)
  return `${getPublicAppUrl()}/auth/callback?next=${encodeURIComponent(safeNextPath)}`
}

export function buildPasswordResetCallbackUrl(): string {
  return buildAuthCallbackUrl('/auth/reset-password')
}
