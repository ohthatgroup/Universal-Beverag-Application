import { describe, expect, it } from 'vitest'
import { toAbsoluteUrl } from '@/components/admin/copy-url-button'

describe('toAbsoluteUrl', () => {
  it('returns fully qualified URL unchanged', () => {
    expect(toAbsoluteUrl('https://example.com/path', 'http://localhost:3000')).toBe('https://example.com/path')
  })

  it('converts root-relative path to absolute URL', () => {
    expect(toAbsoluteUrl('/c/token123', 'http://localhost:3000')).toBe('http://localhost:3000/c/token123')
  })

  it('converts path without leading slash to absolute URL', () => {
    expect(toAbsoluteUrl('c/token123', 'http://localhost:3000')).toBe('http://localhost:3000/c/token123')
  })
})

