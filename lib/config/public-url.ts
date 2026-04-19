let hasLoggedEnvDriftWarning = false

function sanitizePath(path: string): string {
  if (!path.startsWith('/')) return '/'
  if (path.startsWith('//')) return '/'
  return path
}

function normalizeBaseUrl(rawUrl: string): string {
  return new URL(rawUrl).toString().replace(/\/$/, '')
}

function isValidUrl(rawUrl: string): boolean {
  try {
    new URL(rawUrl)
    return true
  } catch {
    return false
  }
}

function isHttpsUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).protocol === 'https:'
  } catch {
    return false
  }
}

function getConfiguredPublicUrlCandidates(): string[] {
  return [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
}

function readConfiguredPublicUrl(): string {
  const candidates = getConfiguredPublicUrlCandidates()
  const validCandidates = candidates.filter(isValidUrl)

  if (validCandidates.length === 0) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_APP_URL')
  }

  if (process.env.NODE_ENV === 'production') {
    const secureCandidate = validCandidates.find(isHttpsUrl)
    if (secureCandidate) {
      return secureCandidate
    }
  }

  return validCandidates[0]
}

function validatePublicUrl(baseUrl: string) {
  const parsed = new URL(baseUrl)

  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error(`PUBLIC_APP_URL must use https in production. Received: ${baseUrl}`)
  }

  const envConfiguredUrl = getConfiguredPublicUrlCandidates()
  if (envConfiguredUrl.length > 0) {
    const normalizedEnvUrls = envConfiguredUrl.filter(isValidUrl).map(normalizeBaseUrl)
    if (!normalizedEnvUrls.includes(baseUrl) && !hasLoggedEnvDriftWarning) {
      hasLoggedEnvDriftWarning = true
      console.warn(
        `Configured env URLs (${normalizedEnvUrls.join(', ')}) do not include resolved PUBLIC_APP_URL (${baseUrl}).`
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
