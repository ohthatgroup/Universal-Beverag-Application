import { expect, test } from '@playwright/test'
import { getCustomerToken } from '../helpers/supabase-admin'

test.describe('ST-9 customer portal certification', () => {
  test('portal with valid token loads customer home', async ({ page }) => {
    const token = await getCustomerToken('Portal E2E Customer')

    await page.goto(`/portal/${token}`)
    await expect(page.locator('h1')).toContainText('Portal E2E Customer')
  })

  test('portal account route renders for a valid bearer link', async ({ page }) => {
    const token = await getCustomerToken('Portal E2E Customer')

    await page.goto(`/portal/${token}/account`)
    await expect(page).toHaveURL(new RegExp(`/portal/${token}/account$`))
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()
  })

  test('legacy customer routes redirect into the canonical portal route family', async ({ page }) => {
    const token = await getCustomerToken('Portal E2E Customer')

    await page.goto(`/c/${token}`)
    await expect(page).toHaveURL(new RegExp(`/portal/${token}$`))
    await expect(page.locator('h1')).toContainText('Portal E2E Customer')

    await page.goto(`/c/${token}/account`)
    await expect(page).toHaveURL(new RegExp(`/portal/${token}/account$`))
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()
  })

  test('portal orders route resolves to the supported customer home flow', async ({ page }) => {
    const token = await getCustomerToken('Portal E2E Customer')

    await page.goto(`/portal/${token}/orders`)
    await expect(page).toHaveURL(new RegExp(`/portal/${token}$`))
    await expect(page.locator('h1')).toContainText('Portal E2E Customer')
  })

  test('portal with invalid token shows not found', async ({ page }) => {
    await page.goto('/portal/00000000deadbeef00000000deadbeef')
    await expect(page.getByRole('heading', { name: "This link isn't active" })).toBeVisible()
  })
})
