'use server'

import { redirect } from 'next/navigation'
import { getRequestDb } from '@/lib/server/db'
import { requirePageAuth } from '@/lib/server/page-auth'

export async function createEmptyPalletAction() {
  await requirePageAuth(['salesman'])
  const actionDb = await getRequestDb()

  const { rows } = await actionDb.query<{ id: string }>(
    `insert into pallet_deals (title, pallet_type, price, savings_text, description, is_active, sort_order)
     values ('New Pallet Deal', 'single', 0.01, null, null, true, coalesce((select max(sort_order) from pallet_deals), -1) + 1)
     returning id`
  )

  if (!rows[0]) throw new Error('Failed to create pallet deal')
  redirect(`/admin/catalog/pallets/${rows[0].id}`)
}
