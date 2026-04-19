import { expect, test } from '@playwright/test'
import { credentials, loginWithPassword } from '../helpers/auth'

const adminRoutes = [
  { path: '/admin/dashboard', heading: 'Dashboard' },
  { path: '/admin/customers', heading: 'Customers' },
  { path: '/admin/catalog', heading: 'Catalog' },
  { path: '/admin/brands', heading: 'Brands' },
  { path: '/admin/staff', heading: 'Staff' },
  { path: '/admin/reports', heading: 'Reports' },
]

test.describe('ST-9 admin surface certification', () => {
  test('major admin surfaces render for a signed-in salesman', async ({ page }) => {
    const salesman = credentials('salesman')
    await loginWithPassword(page, salesman.email, salesman.password, '/admin/dashboard')

    for (const route of adminRoutes) {
      await page.goto(route.path)
      await expect(page).toHaveURL(new RegExp(`${route.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible()
    }
  })

  test('orders entrypoint resolves to the supported admin dashboard flow', async ({ page }) => {
    const salesman = credentials('salesman')
    await loginWithPassword(page, salesman.email, salesman.password, '/admin/orders')

    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})
