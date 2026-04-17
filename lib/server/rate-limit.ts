import { RouteError } from '@/lib/server/route-error'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface ConsumeRateLimitInput {
  key: string
  maxRequests: number
  windowMs: number
  now?: number
}

interface RateLimitResult {
  limit: number
  remaining: number
  resetAt: number
}

const GLOBAL_RATE_LIMIT_STORE_KEY = '__uba_rate_limit_store__'

type RateLimitStore = Map<string, RateLimitEntry>

function getRateLimitStore(): RateLimitStore {
  const globalScope = globalThis as typeof globalThis & {
    [GLOBAL_RATE_LIMIT_STORE_KEY]?: RateLimitStore
  }

  if (!globalScope[GLOBAL_RATE_LIMIT_STORE_KEY]) {
    globalScope[GLOBAL_RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitEntry>()
  }

  return globalScope[GLOBAL_RATE_LIMIT_STORE_KEY]
}

function pruneExpiredEntries(store: RateLimitStore, now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

export function getClientAddress(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfIp) return cfIp

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (!forwardedFor) return 'unknown'

  const firstAddress = forwardedFor
    .split(',')
    .map((part) => part.trim())
    .find(Boolean)

  return firstAddress || 'unknown'
}

export function buildRateLimitKey(
  scope: string,
  request: Request,
  extras: Array<string | null | undefined> = []
): string {
  return [scope, getClientAddress(request), ...extras.filter(Boolean)].join(':')
}

export function consumeRateLimit(input: ConsumeRateLimitInput): RateLimitResult {
  const now = input.now ?? Date.now()
  const store = getRateLimitStore()

  pruneExpiredEntries(store, now)

  const existing = store.get(input.key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + input.windowMs
    store.set(input.key, { count: 1, resetAt })
    return {
      limit: input.maxRequests,
      remaining: input.maxRequests - 1,
      resetAt,
    }
  }

  if (existing.count >= input.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    throw new RouteError(
      429,
      'rate_limited',
      'Too many requests. Please wait before trying again.',
      {
        retryAfterSeconds,
      }
    )
  }

  existing.count += 1
  store.set(input.key, existing)

  return {
    limit: input.maxRequests,
    remaining: input.maxRequests - existing.count,
    resetAt: existing.resetAt,
  }
}

export function getEnvRateLimit(
  maxEnvName: string,
  windowEnvName: string,
  fallback: { maxRequests: number; windowMs: number }
) {
  const rawMax = process.env[maxEnvName]
  const rawWindow = process.env[windowEnvName]

  const parsedMax = rawMax ? Number.parseInt(rawMax, 10) : Number.NaN
  const parsedWindow = rawWindow ? Number.parseInt(rawWindow, 10) : Number.NaN

  return {
    maxRequests: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : fallback.maxRequests,
    windowMs: Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : fallback.windowMs,
  }
}

export function resetRateLimitStoreForTests() {
  getRateLimitStore().clear()
}
