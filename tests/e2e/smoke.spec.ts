import { expect, test } from '@playwright/test'

test('login page renders', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByText('Salesman Login')).toBeVisible()
})
