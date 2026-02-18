import { describe, expect, it } from 'vitest'
import {
  cloneOrderSchema,
  createOrGetDraftSchema,
  updateOrderStatusSchema,
} from '@/lib/server/schemas'

describe('server schemas', () => {
  it('accepts create/get draft payload', () => {
    const payload = createOrGetDraftSchema.parse({ deliveryDate: '2026-02-20' })
    expect(payload.deliveryDate).toBe('2026-02-20')
  })

  it('rejects bad delivery date', () => {
    expect(() => createOrGetDraftSchema.parse({ deliveryDate: '02-20-2026' })).toThrow()
  })

  it('accepts valid status transitions payload values', () => {
    for (const status of ['draft', 'submitted', 'delivered'] as const) {
      expect(updateOrderStatusSchema.parse({ status }).status).toBe(status)
    }
  })

  it('validates clone order payload', () => {
    const payload = cloneOrderSchema.parse({ deliveryDate: '2026-02-22' })
    expect(payload.deliveryDate).toBe('2026-02-22')
  })
})
