import {
  createFolder,
  createRoom,
  expect,
  openRoom,
  row,
  signUp,
  test,
  uniqueEmail,
} from './fixtures';

test.describe('the owner workspace', () => {
  test('signs up, creates a room and navigates a folder tree', async ({ page }) => {
    await signUp(page, uniqueEmail('owner'));
    await createRoom(page, 'Project Atlas');
    await openRoom(page, 'Project Atlas');

    await createFolder(page, 'Legal');
    await row(page, 'Legal').click();

    await expect(page.getByText('This folder is empty')).toBeVisible();

    await createFolder(page, 'Contracts');

    const breadcrumbs = page.getByRole('navigation', { name: 'breadcrumb' });

    await expect(breadcrumbs.getByRole('link', { name: 'Project Atlas' })).toBeVisible();
    await expect(breadcrumbs.getByText('Legal')).toBeVisible();

    await breadcrumbs.getByRole('link', { name: 'Project Atlas' }).click();

    await expect(row(page, 'Legal')).toBeVisible();
  });

  test('refuses a duplicate folder name in the same folder', async ({ page }) => {
    await signUp(page, uniqueEmail('owner'));
    await createRoom(page, 'Duplicates');
    await openRoom(page, 'Duplicates');

    await createFolder(page, 'Legal');

    await page.getByRole('button', { name: 'New folder' }).click();
    await page.getByRole('textbox', { name: 'Folder name' }).fill('Legal');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText(/already exists/i)).toBeVisible();
  });

  test('states what a folder deletion will take with it', async ({ page }) => {
    await signUp(page, uniqueEmail('owner'));
    await createRoom(page, 'Deletions');
    await openRoom(page, 'Deletions');

    await createFolder(page, 'Legal');
    await row(page, 'Legal').click();
    await expect(page.getByText('This folder is empty')).toBeVisible();

    await createFolder(page, 'Contracts');

    await page.getByRole('navigation', { name: 'breadcrumb' }).getByRole('link').first().click();
    await expect(row(page, 'Legal')).toBeVisible();

    await page.getByRole('button', { name: 'Actions for Legal' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    await expect(page.getByText('Delete this folder?')).toBeVisible();
    await expect(page.getByText(/1 folder and 0 files/)).toBeVisible();

    await page.getByRole('button', { name: 'Delete folder' }).click();

    await expect(page.getByText('This folder is empty')).toBeVisible();
  });
});
