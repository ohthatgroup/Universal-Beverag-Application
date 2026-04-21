import { expect, test } from '@playwright/test'
import { credentials, loginWithPassword } from '../helpers/auth'

const adminRoutes = [
  { path: '/admin/dashboard', text: 'Today', kind: 'heading' },
  { path: '/admin/customers', text: 'All customers', kind: 'text' },
  { path: '/admin/catalog', text: 'Catalog', kind: 'heading' },
  { path: '/admin/brands', text: 'Brands', kind: 'heading' },
  { path: '/admin/staff', text: 'Staff', kind: 'heading' },
  { path: '/admin/reports', text: 'Reports', kind: 'heading' },
]

test.describe('ST-9 admin surface certification', () => {
  test('major admin surfaces render for a signed-in salesman', async ({ page }) => {
    const salesman = credentials('salesman')
    await loginWithPassword(page, salesman.email, salesman.password, '/admin/dashboard')

    for (const route of adminRoutes) {
      await page.goto(route.path)
      await expect(page).toHaveURL(new RegExp(`${route.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
      const target =
        route.kind === 'heading'
          ? page.getByRole('heading', { name: route.text })
          : page.getByText(route.text)
      await expect(target).toBeVisible()
    }
  })

  test('orders entrypoint resolves to the supported admin dashboard flow', async ({ page }) => {
    const salesman = credentials('salesman')
    await loginWithPassword(page, salesman.email, salesman.password, '/admin/orders')

    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  })
})
