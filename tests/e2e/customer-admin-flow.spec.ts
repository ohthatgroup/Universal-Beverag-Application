import { expect, test } from '@playwright/test'
import { credentials, futureDate, loginWithPassword } from './helpers/auth'
import { findOrderId, getOrderStatus, getUserIdByEmail } from './helpers/supabase-admin'

test.describe.configure({ mode: 'serial' })

const draftDate = futureDate(21)
const submittedDate = futureDate(22)

test('customer creates draft through unique order link', async ({ page }) => {
  const customer = credentials('customerA')

  await loginWithPassword(page, customer.email, customer.password, '/')
  await expect(page.getByRole('heading', { name: 'Universal Beverages' })).toBeVisible()

  await page.getByRole('button', { name: 'Select Date' }).click()
  await page.locator('input[type="date"]').first().fill(draftDate)
  await page.getByRole('button', { name: '+ New Order' }).click()

  await expect(page).toHaveURL(/\/order\/link\/[0-9a-f-]+$/i)

  await page.getByRole('button', { name: '+' }).first().click()
  await page.getByRole('button', { name: /Review Order/i }).click()
  await expect(page.getByRole('button', { name: 'Submit Order' })).toBeEnabled()
})

test('customer submits and sees submitted order in read-only deep link', async ({ page }) => {
  const customer = credentials('customerA')

  await loginWithPassword(page, customer.email, customer.password, '/')
  await page.getByRole('button', { name: 'Select Date' }).click()
  await page.locator('input[type="date"]').first().fill(submittedDate)
  await page.getByRole('button', { name: '+ New Order' }).click()
  await expect(page).toHaveURL(/\/order\/link\/[0-9a-f-]+$/i)

  await page.getByRole('button', { name: '+' }).first().click()
  await page.getByRole('button', { name: /Review Order/i }).click()
  await page.getByRole('button', { name: 'Submit Order' }).click()

  await expect(page).toHaveURL(/\/orders$/)

  const customerId = await getUserIdByEmail(customer.email)
  const orderId = await findOrderId(customerId, submittedDate)
  await expect.poll(async () => getOrderStatus(orderId)).toBe('submitted')

  await page.goto(`/order/link/${orderId}`)
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.getByText(/submitted/i)).toBeVisible()
})

test('salesman updates submitted order to delivered', async ({ page }) => {
  const customer = credentials('customerA')
  const salesman = credentials('salesman')

  await loginWithPassword(page, salesman.email, salesman.password, '/admin/dashboard')
  await expect(page).toHaveURL(/\/admin\/dashboard/)

  const customerId = await getUserIdByEmail(customer.email)
  const orderId = await findOrderId(customerId, submittedDate)

  await page.goto(`/admin/orders/${orderId}`)
  await expect(page.getByRole('button', { name: 'Save status' })).toBeVisible()

  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Delivered' }).click()
  await page.getByRole('button', { name: 'Save status' }).click()

  await expect(page.getByText(/Delivered/)).toBeVisible()
})
