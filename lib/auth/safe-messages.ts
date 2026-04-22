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

function readCode(input: unknown): string {
  if (input && typeof input === 'object' && 'code' in input) {
    const code = input.code
    if (typeof code === 'string') {
      return code
    }
  }

  return ''
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

export function toSafeInviteSetupErrorMessage(error: unknown): string {
  const code = readCode(error).trim().toLowerCase()
  const message = readMessage(error).trim().toLowerCase()

  if (code === 'invite_accepted') {
    return 'This admin invite has already been used. Sign in from the normal admin login screen.'
  }

  if (code === 'invite_revoked') {
    return 'This admin invite is no longer active. Ask an existing salesman to send you a new invite.'
  }

  if (code === 'invite_disabled') {
    return 'This admin account is currently disabled. Contact another salesman if you need access restored.'
  }

  if (code === 'invite_account_exists') {
    return 'This admin account already exists. Sign in from the normal admin login screen or reset your password if needed.'
  }

  if (includesAny(code, ['invite_invalid']) || includesAny(message, ['invalid', 'expired'])) {
    return 'This admin invite link is invalid or has expired. Ask for a new invite and try again.'
  }

  if (includesAny(code, ['rate_limited']) || includesAny(message, ['too many', 'rate limit', 'try again later'])) {
    return 'Too many invite setup attempts. Please wait before trying again.'
  }

  if (includesAny(code, ['validation_error']) || includesAny(message, ['password too short', 'at least 8 characters'])) {
    return 'Password must be at least 8 characters.'
  }

  return 'Unable to finish invite setup right now. Please try again or sign in from the normal admin login screen.'
}
