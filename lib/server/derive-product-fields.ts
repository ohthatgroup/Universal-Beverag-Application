import {
  FAMILY_FIELD_MATRIX,
  type BrowseModel,
  type ProductFamily,
  type WaterType,
} from '@/lib/server/schemas'

// Inputs the derivation reads. Caller resolves `brandName` from `brand_id`
// before calling — this module is pure (no DB).
export interface DeriveInput {
  title: string
  brandName: string | null
  pack_count: number | null
  size_value: number | null
  size_uom: string | null
  pack_details: string | null
  product_family: ProductFamily
}

// Fields the derivation can populate. Each is also a column on `products`,
// surfaced through `productCreateSchema` / `productUpdateSchema`.
export interface DerivedFields {
  pack_key: string | null
  subline: string | null
  water_type: WaterType | null
  is_sparkling: boolean
  is_diet: boolean
  is_zero_sugar: boolean
  is_caffeine_free: boolean
  search_aliases: string[] | null
}

// Default container per family for pack_key when pack_details has no hint.
// Soda/water default to PET because that is the dominant retail format; energy
// & coffee default to can. Other families fall through to 'unit' which the
// curator can correct.
const FAMILY_DEFAULT_CONTAINER: Record<ProductFamily, string> = {
  soda: 'pet',
  water: 'pet',
  sports_hydration: 'pet',
  tea_juice: 'pet',
  energy_coffee: 'can',
  other: 'unit',
}

function detectContainer(
  packDetails: string | null,
  title: string,
  family: ProductFamily
): string {
  // Search pack_details first (more authoritative), then fall back to title.
  const sources = [packDetails ?? '', title ?? '']
  for (const raw of sources) {
    const text = raw.toUpperCase()
    if (/\bGLASS\b/.test(text)) return 'glass'
    if (/\bCANS?\b/.test(text)) return 'can'
    if (/\bPET\b/.test(text)) return 'pet'
    if (/\bPLASTIC\b/.test(text)) return 'pet'
    if (/\bBOTTLES?\b/.test(text)) return 'bottle'
  }
  return FAMILY_DEFAULT_CONTAINER[family]
}

function buildPackKey(input: DeriveInput): string | null {
  if (input.pack_count == null || input.size_value == null || !input.size_uom) {
    return null
  }
  const container = detectContainer(input.pack_details, input.title, input.product_family)
  const uom = input.size_uom.trim().toLowerCase().replace(/\s+/g, '')
  // Strip trailing zeros so 12.0 → 12 but keep 1.5.
  const sizeStr = Number.isInteger(input.size_value)
    ? String(input.size_value)
    : String(input.size_value).replace(/\.?0+$/, '')
  return `${input.pack_count}x${sizeStr}${uom}_${container}`
}

function detectWaterType(title: string): WaterType {
  const t = title.toLowerCase()
  if (/\bsparkling\b/.test(t)) return 'sparkling'
  if (/\bcoconut\b/.test(t)) return 'coconut'
  if (/\b(vitamin|enhanced|electrolyte|electrolytes)\b/.test(t)) return 'enhanced'
  return 'still'
}

function detectSubline(title: string, family: ProductFamily): string | null {
  const matrixEntry = FAMILY_FIELD_MATRIX[family]
  const sublines = matrixEntry.commonSublines
  if (!sublines) return null
  const lower = title.toLowerCase()
  // Match in declared order so "Gatorade Zero" wins over "Zero" when both
  // appear in the same picklist.
  let best: string | null = null
  let bestLen = 0
  for (const sub of sublines) {
    if (lower.includes(sub.toLowerCase()) && sub.length > bestLen) {
      best = sub
      bestLen = sub.length
    }
  }
  return best
}

function buildSearchAliases(input: DeriveInput): string[] | null {
  const aliases = new Set<string>()
  const title = input.title.trim().toLowerCase()
  if (title) aliases.add(title)
  if (input.brandName) {
    const brand = input.brandName.trim().toLowerCase()
    if (brand && brand !== title) aliases.add(brand)
  }
  if (
    input.pack_count != null &&
    input.size_value != null &&
    input.size_uom
  ) {
    const uom = input.size_uom.trim().toLowerCase()
    const sizeStr = Number.isInteger(input.size_value)
      ? String(input.size_value)
      : String(input.size_value).replace(/\.?0+$/, '')
    aliases.add(`${input.pack_count}/${sizeStr}${uom}`)
    aliases.add(`${input.pack_count}x${sizeStr}${uom}`)
    aliases.add(`${input.pack_count}/${sizeStr} ${uom}`)
  }
  if (aliases.size === 0) return null
  return Array.from(aliases)
}

export function deriveProductFields(input: DeriveInput): DerivedFields {
  const title = input.title ?? ''
  const lower = title.toLowerCase()
  const family = input.product_family

  const applies = FAMILY_FIELD_MATRIX[family].applies

  const isWater = family === 'water'

  return {
    pack_key: applies.pack_key ? buildPackKey(input) : null,
    subline: applies.subline ? detectSubline(title, family) : null,
    water_type: isWater && applies.water_type ? detectWaterType(title) : null,
    is_sparkling: applies.is_sparkling
      ? /\bsparkling\b/.test(lower)
      : false,
    is_diet: applies.is_diet ? /\bdiet\b/.test(lower) : false,
    is_zero_sugar: applies.is_zero_sugar ? /\bzero\b/.test(lower) : false,
    is_caffeine_free: applies.is_caffeine_free
      ? /caffeine[\s-]?free/.test(lower)
      : false,
    search_aliases: applies.search_aliases ? buildSearchAliases(input) : null,
  }
}

// Merge curator-typed values with auto-derived values. Caller-supplied values
// win — pass undefined or null to defer to the derivation.
//
// Booleans are an edge case: curator-checked true vs. derivation-computed
// false should preserve true; but if the curator left the box unchecked and
// the title says "Diet Coke", the derivation's `true` should apply. Solve
// this by treating booleans as "explicit when typed=true OR overridden=true";
// when typed is `false` and derivation is `true`, derivation wins. The form
// can pass `undefined` for "not touched" (e.g. server-side initial create).
export interface TypedFields {
  pack_key?: string | null | undefined
  subline?: string | null | undefined
  water_type?: WaterType | null | undefined
  is_sparkling?: boolean | undefined
  is_diet?: boolean | undefined
  is_zero_sugar?: boolean | undefined
  is_caffeine_free?: boolean | undefined
  search_aliases?: string[] | null | undefined
}

function pickString(
  typed: string | null | undefined,
  derived: string | null
): string | null {
  if (typeof typed === 'string' && typed.trim().length > 0) return typed
  return derived
}

function pickArray(
  typed: string[] | null | undefined,
  derived: string[] | null
): string[] | null {
  if (Array.isArray(typed) && typed.length > 0) return typed
  return derived
}

function pickBoolean(
  typed: boolean | undefined,
  derived: boolean
): boolean {
  // Treat undefined as "not touched"; treat explicit false as "leave to derivation".
  // Curator who actively unchecks a box that derivation would set is rare
  // enough that we accept this trade-off. They can override on the edit page
  // after creation if needed.
  if (typed === true) return true
  return derived
}

function pickWaterType(
  typed: WaterType | null | undefined,
  derived: WaterType | null
): WaterType | null {
  if (typed === undefined || typed === null) return derived
  return typed
}

export function mergeDerivedFields(
  typed: TypedFields,
  derived: DerivedFields
): DerivedFields {
  return {
    pack_key: pickString(typed.pack_key, derived.pack_key),
    subline: pickString(typed.subline, derived.subline),
    water_type: pickWaterType(typed.water_type, derived.water_type),
    is_sparkling: pickBoolean(typed.is_sparkling, derived.is_sparkling),
    is_diet: pickBoolean(typed.is_diet, derived.is_diet),
    is_zero_sugar: pickBoolean(typed.is_zero_sugar, derived.is_zero_sugar),
    is_caffeine_free: pickBoolean(
      typed.is_caffeine_free,
      derived.is_caffeine_free
    ),
    search_aliases: pickArray(typed.search_aliases, derived.search_aliases),
  }
}

// Re-export so server callers don't have to import from two modules.
export type { ProductFamily, BrowseModel, WaterType }
