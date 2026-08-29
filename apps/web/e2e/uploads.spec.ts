import { createRoom, expect, openRoom, row, signUp, test, uniqueEmail } from './fixtures';
import type { Page } from '@playwright/test';

const PDF = Buffer.from('%PDF-1.4\ntest fixture\n%%EOF');

async function upload(page: Page, name: string): Promise<void> {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name, mimeType: 'application/pdf', buffer: PDF });
}

test.describe('uploading', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/storage/v1/object/upload/**', (route) =>
      route.fulfill({ status: 200, body: '{}', contentType: 'application/json' }),
    );
  });

  test('uploads a file and keeps both copies on a name clash', async ({ page }) => {
    await signUp(page, uniqueEmail('owner'));
    await createRoom(page, 'Uploads');
    await openRoom(page, 'Uploads');

    await upload(page, 'report.pdf');
    await expect(row(page, 'report.pdf')).toBeVisible();

    await upload(page, 'report.pdf');

    await expect(page.getByText('already exists here')).toBeVisible();
    await page.getByRole('button', { name: 'Keep both' }).click();

    await expect(row(page, 'report (1).pdf')).toBeVisible();
  });

  test('finds an uploaded file through search', async ({ page }) => {
    await signUp(page, uniqueEmail('owner'));
    await createRoom(page, 'Searchable');
    await openRoom(page, 'Searchable');

    await upload(page, 'Quarterly report.pdf');
    await expect(row(page, 'Quarterly report.pdf')).toBeVisible();

    await page.getByRole('button', { name: /Search files/ }).click();
    await page.getByPlaceholder('Search files and folders').fill('quarter');

    await expect(page.getByRole('option', { name: /Quarterly report/ })).toBeVisible();
  });
});
