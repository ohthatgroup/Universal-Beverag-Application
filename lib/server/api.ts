import { NextResponse } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { isRouteError } from '@/lib/server/route-error'

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface ApiSuccessBody<T> {
  data: T
}

export function getRequestId(request: Request): string {
  const incoming = request.headers.get('x-request-id')
  if (incoming) return incoming
  return crypto.randomUUID()
}

export function logApiEvent(
  requestId: string,
  event: string,
  metadata?: Record<string, unknown>
) {
  console.info(
    JSON.stringify({
      requestId,
      event,
      ...metadata,
      timestamp: new Date().toISOString(),
    })
  )
}

export function apiOk<T>(data: T, status = 200, requestId?: string) {
  const response = NextResponse.json<ApiSuccessBody<T>>({ data }, { status })
  if (requestId) {
    response.headers.set('x-request-id', requestId)
  }
  return response
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  requestId?: string
) {
  const response = NextResponse.json<ApiErrorBody>(
    { error: { code, message, details } },
    { status }
  )
  if (requestId) {
    response.headers.set('x-request-id', requestId)
  }
  return response
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const json = await request.json().catch(() => {
    throw new ZodError([
      {
        code: 'custom',
        path: [],
        message: 'Invalid JSON payload',
      },
    ])
  })

  return schema.parse(json)
}

export function toErrorResponse(error: unknown, requestId?: string) {
  if (error instanceof ZodError) {
    return apiError(
      400,
      'validation_error',
      'Invalid request payload',
      error.flatten(),
      requestId
    )
  }

  if (isRouteError(error)) {
    return apiError(error.status, error.code, error.message, error.details, requestId)
  }

  const message = error instanceof Error ? error.message : 'Unknown error'
  return apiError(500, 'internal_error', 'Unexpected server error', message, requestId)
}
