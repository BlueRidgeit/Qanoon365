import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const adminEmail = 'bladmin@albasti.dev';
const adminPassword = 'Myfav0r!teBL1T';

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

// Ensure screenshot directory exists
test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder(/email|you@/i).fill(adminEmail);
  await page.getByPlaceholder(/password/i).fill(adminPassword);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { timeout: 30_000 });
  await page.waitForTimeout(2000); // Let dashboard render
}

async function screenshot(page: Page, name: string) {
  await page.waitForTimeout(1500); // Let animations settle
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

test.describe('Qanoon365 Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('login page', async ({ page }) => {
    // Go back to login for screenshot
    await page.goto('/login');
    await page.waitForTimeout(1000);
    await screenshot(page, '01-login');
  });

  test('dashboard', async ({ page }) => {
    await screenshot(page, '02-dashboard');
  });

  test('new enquiries', async ({ page }) => {
    await page.goto('/leads');
    await screenshot(page, '03-enquiries');
  });

  test('engagement pipeline', async ({ page }) => {
    await page.goto('/opportunities');
    await screenshot(page, '04-pipeline');
  });

  test('active matters', async ({ page }) => {
    await page.goto('/matters');
    await screenshot(page, '05-matters');
  });

  test('client directory', async ({ page }) => {
    await page.goto('/clients');
    await screenshot(page, '06-clients');
  });

  test('counsel contacts', async ({ page }) => {
    await page.goto('/contacts');
    await screenshot(page, '07-contacts');
  });

  test('conflict checks', async ({ page }) => {
    await page.goto('/conflicts');
    await screenshot(page, '08-conflicts');
  });

  test('kyc compliance', async ({ page }) => {
    await page.goto('/kyc');
    await screenshot(page, '09-kyc');
  });

  test('enforcement dashboard', async ({ page }) => {
    await page.goto('/enforcement');
    await screenshot(page, '10-enforcement');
  });

  test('execution files', async ({ page }) => {
    await page.goto('/enforcement/execution-files');
    await screenshot(page, '11-execution-files');
  });

  test('criminal complaints', async ({ page }) => {
    await page.goto('/enforcement/complaints');
    await screenshot(page, '12-complaints');
  });

  test('follow-up settings', async ({ page }) => {
    await page.goto('/enforcement/follow-ups');
    await screenshot(page, '13-follow-ups');
  });

  test('AI legal research', async ({ page }) => {
    await page.goto('/court-intel');
    await screenshot(page, '14-court-intel');
  });

  test('daleel chat', async ({ page }) => {
    await page.goto('/daleel');
    await screenshot(page, '15-daleel');
  });

  test('document vault', async ({ page }) => {
    await page.goto('/documents');
    await screenshot(page, '16-documents');
  });

  test('firm settings', async ({ page }) => {
    await page.goto('/settings');
    await screenshot(page, '17-settings');
  });

  test('user guide', async ({ page }) => {
    await page.goto('/guide');
    await screenshot(page, '18-guide');
  });
});
