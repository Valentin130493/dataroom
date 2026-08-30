import { createRoom, expect, openRoom, row, signUp, test, uniqueEmail } from './fixtures';
import type { Page } from '@playwright/test';

const PDF = Buffer.from('%PDF-1.4\ntest fixture\n%%EOF');

async function choose(page: Page, name: string): Promise<void> {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name, mimeType: 'application/pdf', buffer: PDF });
}

async function dismissProgress(page: Page): Promise<void> {
  const done = page.getByRole('button', { name: 'Done' });

  await done.waitFor();
  await done.click();
  await expect(done).toHaveCount(0);
}

test.describe('uploading', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/storage/v1/object/upload/**', (route) =>
      route.fulfill({ status: 200, body: '{}', contentType: 'application/json' }),
    );
  });

  test('shows progress in a dialog and reports the result', async ({ page }) => {
    await signUp(page, uniqueEmail('owner'));
    await createRoom(page, 'Uploads');
    await openRoom(page, 'Uploads');

    await choose(page, 'report.pdf');

    await expect(page.getByText('1 file uploaded')).toBeVisible();

    await dismissProgress(page);
    await expect(row(page, 'report.pdf')).toBeVisible();
  });

  test('keeps both copies on a name clash', async ({ page }) => {
    await signUp(page, uniqueEmail('owner'));
    await createRoom(page, 'Clashes');
    await openRoom(page, 'Clashes');

    await choose(page, 'report.pdf');
    await dismissProgress(page);

    await choose(page, 'report.pdf');

    await expect(page.getByText('already exists here')).toBeVisible();
    await page.getByRole('button', { name: 'Keep both' }).click();

    await dismissProgress(page);
    await expect(row(page, 'report (1).pdf')).toBeVisible();
  });

  test('finds an uploaded file through search', async ({ page }) => {
    await signUp(page, uniqueEmail('owner'));
    await createRoom(page, 'Searchable');
    await openRoom(page, 'Searchable');

    await choose(page, 'Quarterly report.pdf');
    await dismissProgress(page);

    await page.getByRole('button', { name: /Search files/ }).click();
    await page.getByPlaceholder('Search files and folders').fill('quarter');

    await expect(page.getByRole('option', { name: /Quarterly report/ })).toBeVisible();
  });
});
