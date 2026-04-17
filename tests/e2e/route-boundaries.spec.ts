import { expect, test } from '@playwright/test'
import { credentials, loginWithPassword } from './helpers/auth'
import { getCustomerToken } from './helpers/supabase-admin'

test('unauthenticated user is redirected to login for admin routes', async ({ page }) => {
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/auth\/login/)
})

test('salesman is not redirected when accessing admin dashboard', async ({ page }) => {
  const salesman = credentials('salesman')
  await loginWithPassword(page, salesman.email, salesman.password, '/admin/dashboard')

  await expect(page).toHaveURL(/\/admin\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('portal with valid token loads customer home', async ({ page }) => {
  const token = await getCustomerToken('CI Customer A')

  await page.goto(`/portal/${token}`)
  await expect(page.locator('h1')).toContainText('Universal Beverages')
})

test('portal with invalid token shows not found', async ({ page }) => {
  await page.goto('/portal/00000000deadbeef00000000deadbeef')
  await expect(page.locator('body')).toContainText(/could not be found/i)
})
