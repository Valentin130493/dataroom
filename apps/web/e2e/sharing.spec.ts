import {
  createFolder,
  createRoom,
  expect,
  openRoom,
  signUp,
  signUpInNewContext,
  test,
  uniqueEmail,
} from './fixtures';

test.describe('sharing', () => {
  test('a public link opens without a session and dies when revoked', async ({ page, browser }) => {
    await signUp(page, uniqueEmail('owner'));
    await createRoom(page, 'Public deal');
    await openRoom(page, 'Public deal');
    await createFolder(page, 'Legal');

    await page.getByRole('button', { name: 'Actions for Legal' }).click();
    await page.getByRole('menuitem', { name: 'Share' }).click();
    await page.getByRole('tab', { name: 'Public link' }).click();
    await page.getByRole('button', { name: 'Create public link' }).click();

    const link = page.getByRole('textbox', { name: 'Public link' });

    await expect(link).toHaveValue(/\/s\//);

    const url = await link.inputValue();

    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();

    await visitorPage.goto(url);

    await expect(visitorPage.getByRole('heading', { name: 'Legal' })).toBeVisible();
    await expect(visitorPage.getByText('Read-only')).toBeVisible();
    await expect(visitorPage.getByRole('button', { name: 'Upload' })).toHaveCount(0);
    await expect(visitorPage.getByRole('button', { name: 'New folder' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Revoke link' }).click();
    await expect(page.getByRole('button', { name: 'Create public link' })).toBeVisible();

    await visitorPage.reload();

    await expect(visitorPage.getByText('This link was revoked')).toBeVisible();

    await visitor.close();
  });

  test('an invited person sees the folder and cannot change it', async ({ page, browser }) => {
    const guestEmail = uniqueEmail('guest');
    const guest = await signUpInNewContext(browser, guestEmail);

    await signUp(page, uniqueEmail('owner'));
    await createRoom(page, 'Invited deal');
    await openRoom(page, 'Invited deal');
    await createFolder(page, 'Legal');
    await createFolder(page, 'Financials');

    await page.getByRole('button', { name: 'Actions for Legal' }).click();
    await page.getByRole('menuitem', { name: 'Share' }).click();
    await page.getByLabel('Emails to invite').fill(guestEmail);
    await page.getByRole('button', { name: 'Invite' }).click();

    await expect(page.getByText(guestEmail)).toBeVisible();

    await page.keyboard.press('Escape');

    await guest.page.goto('/shared');

    await expect(guest.page.getByText('Legal')).toBeVisible();
    await expect(guest.page.getByText('Financials')).toHaveCount(0);

    await guest.page.getByText('Legal').click();

    await expect(guest.page.getByRole('button', { name: 'Upload' })).toHaveCount(0);

    await guest.page.close();
  });
});
