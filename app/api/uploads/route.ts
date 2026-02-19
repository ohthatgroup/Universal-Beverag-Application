import { apiOk, apiError, toErrorResponse, getRequestId, logApiEvent } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'

const ALLOWED_FOLDERS = ['products', 'brands', 'pallets']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

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

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const safeName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50)
    const path = `${folder}/${timestamp}-${safeName}.${ext}`

    const buffer = await file.arrayBuffer()

    const { error: uploadError } = await context.supabase.storage
      .from('images')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      logApiEvent(requestId, 'upload_storage_error', { error: uploadError.message })
      throw uploadError
    }

    const { data: publicUrlData } = context.supabase.storage
      .from('images')
      .getPublicUrl(path)

    logApiEvent(requestId, 'upload_success', {
      userId: context.userId,
      folder,
      path,
    })

    return apiOk({ url: publicUrlData.publicUrl }, 201, requestId)
  } catch (error) {
    logApiEvent(requestId, 'upload_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return toErrorResponse(error, requestId)
  }
}
