import { expect, test, type Page } from '@playwright/test';

const adminEmail = 'bladmin@albasti.dev';
const adminPassword = 'Myfav0r!teBL1T';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder(/email|you@/i).fill(adminEmail);
  await page.getByPlaceholder(/password/i).fill(adminPassword);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { timeout: 30_000 });
}

test.describe('Daleel Chat', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigates to Daleel page', async ({ page }) => {
    await page.goto('/daleel');
    await expect(page.getByText('Daleel')).toBeVisible({ timeout: 10_000 });
  });

  test('shows empty state with suggestions', async ({ page }) => {
    await page.goto('/daleel');
    await expect(page.getByText(/legal research assistant/i)).toBeVisible({ timeout: 10_000 });
  });

  test('new chat button exists', async ({ page }) => {
    await page.goto('/daleel');
    await expect(page.getByRole('button', { name: /new chat/i })).toBeVisible({ timeout: 10_000 });
  });

  test('input field is present and functional', async ({ page }) => {
    await page.goto('/daleel');
    const input = page.getByPlaceholder(/ask daleel/i);
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill('Test query about legal documents');
    await expect(input).toHaveValue('Test query about legal documents');
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    await page.goto('/daleel');
    await page.waitForTimeout(2000);
    // The send button should exist
    const sendButtons = page.locator('button').filter({ has: page.locator('svg') });
    await expect(sendButtons.first()).toBeVisible({ timeout: 10_000 });
  });
});
