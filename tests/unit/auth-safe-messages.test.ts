import { describe, expect, it } from 'vitest'
import {
  toSafeInviteSetupErrorMessage,
  toSafeLoginErrorMessage,
  toSafePasswordResetCompletionErrorMessage,
  toSafePasswordResetRequestErrorMessage,
} from '@/lib/auth/safe-messages'

describe('auth safe messages', () => {
  it('maps credential errors to a generic sign-in message', () => {
    expect(toSafeLoginErrorMessage({ message: 'Invalid credentials' })).toBe(
      'Unable to sign in. Check your credentials and try again.'
    )
  })

  it('maps auth rate limiting to a safe sign-in message', () => {
    expect(toSafeLoginErrorMessage({ message: 'Too many requests' })).toBe(
      'Too many sign-in attempts. Please wait before trying again.'
    )
  })

  it('maps password reset trigger failures to safe messages', () => {
    expect(toSafePasswordResetRequestErrorMessage({ message: 'Invalid redirectURL' })).toBe(
      'Unable to start password reset. Please try again.'
    )
    expect(toSafePasswordResetRequestErrorMessage({ message: 'Rate limit exceeded' })).toBe(
      'Too many password reset attempts. Please wait before trying again.'
    )
  })

  it('maps invalid reset tokens to a safe completion message', () => {
    expect(toSafePasswordResetCompletionErrorMessage({ message: 'Invalid token' })).toBe(
      'This password reset link or code is invalid or expired. Request a new reset email and try again.'
    )
  })

  it('maps unknown completion failures to a generic reset message', () => {
    expect(toSafePasswordResetCompletionErrorMessage({ message: 'Provider exploded' })).toBe(
      'Unable to reset password. Request a new reset email and try again.'
    )
  })

  it('maps invite setup failures to safe messages', () => {
    expect(toSafeInviteSetupErrorMessage({ code: 'invite_revoked' })).toBe(
      'This admin invite is no longer active. Ask an existing salesman to send you a new invite.'
    )
    expect(toSafeInviteSetupErrorMessage({ message: 'Password too short' })).toBe(
      'Password must be at least 8 characters.'
    )
  })
})
