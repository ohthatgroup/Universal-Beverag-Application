import { z } from 'zod'

export const orderStatusSchema = z.enum(['draft', 'submitted', 'delivered'])

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date format YYYY-MM-DD')

export const uuidSchema = z.string().uuid()

export const createOrGetDraftSchema = z.object({
  deliveryDate: isoDateSchema,
  customerId: uuidSchema.optional(),
})

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
})

export const cloneOrderSchema = z.object({
  deliveryDate: isoDateSchema,
})

export const applyUsualsSchema = z.object({
  deliveryDate: isoDateSchema,
  replace: z.boolean().optional().default(false),
})

export const updateDeliveryDateSchema = z.object({
  deliveryDate: isoDateSchema,
})

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().max(320),
})

export const inviteSetupSchema = z.object({
  token: z.string().trim().min(1).max(500),
  password: z.string().min(8).max(200),
})

export const portalProfileUpdateSchema = z.object({
  contact_name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(200).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  zip: z.string().max(20).optional().or(z.literal('')),
})

// Presets — catalog visibility templates.
export const createPresetSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
})

const presetBrandRuleSchema = z.object({
  brandId: uuidSchema,
  isHidden: z.boolean(),
  isPinned: z.boolean(),
})

const presetSizeRuleSchema = z.object({
  sizeKey: z.string().trim().min(1).max(40),
  isHidden: z.boolean(),
})

const presetProductRuleSchema = z.object({
  productId: uuidSchema,
  isHidden: z.boolean(),
  isPinned: z.boolean(),
})

export const updatePresetSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  brandRules: z.array(presetBrandRuleSchema).optional(),
  sizeRules: z.array(presetSizeRuleSchema).optional(),
  productRules: z.array(presetProductRuleSchema).optional(),
})

export const applyPresetSchema = z.object({
  customerId: uuidSchema,
})

// ---- Products -----------------------------------------------------------
// Derived navigation metadata. See db/migrations/*_products_browse_model_fields.sql.

export const productFamilyEnum = z.enum([
  'soda',
  'water',
  'sports_hydration',
  'tea_juice',
  'energy_coffee',
  'other',
])
export type ProductFamily = z.infer<typeof productFamilyEnum>

export const browseModelEnum = z.enum([
  'format-led',
  'water-type-led',
  'subline-then-size',
  'brand-led',
  'price-point-led',
])
export type BrowseModel = z.infer<typeof browseModelEnum>

export const waterTypeEnum = z.enum(['still', 'sparkling', 'enhanced', 'coconut'])
export type WaterType = z.infer<typeof waterTypeEnum>

// Create schema: defaults apply for booleans, family, and browse_model so
// callers can omit them.
const productCreateFields = {
  brand_id: uuidSchema.nullable(),
  title: z.string().min(1).max(300),
  pack_details: z.string().max(200).nullable(),
  pack_count: z.number().int().positive().nullable(),
  size_value: z.number().positive().nullable(),
  size_uom: z.string().max(40).nullable(),
  price: z.number().nonnegative(),
  image_url: z.string().max(2000).nullable(),
  is_new: z.boolean().default(false),
  is_discontinued: z.boolean().default(false),
  tags: z.array(z.string().max(80)).nullable(),

  product_family: productFamilyEnum.default('other'),
  browse_model: browseModelEnum.default('brand-led'),
  subline: z.string().max(120).nullable().optional(),
  pack_key: z.string().max(60).nullable().optional(),
  water_type: waterTypeEnum.nullable().optional(),
  price_point: z.string().max(40).nullable().optional(),
  is_zero_sugar: z.boolean().default(false),
  is_diet: z.boolean().default(false),
  is_caffeine_free: z.boolean().default(false),
  is_sparkling: z.boolean().default(false),
  search_aliases: z.array(z.string().max(120)).nullable().optional(),
}

// Update schema: every field is independently optional with NO defaults, so a
// partial PATCH like `{ is_diet: true }` parses to exactly that — the PATCH
// route's column-by-column SET clause writes only what the curator touched.
const productUpdateFields = {
  brand_id: uuidSchema.nullable(),
  title: z.string().min(1).max(300),
  pack_details: z.string().max(200).nullable(),
  pack_count: z.number().int().positive().nullable(),
  size_value: z.number().positive().nullable(),
  size_uom: z.string().max(40).nullable(),
  price: z.number().nonnegative(),
  image_url: z.string().max(2000).nullable(),
  is_new: z.boolean(),
  is_discontinued: z.boolean(),
  tags: z.array(z.string().max(80)).nullable(),

  product_family: productFamilyEnum,
  browse_model: browseModelEnum,
  subline: z.string().max(120).nullable(),
  pack_key: z.string().max(60).nullable(),
  water_type: waterTypeEnum.nullable(),
  price_point: z.string().max(40).nullable(),
  is_zero_sugar: z.boolean(),
  is_diet: z.boolean(),
  is_caffeine_free: z.boolean(),
  is_sparkling: z.boolean(),
  search_aliases: z.array(z.string().max(120)).nullable(),
}

export const productCreateSchema = z.object(productCreateFields)
export const productUpdateSchema = z.object(productUpdateFields).partial()

export type ProductCreateInput = z.infer<typeof productCreateSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>

// Family → metadata visibility matrix.
// Single source of truth for which derived-navigation fields apply to which
// family. The admin product form uses `getVisibleFieldsForFamily()` to show or
// hide inputs when the user picks a product_family. The customer-facing
// FamilySheet uses the same matrix to decide which row chips to surface
// ("Diet", "Zero", "Sparkling", "$0.99") and which to ignore.

export type ProductMetaField =
  | 'subline'
  | 'pack_key'
  | 'water_type'
  | 'price_point'
  | 'is_zero_sugar'
  | 'is_diet'
  | 'is_caffeine_free'
  | 'is_sparkling'
  | 'search_aliases'

interface FamilyMatrixEntry {
  defaultBrowseModel: BrowseModel
  applies: Record<ProductMetaField, boolean>
  commonSublines?: readonly string[]
}

export const FAMILY_FIELD_MATRIX: Record<ProductFamily, FamilyMatrixEntry> = {
  soda: {
    defaultBrowseModel: 'format-led',
    applies: {
      subline:           true,
      pack_key:          true,
      water_type:        false,
      price_point:       false,
      is_zero_sugar:     true,
      is_diet:           true,
      is_caffeine_free:  true,
      is_sparkling:      false,
      search_aliases:    true,
    },
    commonSublines: ['Regular', 'Diet', 'Zero', 'Cherry', 'Vanilla', 'Caffeine Free'],
  },
  water: {
    defaultBrowseModel: 'water-type-led',
    applies: {
      subline:           false,
      pack_key:          true,
      water_type:        true,
      price_point:       false,
      is_zero_sugar:     false,
      is_diet:           false,
      is_caffeine_free:  false,
      is_sparkling:      true,
      search_aliases:    true,
    },
  },
  sports_hydration: {
    defaultBrowseModel: 'subline-then-size',
    applies: {
      subline:           true,
      pack_key:          true,
      water_type:        false,
      price_point:       false,
      is_zero_sugar:     true,
      is_diet:           false,
      is_caffeine_free:  false,
      is_sparkling:      false,
      search_aliases:    true,
    },
    commonSublines: [
      'Thirst Quencher', 'Gatorade Zero', 'G2', 'Endurance', 'Gatorlyte',
      'BodyArmor', 'BodyArmor LYTE', 'Propel', 'Powerade', 'Powerade Zero',
    ],
  },
  tea_juice: {
    defaultBrowseModel: 'brand-led',
    applies: {
      subline:           false,
      pack_key:          true,
      water_type:        false,
      price_point:       true,
      is_zero_sugar:     true,
      is_diet:           true,
      is_caffeine_free:  true,
      is_sparkling:      false,
      search_aliases:    true,
    },
  },
  energy_coffee: {
    defaultBrowseModel: 'brand-led',
    applies: {
      subline:           true,
      pack_key:          true,
      water_type:        false,
      price_point:       false,
      is_zero_sugar:     true,
      is_diet:           false,
      is_caffeine_free:  false,
      is_sparkling:      false,
      search_aliases:    true,
    },
  },
  other: {
    defaultBrowseModel: 'brand-led',
    applies: {
      subline:           false,
      pack_key:          true,
      water_type:        false,
      price_point:       false,
      is_zero_sugar:     false,
      is_diet:           false,
      is_caffeine_free:  false,
      is_sparkling:      false,
      search_aliases:    true,
    },
  },
}

export function getVisibleFieldsForFamily(family: ProductFamily): ProductMetaField[] {
  const entry = FAMILY_FIELD_MATRIX[family]
  return (Object.entries(entry.applies) as [ProductMetaField, boolean][])
    .filter(([, applies]) => applies)
    .map(([field]) => field)
}

// ---- Announcements ------------------------------------------------------
// Schema for /api/admin/announcements POST/PATCH/reorder. Maps 1:1 to the
// `announcements` table columns; the TypeScript `Announcement` interface in
// `components/portal/announcements-stack.tsx` is the runtime shape.

export const announcementContentTypeEnum = z.enum([
  'text',
  'image',
  'image_text',
  'product',
  'specials_grid',
])

export const announcementKindEnum = z.enum(['announcement', 'deal'])

export const announcementCtaTargetKindEnum = z.enum(['products', 'product', 'url'])

const announcementProductQuantitySchema = z.object({
  default_qty: z.number().int().min(0).max(9999).optional(),
  locked: z.boolean().optional(),
})

const announcementFields = {
  kind: announcementKindEnum,
  content_type: announcementContentTypeEnum,
  title: z.string().max(300).nullable(),
  body: z.string().max(2000).nullable(),
  image_url: z.string().max(2000).nullable(),
  cta_label: z.string().max(120).nullable(),
  cta_target_kind: announcementCtaTargetKindEnum.nullable(),
  cta_target_url: z.string().max(2000).nullable(),
  cta_target_product_id: uuidSchema.nullable(),
  cta_target_product_ids: z.array(uuidSchema),
  product_id: uuidSchema.nullable(),
  product_ids: z.array(uuidSchema),
  badge_overrides: z.record(z.string(), z.string()),
  product_quantities: z.record(uuidSchema, announcementProductQuantitySchema),
  // `audience_tags` is no longer consulted by the resolver (since
  // migration 202604260007). Schema accepts it for back-compat with old
  // clients but it has no effect. Drop in a future cleanup migration.
  audience_tags: z.array(z.string().max(80)),
  // Group-based targeting. Empty array = visible to all groups
  // (broadcast). Non-empty = only customers whose customer_group_id is
  // in this list see the announcement.
  target_group_ids: z.array(uuidSchema),
  starts_at: isoDateSchema.nullable(),
  ends_at: isoDateSchema.nullable(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
}

// Create — every field optional with sensible defaults applied server-side
// (the dialog sends a partial; the route fills in the rest).
export const announcementCreateSchema = z.object(announcementFields).partial()

// Update — partial PATCH. Routes write only what's set.
export const announcementUpdateSchema = z.object(announcementFields).partial()

export const announcementReorderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: uuidSchema,
        sort_order: z.number().int(),
      }),
    )
    .min(1),
})

export type AnnouncementCreateInput = z.infer<typeof announcementCreateSchema>
export type AnnouncementUpdateInput = z.infer<typeof announcementUpdateSchema>
export type AnnouncementReorderInput = z.infer<typeof announcementReorderSchema>
