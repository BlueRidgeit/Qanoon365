import { expect, test, type Page } from '@playwright/test';

const adminEmail = 'bladmin@albasti.dev';
const adminPassword = 'Myfav0r!teBL1T';
const clientName = 'Noor Islamic Finance PJSC';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(adminEmail);
  await page.locator('#password').fill(adminPassword);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 30_000,
  });
}

test('opens client AI research with context already prefilled', async ({
  page,
}) => {
  test.slow();

  await login(page);

  await page.goto('/clients');
  await page.getByText(clientName, { exact: false }).click();

  await expect(
    page.getByRole('heading', { name: new RegExp(clientName, 'i') }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'AI Research' }).click();
  await page.waitForURL(/\/court-intel\?.*sourceEntityType=client/i, {
    timeout: 30_000,
  });

  await expect(page.getByText('AI Context')).toBeVisible();
  await expect(page.locator('#partyName')).toHaveValue(clientName);

  await page.getByRole('button', { name: /^Analyze$/i }).click();
  await expect(
    page.getByText(new RegExp(`Contextual court intelligence prepared for ${clientName}`, 'i')),
  ).toBeVisible({
    timeout: 30_000,
  });
});
