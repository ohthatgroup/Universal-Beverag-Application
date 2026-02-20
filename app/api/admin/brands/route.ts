import { z } from 'zod'
import { apiOk, getRequestId, parseBody, toErrorResponse } from '@/lib/server/api'
import { requireAuthContext } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const createBrandSchema = z.object({
  name: z.string().trim().min(1),
  logoUrl: z.string().url().nullable().optional(),
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  try {
    await requireAuthContext(['salesman'])
    const payload = await parseBody(request, createBrandSchema)
    const admin = createAdminClient()

    const { data: highestSort, error: sortError } = await admin
      .from('brands')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sortError) {
      throw sortError
    }

    const { data: created, error: createError } = await admin
      .from('brands')
      .insert({
        name: payload.name,
        logo_url: payload.logoUrl ?? null,
        sort_order: Number(highestSort?.sort_order ?? -1) + 1,
      })
      .select('id,name,logo_url,sort_order')
      .single()

    if (createError) {
      throw createError
    }

    return apiOk(created, 201, requestId)
  } catch (error) {
    return toErrorResponse(error, requestId)
  }
}
