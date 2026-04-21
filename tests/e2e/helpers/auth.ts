import { expect, type Page } from '@playwright/test'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function resolveSalesmanEmail(): string {
  return process.env.CI_SALESMAN_EMAIL || process.env.CI_INBOX_EMAIL || 'inbox@ohthatgrp.com'
}

export function credentials(name: 'salesman' | 'customerA' | 'customerB') {
  if (name === 'salesman') {
    return {
      email: resolveSalesmanEmail(),
      password: requireEnv('CI_SALESMAN_PASSWORD'),
    }
  }
  if (name === 'customerA') {
    return {
      email: process.env.CI_CUSTOMER_A_EMAIL ?? '',
      password: process.env.CI_CUSTOMER_A_PASSWORD ?? '',
    }
  }
  return {
    email: process.env.CI_CUSTOMER_B_EMAIL ?? '',
    password: process.env.CI_CUSTOMER_B_PASSWORD ?? '',
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
