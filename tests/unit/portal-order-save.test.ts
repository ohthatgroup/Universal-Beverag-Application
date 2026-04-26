import { describe, expect, it } from 'vitest'
import { buildPortalItemSaveRequest } from '@/lib/portal-order-save'

describe('buildPortalItemSaveRequest', () => {
  it('throws when productId is missing', () => {
    expect(() =>
      // @ts-expect-error — intentionally missing productId for the negative test
      buildPortalItemSaveRequest({
        quantity: 1,
        unitPrice: 10,
      })
    ).toThrow('Autosave requires productId')
  })

  it('builds a DELETE request when quantity is zero', () => {
    expect(
      buildPortalItemSaveRequest({
        productId: 'prod-1',
        quantity: 0,
        unitPrice: 12.5,
      })
    ).toEqual({
      method: 'DELETE',
      body: {
        productId: 'prod-1',
      },
    })
  })

  it('builds a PUT request when quantity is greater than zero', () => {
    expect(
      buildPortalItemSaveRequest({
        productId: 'prod-1',
        quantity: 3,
        unitPrice: 8.75,
      })
    ).toEqual({
      method: 'PUT',
      body: {
        productId: 'prod-1',
        quantity: 3,
        unitPrice: 8.75,
      },
    })
  })
})
