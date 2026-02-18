import { describe, expect, it } from 'vitest'
import { addDays, buildCsv, formatCurrency, formatDeliveryDate, todayISODate } from '@/lib/utils'

describe('utils', () => {
  it('formats delivery date without timezone shifts', () => {
    expect(formatDeliveryDate('2026-02-18')).toBe('Feb 18, 2026')
  })

  it('adds days to an ISO date', () => {
    expect(addDays('2026-02-18', 2)).toBe('2026-02-20')
  })

  it('builds CSV with escaping', () => {
    const csv = buildCsv(
      [
        { Product: 'Cola', Notes: 'Plain' },
        { Product: 'Diet "Zero"', Notes: 'Line1\nLine2' },
      ],
      ['Product', 'Notes']
    )

    expect(csv).toContain('Product,Notes')
    expect(csv).toContain('Cola,Plain')
    expect(csv).toContain('"Diet ""Zero""","Line1\nLine2"')
  })

  it('formats currency in full and compact mode', () => {
    expect(formatCurrency(21.5)).toBe('$21.50')
    expect(formatCurrency(1560, { compact: true })).toMatch(/^\$1\.6K$/)
  })

  it('returns a valid local ISO date for today', () => {
    expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
