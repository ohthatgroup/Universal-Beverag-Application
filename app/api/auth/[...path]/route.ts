import { getAuth } from '@/lib/auth/server'

type AuthHandlers = ReturnType<ReturnType<typeof getAuth>['handler']>
type AuthRouteHandler = NonNullable<AuthHandlers['GET']>

function route(method: keyof AuthHandlers) {
  return (...args: Parameters<AuthRouteHandler>) => {
    const handler = getAuth().handler()[method] as AuthRouteHandler
    return handler(...args)
  }
}

export const GET = route('GET')
export const POST = route('POST')
export const PUT = route('PUT')
export const PATCH = route('PATCH')
export const DELETE = route('DELETE')
