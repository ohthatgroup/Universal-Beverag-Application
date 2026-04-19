function readMessage(input: unknown): string {
  if (typeof input === 'string') {
    return input
  }

  if (input && typeof input === 'object' && 'message' in input) {
    const message = input.message
    if (typeof message === 'string') {
      return message
    }
  }

  return ''
}

function includesAny(source: string, patterns: string[]) {
  return patterns.some((pattern) => source.includes(pattern))
}

export function toSafeLoginErrorMessage(error: unknown): string {
  const message = readMessage(error).trim().toLowerCase()

  if (!message) {
    return 'Unable to sign in. Check your credentials and try again.'
  }

  if (includesAny(message, ['too many', 'rate limit', 'try again later'])) {
    return 'Too many sign-in attempts. Please wait before trying again.'
  }

  if (
    includesAny(message, [
      'invalid credential',
      'invalid email',
      'invalid password',
      'wrong password',
      'email or password',
      'unauthorized',
    ])
  ) {
    return 'Unable to sign in. Check your credentials and try again.'
  }

  return 'Unable to sign in right now. Please try again.'
}

export function toSafePasswordResetRequestErrorMessage(error: unknown): string {
  const message = readMessage(error).trim().toLowerCase()

  if (includesAny(message, ['too many', 'rate limit', 'try again later'])) {
    return 'Too many password reset attempts. Please wait before trying again.'
  }

  return 'Unable to start password reset. Please try again.'
}

export function toSafePasswordResetCompletionErrorMessage(error: unknown): string {
  const message = readMessage(error).trim().toLowerCase()

  if (!message) {
    return 'Unable to reset password. Request a new reset email and try again.'
  }

  if (includesAny(message, ['too many', 'rate limit', 'try again later'])) {
    return 'Too many reset attempts. Please wait before trying again.'
  }

  if (
    includesAny(message, [
      'expired',
      'invalid token',
      'invalid code',
      'invalid otp',
      'otp',
      'token',
      'reset link',
      'verification link',
      'session',
    ])
  ) {
    return 'This password reset link or code is invalid or expired. Request a new reset email and try again.'
  }

  return 'Unable to reset password. Request a new reset email and try again.'
}
