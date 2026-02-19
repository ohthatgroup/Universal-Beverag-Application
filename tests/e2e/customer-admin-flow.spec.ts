import { expect, test } from '@playwright/test'
import { credentials, futureDate, loginWithPassword } from './helpers/auth'
import { findOrderId, getCustomerIdByName, getCustomerToken, getOrderStatus } from './helpers/supabase-admin'

test.describe.configure({ mode: 'serial' })

const draftDate = futureDate(21)
const submittedDate = futureDate(22)

test('customer creates draft through portal link', async ({ page }) => {
  const token = await getCustomerToken('CI Customer A')

  await page.goto(`/c/${token}`)
  await expect(page.getByRole('heading', { name: 'Universal Beverages' })).toBeVisible()

  await page.getByRole('button', { name: 'Select Date' }).click()
  await page.locator('input[type="date"]').first().fill(draftDate)
  await page.getByRole('button', { name: '+ New Order' }).click()

  await expect(page).toHaveURL(/\/c\/[a-f0-9]+\/order\/link\/[0-9a-f-]+$/i)

  await page.getByRole('button', { name: '+' }).first().click()
  await page.getByRole('button', { name: /Review Order/i }).click()
  await expect(page.getByRole('button', { name: 'Submit Order' })).toBeEnabled()
})

test('customer submits and sees submitted order in read-only view', async ({ page }) => {
  const token = await getCustomerToken('CI Customer A')

  await page.goto(`/c/${token}`)
  await page.getByRole('button', { name: 'Select Date' }).click()
  await page.locator('input[type="date"]').first().fill(submittedDate)
  await page.getByRole('button', { name: '+ New Order' }).click()
  await expect(page).toHaveURL(/\/c\/[a-f0-9]+\/order\/link\/[0-9a-f-]+$/i)

  await page.getByRole('button', { name: '+' }).first().click()
  await page.getByRole('button', { name: /Review Order/i }).click()
  await page.getByRole('button', { name: 'Submit Order' }).click()

  await expect(page).toHaveURL(/\/c\/[a-f0-9]+\/orders$/)

  const customerId = await getCustomerIdByName('CI Customer A')
  const orderId = await findOrderId(customerId, submittedDate)
  await expect.poll(async () => getOrderStatus(orderId)).toBe('submitted')

  await page.goto(`/c/${token}/order/link/${orderId}`)
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.getByText(/submitted/i)).toBeVisible()
})

test('salesman updates submitted order to delivered', async ({ page }) => {
  const salesman = credentials('salesman')

  await loginWithPassword(page, salesman.email, salesman.password, '/admin/dashboard')
  await expect(page).toHaveURL(/\/admin\/dashboard/)

  const customerId = await getCustomerIdByName('CI Customer A')
  const orderId = await findOrderId(customerId, submittedDate)

  await page.goto(`/admin/orders/${orderId}`)
  await expect(page.getByRole('button', { name: 'Save status' })).toBeVisible()

  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Delivered' }).click()
  await page.getByRole('button', { name: 'Save status' }).click()

  await expect(page.getByText(/Delivered/)).toBeVisible()
})
