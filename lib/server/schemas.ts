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

export const portalProfileUpdateSchema = z.object({
  contact_name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(200).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  zip: z.string().max(20).optional().or(z.literal('')),
})
