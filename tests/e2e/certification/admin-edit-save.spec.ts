import { expect, test } from '@playwright/test'
import { credentials, loginWithPassword } from '../helpers/auth'
import { getCustomerIdByName } from '../helpers/supabase-admin'

test.describe('ST-9 admin edit-save certification', () => {
  test('customer edit page loads and save completes without error', async ({ page }) => {
    const salesman = credentials('salesman')
    const customerId = await getCustomerIdByName('Portal E2E Customer')

    await loginWithPassword(page, salesman.email, salesman.password, `/admin/customers/${customerId}/edit`)
    await expect(page).toHaveURL(new RegExp(`/admin/customers/${customerId}/edit$`))

    // Heading present (page loaded without crash)
    await expect(page.getByRole('heading', { name: 'Edit details' })).toBeVisible()

    // Wait for client-side hydration: the "Save changes" button must be enabled
    // and the onClick handler attached. We detect this by waiting for the
    // router's useRouter hook to mount — a pragmatic proxy is waiting for
    // network idle after the page first paint.
    await page.waitForLoadState('networkidle')

    // Edit a non-destructive field and save
    const newCity = `Brooklyn-${Date.now()}`
    const cityInput = page.locator('#city')
    await cityInput.fill(newCity)

    // Wait for the PATCH API call to complete before navigating away.
    const savePromise = page.waitForResponse(
      (res) =>
        res.request().method() === 'PATCH' &&
        res.url().includes(`/api/admin/customers/${customerId}`)
    )
    await page.getByRole('button', { name: 'Save changes' }).click()
    const saveResponse = await savePromise
    expect(saveResponse.status()).toBeLessThan(400)

    // Should NOT show the global-error fallback
    await expect(page.getByText('An unexpected error occurred. Please retry.')).not.toBeVisible()

    // Reload edit page and confirm value persisted
    await page.goto(`/admin/customers/${customerId}/edit`)
    await expect(page.locator('#city')).toHaveValue(newCity)
  })
})
