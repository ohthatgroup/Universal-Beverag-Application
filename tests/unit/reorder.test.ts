import { describe, expect, it } from 'vitest'
import { moveSelectedRows, reorderByDrag } from '@/lib/reorder'

const rows = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
  { id: 'd', label: 'D' },
]

describe('reorderByDrag', () => {
  it('moves row to target position', () => {
    const next = reorderByDrag(rows, 'd', 'b')
    expect(next.map((row) => row.id)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('returns original rows for unknown ids', () => {
    const next = reorderByDrag(rows, 'x', 'b')
    expect(next).toBe(rows)
  })
})

describe('moveSelectedRows', () => {
  it('moves selected rows to top preserving their relative order', () => {
    const next = moveSelectedRows(rows, new Set(['b', 'd']), 'top')
    expect(next.map((row) => row.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('moves selected rows to bottom preserving their relative order', () => {
    const next = moveSelectedRows(rows, new Set(['a', 'c']), 'bottom')
    expect(next.map((row) => row.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('moves selected rows to a 1-based position', () => {
    const next = moveSelectedRows(rows, new Set(['c']), 'position', 2)
    expect(next.map((row) => row.id)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('returns original rows when all rows are selected', () => {
    const next = moveSelectedRows(rows, new Set(['a', 'b', 'c', 'd']), 'top')
    expect(next).toBe(rows)
  })
})

