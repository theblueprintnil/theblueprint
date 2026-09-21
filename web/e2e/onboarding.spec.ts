import { expect, test } from '@playwright/test'

test('sign-up renders the Clerk registration form', async ({ page }) => {
  await page.goto('/signup')
  await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
  await expect(page.locator('input[name="emailAddress"]')).toBeVisible()
  await expect(page.locator('input[name="password"]')).toBeVisible()
})

test('login renders the Clerk sign-in form and links to sign-up', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  await expect(page.locator('input[name="identifier"]')).toBeVisible()
  await expect(page.getByRole('link', { name: /sign up/i }).first()).toBeVisible()
})

test('unauthenticated users are redirected away from protected routes', async ({ page }) => {
  await page.goto('/app/dashboard')
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fdashboard$/)
})
