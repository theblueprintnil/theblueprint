import { expect, test } from '@playwright/test'

test('register creates an account and onboards the first organization', async ({ page }) => {
  const email = `e2e-owner-${Date.now()}@blueprint.test`

  await page.goto('/register')
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()

  await page.getByLabel('Name').fill('E2E Owner')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/onboarding$/)
  await expect(page.getByText('Create your workspace')).toBeVisible()

  await page.getByLabel('Organization name').fill('E2E Test Org')
  await page.getByText('Agency Workspace', { exact: true }).click()
  await page.getByRole('button', { name: 'Create workspace' }).click()

  await expect(page).toHaveURL(/\/app\/dashboard/)
  await expect(page.getByText('E2E Test Org')).toBeVisible()
})

test('unauthenticated users are redirected away from protected routes', async ({ page }) => {
  await page.goto('/app/dashboard')
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fdashboard$/)
})
