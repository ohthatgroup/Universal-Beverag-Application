import { apiOk, getRequestId, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { getRequestDb } from '@/lib/server/db'
import { resolveAllMessageTemplates } from '@/lib/server/message-templates'

export async function GET(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const db = await getRequestDb()
    const templates = await resolveAllMessageTemplates(db)
    return apiOk({ templates }, 200, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
