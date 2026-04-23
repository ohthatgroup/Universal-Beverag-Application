export interface PresetListItem {
  id: string
  name: string
  description: string | null
  brandCount: number
  sizeCount: number
  productCount: number
}

export interface PresetBrandRule {
  brandId: string
  isHidden: boolean
  isPinned: boolean
}

export interface PresetSizeRule {
  sizeKey: string
  isHidden: boolean
}

export interface PresetProductRule {
  productId: string
  isHidden: boolean
  isPinned: boolean
}

export interface PresetDetail {
  id: string
  name: string
  description: string | null
  brandRules: PresetBrandRule[]
  sizeRules: PresetSizeRule[]
  productRules: PresetProductRule[]
}

interface ApiEnvelope<T> {
  data?: T
  error?: { code?: string; message?: string }
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null
  if (!response.ok || !envelope?.data) {
    const message = envelope?.error?.message ?? `Request failed (${response.status})`
    throw new Error(message)
  }
  return envelope.data
}

export const presetsClient = {
  list(): Promise<PresetListItem[]> {
    return request<PresetListItem[]>('/api/admin/presets')
  },

  create(payload: { name: string; description: string | null }): Promise<PresetListItem> {
    return request<PresetListItem>('/api/admin/presets', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  get(id: string): Promise<PresetDetail> {
    return request<PresetDetail>(`/api/admin/presets/${id}`)
  },

  update(
    id: string,
    payload: Partial<{
      name: string
      description: string | null
      brandRules: PresetBrandRule[]
      sizeRules: PresetSizeRule[]
      productRules: PresetProductRule[]
    }>
  ): Promise<{ id: string }> {
    return request<{ id: string }>(`/api/admin/presets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  remove(id: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/api/admin/presets/${id}`, {
      method: 'DELETE',
    })
  },

  applyToCustomer(presetId: string, customerId: string): Promise<{ applied: boolean }> {
    return request<{ applied: boolean }>(`/api/admin/presets/${presetId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    })
  },
}
