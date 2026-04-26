import { apiOk, apiError, toErrorResponse, getRequestId, logApiEvent } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { storeUploadedAsset } from '@/lib/server/assets'
import { buildRateLimitKey, consumeRateLimit, getEnvRateLimit } from '@/lib/server/rate-limit'

const ALLOWED_FOLDERS = ['products', 'brands', 'announcements']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const uploadRateLimit = getEnvRateLimit('UPLOAD_RATE_LIMIT_MAX', 'UPLOAD_RATE_LIMIT_WINDOW_MS', {
  maxRequests: 24,
  windowMs: 5 * 60 * 1000,
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    const context = await requireAuthContext(['salesman'])

    const formData = await request.formData()
    const file = formData.get('file')
    const folder = (formData.get('folder') as string)?.trim()

    if (!file || !(file instanceof File)) {
      return apiError(400, 'validation_error', 'File is required', undefined, requestId)
    }

    if (!folder || !ALLOWED_FOLDERS.includes(folder)) {
      return apiError(
        400,
        'validation_error',
        `Folder must be one of: ${ALLOWED_FOLDERS.join(', ')}`,
        undefined,
        requestId
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError(400, 'validation_error', 'File size must be under 5 MB', undefined, requestId)
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError(
        400,
        'validation_error',
        `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
        undefined,
        requestId
      )
    }

    consumeRateLimit({
      key: buildRateLimitKey('asset-upload', request, [context.userId, folder]),
      ...uploadRateLimit,
    })

    const stored = await storeUploadedAsset(file, folder)

    logApiEvent(requestId, 'upload_success', {
      userId: context.userId,
      folder,
      path: stored.assetPath,
    })

    return apiOk({ url: stored.url }, 201, requestId)
  } catch (error) {
    logApiEvent(requestId, 'upload_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
