import { Buffer } from 'node:buffer';
import { expect, test, type Page } from '@playwright/test';

const adminEmail = 'bladmin@albasti.dev';
const adminPassword = 'Myfav0r!teBL1T';
const leadSubject = 'DFSA regulatory compliance review';
const existingClientName = 'Noor Islamic Finance PJSC';

async function uploadRecordDocument(
  page: Page,
  fileName: string,
  fileContents: string,
) {
  await page
    .getByTestId('record-document-upload-input')
    .setInputFiles({
      name: fileName,
      mimeType: 'application/pdf',
      buffer: Buffer.from(fileContents),
    });

  await expect(
    page.getByTestId('record-document-list').getByText(fileName),
  ).toBeVisible({
    timeout: 30_000,
  });
}

test('qualifies a lead and opens a matter through the browser flow', async ({
  page,
}) => {
  test.slow();

  await page.goto('/login');

  await page.locator('#email').fill(adminEmail);
  await page.locator('#password').fill(adminPassword);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 30_000,
  });

  await page.goto('/leads');
  await page.getByText(leadSubject, { exact: false }).click();

  await expect(
    page.getByRole('heading', { name: new RegExp(leadSubject, 'i') }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Qualify Enquiry' }).click();

  const qualifyDialog = page.getByRole('dialog');
  await expect(qualifyDialog).toBeVisible();

  await qualifyDialog
    .getByRole('button', { name: 'Existing client' })
    .click();
  await qualifyDialog.locator('#existingClientSearch').fill('Noor Islamic');
  await qualifyDialog.getByRole('combobox').click();
  await page.getByRole('option', { name: new RegExp(existingClientName, 'i') }).click();
  await qualifyDialog
    .getByRole('button', { name: /^Qualify Enquiry$/ })
    .click();

  await page.waitForURL(/\/opportunities\/[^/]+$/, {
    timeout: 30_000,
  });

  await expect(page.getByText('Linked Records')).toBeVisible();
  await expect(page.getByText('Originating Enquiry')).toBeVisible();
  await expect(
    page
      .getByText('Originating Enquiry')
      .locator('..')
      .getByRole('link', { name: new RegExp(leadSubject, 'i') }),
  ).toBeVisible();
  const opportunityUrl = page.url();

  await page.getByRole('tab', { name: 'Documents' }).click();
  await uploadRecordDocument(
    page,
    'opportunity-engagement-note.pdf',
    'Opportunity context document for the browser flow smoke test.',
  );

  await page.getByRole('link', { name: 'Open client' }).click();
  await page.waitForURL(/\/clients\/[^/]+$/, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole('heading', { name: new RegExp(existingClientName, 'i') }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Documents' }).click();
  await uploadRecordDocument(
    page,
    'client-kyc-pack.pdf',
    'Client context document for the browser flow smoke test.',
  );

  await page.goto(opportunityUrl);
  await page.waitForURL(/\/opportunities\/[^/]+$/, {
    timeout: 30_000,
  });

  await page.getByRole('button', { name: /Advance to Consultation/i }).click();
  await expect(
    page.getByRole('button', { name: /Advance to Proposal/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Run conflict check' }).click();
  await expect(page.getByText(/Conflict:\s*Cleared/i)).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole('button', { name: /Advance to Proposal/i }).click();
  await expect(
    page.getByRole('button', { name: /Advance to Retainer/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Advance to Retainer/i }).click();
  await expect(page.getByRole('button', { name: /Advance to Won/i })).toBeVisible();

  await page.getByRole('button', { name: /Advance to Won/i }).click();
  await page.waitForURL(/\/matters\/[^/]+$/, {
    timeout: 30_000,
  });

  await expect(page.getByText('Linked Records')).toBeVisible();
  await expect(page.getByText('Originating Enquiry')).toBeVisible();
  await expect(
    page
      .getByText('Originating Enquiry')
      .locator('..')
      .getByRole('link', { name: new RegExp(leadSubject, 'i') }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Documents' }).click();
  await uploadRecordDocument(
    page,
    'matter-briefing-note.pdf',
    'Matter context document for the browser flow smoke test.',
  );

  await page.getByRole('link', { name: 'AI Research' }).click();
  await page.waitForURL(/\/court-intel\?.*sourceEntityType=matter/i, {
    timeout: 30_000,
  });

  await expect(page.getByText('AI Context')).toBeVisible();
  await expect(page.locator('#practiceArea')).not.toHaveValue('');
  await expect(page.getByRole('button', { name: /^Analyze$/i })).toBeEnabled();

  await page.getByRole('button', { name: /^Analyze$/i }).click();
  await expect(
    page.getByText(/workflow carried the linked CRM context into AI research/i),
  ).toBeVisible({
    timeout: 30_000,
  });
});
