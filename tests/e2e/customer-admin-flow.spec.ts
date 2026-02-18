import { expect, test } from '@playwright/test'
import { credentials, futureDate, loginWithPassword } from './helpers/auth'
import { findOrderId, getOrderStatus, getUserIdByEmail } from './helpers/supabase-admin'

test.describe.configure({ mode: 'serial' })

const deliveryDate = futureDate(21)

test('customer creates and submits an order', async ({ page }) => {
  const customer = credentials('customerA')

  await loginWithPassword(page, customer.email, customer.password, '/')
  await expect(page.getByText('Welcome back')).toBeVisible()

  const dateInput = page.locator('input[type="date"]').first()
  await dateInput.fill(deliveryDate)
  await page.getByRole('button', { name: /New Order|Continue Order/i }).click()

  await expect(page).toHaveURL(new RegExp(`/order/${deliveryDate}$`))

  await page.getByRole('button', { name: '+' }).first().click()
  await expect(page.getByRole('button', { name: 'Submit Order' })).toBeEnabled()
  await page.getByRole('button', { name: 'Submit Order' }).click()

  await expect(page).toHaveURL(/\/orders$/)
  const customerId = await getUserIdByEmail(customer.email)
  const orderId = await findOrderId(customerId, deliveryDate)
  await expect.poll(async () => getOrderStatus(orderId)).toBe('submitted')
})

test('salesman updates submitted order to delivered', async ({ page }) => {
  const customer = credentials('customerA')
  const salesman = credentials('salesman')

  await loginWithPassword(page, salesman.email, salesman.password, '/admin/dashboard')
  await expect(page).toHaveURL(/\/admin\/dashboard/)

  const customerId = await getUserIdByEmail(customer.email)
  const orderId = await findOrderId(customerId, deliveryDate)

  await page.goto(`/admin/orders/${orderId}`)
  await expect(page.getByText('Order Detail')).toBeVisible()

  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Delivered' }).click()
  await page.getByRole('button', { name: 'Save status' }).click()

  await expect(page.getByText('Status: delivered')).toBeVisible()
})
