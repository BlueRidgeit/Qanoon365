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

test.describe('Qanoon365 regressions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('enforcement sub-pages keep a single active sidebar item', async ({ page }) => {
    const cases = [
      ['/enforcement/execution-files', '/enforcement/execution-files'],
      ['/enforcement/complaints', '/enforcement/complaints'],
      ['/enforcement/follow-ups', '/enforcement/follow-ups'],
    ] as const;

    for (const [route, activeHref] of cases) {
      await page.goto(route);
      await expect(page.locator('a.bg-sidebar-accent')).toHaveCount(1);
      await expect(page.locator(`a[href="${activeHref}"]`)).toHaveClass(
        /bg-sidebar-accent/,
      );
    }
  });

  test('appeal deadlines and archive pages render instead of 404s', async ({ page }) => {
    await page.goto('/appeal-deadlines');
    await expect(page.getByText('404 This page could not be found.')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Appeal Deadlines' })).toBeVisible();

    await page.goto('/archive');
    await expect(page.getByText('404 This page could not be found.')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Office Archive' })).toBeVisible();
  });

  test('daleel starter conversations load a sample prompt into the composer', async ({ page }) => {
    await page.goto('/daleel');
    await expect(page.getByText('Sample Conversations')).toBeVisible();

    await page.getByRole('button', { name: /Build a hearing brief/i }).click();

    await expect(page.getByPlaceholder(/ask daleel/i)).toHaveValue(
      /Build a hearing brief for the Dubai commercial matter/i,
    );
  });

  test('task center renders and opens the create dialog', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Task Center' })).toBeVisible();

    await page.getByRole('button', { name: /new task/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Task title')).toBeVisible();
  });
});
