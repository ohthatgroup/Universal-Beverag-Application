import { expect, test } from '@playwright/test'
import { credentials, loginWithPassword } from './helpers/auth'

test('customer cannot access admin dashboard', async ({ page }) => {
  const customer = credentials('customerB')
  await loginWithPassword(page, customer.email, customer.password, '/')

  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Universal Beverages' })).toBeVisible()
})

test('salesman is redirected away from customer home', async ({ page }) => {
  const salesman = credentials('salesman')
  await loginWithPassword(page, salesman.email, salesman.password, '/admin/dashboard')

  await page.goto('/')
  await expect(page).toHaveURL(/\/admin\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
