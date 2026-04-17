export class RouteError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isRouteError(error: unknown): error is RouteError {
  return error instanceof RouteError
}
