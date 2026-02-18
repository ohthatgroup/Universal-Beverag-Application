import { expect, type Page } from '@playwright/test'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function credentials(name: 'salesman' | 'customerA' | 'customerB') {
  if (name === 'salesman') {
    return {
      email: requireEnv('CI_SALESMAN_EMAIL'),
      password: requireEnv('CI_SALESMAN_PASSWORD'),
    }
  }
  if (name === 'customerA') {
    return {
      email: requireEnv('CI_CUSTOMER_A_EMAIL'),
      password: requireEnv('CI_CUSTOMER_A_PASSWORD'),
    }
  }
  return {
    email: requireEnv('CI_CUSTOMER_B_EMAIL'),
    password: requireEnv('CI_CUSTOMER_B_PASSWORD'),
  }
}

export async function loginWithPassword(
  page: Page,
  email: string,
  password: string,
  redirectPath: string
) {
  await page.goto(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`)
  await page.locator('#salesman-email').fill(email)
  await page.locator('#salesman-password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/)
}

export function futureDate(daysAhead: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString().slice(0, 10)
}
