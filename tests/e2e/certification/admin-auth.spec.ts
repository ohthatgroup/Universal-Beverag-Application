import { expect, test } from '@playwright/test'
import { credentials, loginWithPassword } from '../helpers/auth'

test.describe('ST-9 admin auth certification', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: 'Universal Beverages' })).toBeVisible()
  })

  test('unauthenticated user is redirected to login for admin routes', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('salesman can access the admin dashboard', async ({ page }) => {
    const salesman = credentials('salesman')
    await loginWithPassword(page, salesman.email, salesman.password, '/admin/dashboard')

    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  })
})
