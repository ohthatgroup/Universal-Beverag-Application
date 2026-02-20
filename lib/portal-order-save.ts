export interface PortalItemSavePayload {
  productId?: string | null
  palletDealId?: string | null
  quantity: number
  unitPrice: number
}

export function validatePortalItemSavePayload(payload: PortalItemSavePayload) {
  if (!payload.productId && !payload.palletDealId) {
    throw new Error('Autosave requires either productId or palletDealId')
  }
}

export function buildPortalItemSaveRequest(payload: PortalItemSavePayload) {
  validatePortalItemSavePayload(payload)

  if (payload.quantity === 0) {
    return {
      method: 'DELETE' as const,
      body: {
        productId: payload.productId ?? null,
        palletDealId: payload.palletDealId ?? null,
      },
    }
  }

  return {
    method: 'PUT' as const,
    body: {
      productId: payload.productId ?? null,
      palletDealId: payload.palletDealId ?? null,
      quantity: payload.quantity,
      unitPrice: Number(payload.unitPrice),
    },
  }
}
