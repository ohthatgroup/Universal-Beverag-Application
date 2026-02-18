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
