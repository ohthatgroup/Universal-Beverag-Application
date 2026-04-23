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
