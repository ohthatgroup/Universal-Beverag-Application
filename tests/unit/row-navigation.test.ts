import { describe, expect, it, vi } from 'vitest'
import { isInteractiveRowTarget } from '@/lib/row-navigation'

describe('isInteractiveRowTarget', () => {
  it('returns true when target matches an interactive selector', () => {
    const closest = vi.fn(() => ({}))
    const target = { closest } as unknown as EventTarget

    expect(isInteractiveRowTarget(target)).toBe(true)
    expect(closest).toHaveBeenCalledTimes(1)
  })

  it('returns false when target does not match interactive selector', () => {
    const target = { closest: () => null } as unknown as EventTarget
    expect(isInteractiveRowTarget(target)).toBe(false)
  })

  it('returns false for non-element-like targets', () => {
    expect(isInteractiveRowTarget(null)).toBe(false)
    expect(isInteractiveRowTarget({} as EventTarget)).toBe(false)
  })
})
