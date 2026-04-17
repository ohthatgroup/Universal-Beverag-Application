import { notFound, redirect } from 'next/navigation'
import { buildCustomerOrderDeepLink } from '@/lib/portal-links'
import { getRequestDb } from '@/lib/server/db'
import { resolveCustomerToken } from '@/lib/server/customer-auth'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

export default async function PortalOrderDateRedirectPage({
  params,
}: {
  params: Promise<{ token: string; date: string }>
}) {
  const { token, date } = await params

  if (!isoDateRegex.test(date)) {
    notFound()
  }

  const { customerId } = await resolveCustomerToken(token)
  const db = await getRequestDb()

  const { rows: existingRows } = await db.query<{ id: string }>(
    `select id
     from orders
     where customer_id = $1 and delivery_date = $2 and status = 'draft'
     limit 1`,
    [customerId, date]
  )

  if (existingRows[0]?.id) {
    redirect(buildCustomerOrderDeepLink(token, existingRows[0].id) ?? '/portal')
  }

  try {
    const { rows: createdRows } = await db.query<{ id: string }>(
      `insert into orders (customer_id, delivery_date, status)
       values ($1, $2, 'draft')
       returning id`,
      [customerId, date]
    )
    const createdOrder = createdRows[0]
    if (!createdOrder) {
      throw new Error('Unable to load or create draft order')
    }

    redirect(buildCustomerOrderDeepLink(token, createdOrder.id) ?? '/portal')
  } catch (createError) {
    if (
      typeof createError === 'object' &&
      createError !== null &&
      'code' in createError &&
      (createError as { code?: string }).code === '23505'
    ) {
      const { rows: raceRows } = await db.query<{ id: string }>(
        `select id
         from orders
         where customer_id = $1 and delivery_date = $2 and status = 'draft'
         limit 1`,
        [customerId, date]
      )

      if (raceRows[0]?.id) {
        redirect(buildCustomerOrderDeepLink(token, raceRows[0].id) ?? '/portal')
      }
    }

    throw createError
  }
}
