import type { CatalogProduct } from '@/lib/types'
import type { ProductFamily } from '@/lib/server/schemas'
import { FAMILIES } from '@/lib/catalog/families'

export type FamilyCounts = Record<ProductFamily, number>

function emptyCounts(): FamilyCounts {
  return FAMILIES.reduce<FamilyCounts>((acc, family) => {
    acc[family.key] = 0
    return acc
  }, {} as FamilyCounts)
}

// Count visible catalog products per family. Includes products that also
// appear in usuals — counts reflect what the customer can browse, not
// "browse minus usuals."
export function productCountsByFamily(products: CatalogProduct[]): FamilyCounts {
  const counts = emptyCounts()
  for (const product of products) {
    const key = (product.product_family as ProductFamily) ?? 'other'
    if (key in counts) {
      counts[key] += 1
    } else {
      counts.other += 1
    }
  }
  return counts
}

// Count items currently in the order (quantity > 0) per family. Reads from
// the local quantities map keyed `product:${id}` — same shape OrderBuilder
// already maintains.
export function inOrderCountsByFamily(
  products: CatalogProduct[],
  quantities: Record<string, number>,
): FamilyCounts {
  const counts = emptyCounts()
  const familyById = new Map(
    products.map((product) => [product.id, (product.product_family as ProductFamily) ?? 'other']),
  )
  for (const [key, qty] of Object.entries(quantities)) {
    if (qty <= 0) continue
    if (!key.startsWith('product:')) continue
    const productId = key.slice('product:'.length)
    const family = familyById.get(productId)
    if (!family) continue
    if (family in counts) {
      counts[family] += qty
    } else {
      counts.other += qty
    }
  }
  return counts
}
