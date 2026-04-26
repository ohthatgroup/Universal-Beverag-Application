export interface PortalItemSavePayload {
  productId: string
  /** Deprecated — pallets merged into announcements. Accepted for back-compat, ignored. */
  palletDealId?: string | null
  quantity: number
  unitPrice: number
}

export function validatePortalItemSavePayload(payload: PortalItemSavePayload) {
  if (!payload.productId) {
    throw new Error('Autosave requires productId')
  }
}

export function buildPortalItemSaveRequest(payload: PortalItemSavePayload) {
  validatePortalItemSavePayload(payload)

  if (payload.quantity === 0) {
    return {
      method: 'DELETE' as const,
      body: {
        productId: payload.productId,
      },
    }
  }

  return {
    method: 'PUT' as const,
    body: {
      productId: payload.productId,
      quantity: payload.quantity,
      unitPrice: Number(payload.unitPrice),
    },
  }
}
