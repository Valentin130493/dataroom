import { expect, test as base, type Browser, type Locator, type Page } from '@playwright/test';

export interface SignedUpUser {
  email: string;
  page: Page;
}

let sequence = 0;

export function uniqueEmail(prefix: string): string {
  sequence += 1;

  return `${prefix}-${Date.now()}-${sequence}@acme.test`;
}

export function row(page: Page, name: string): Locator {
  return page.getByRole('button', { name, exact: true });
}

export async function signUp(page: Page, email: string): Promise<void> {
  await page.goto('/signup');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'My data rooms' })).toBeVisible();
}

export async function signUpInNewContext(browser: Browser, email: string): Promise<SignedUpUser> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email);

  return { email, page };
}

export async function createRoom(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'New data room' }).first().click();
  await page.getByRole('textbox', { name: 'Name' }).fill(name);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

export async function openRoom(page: Page, name: string): Promise<void> {
  await page.getByRole('link', { name }).click();
  await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible();
}

export async function createFolder(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'New folder' }).click();
  await page.getByRole('textbox', { name: 'Folder name' }).fill(name);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(row(page, name)).toBeVisible();
}

export const test = base;
export { expect };
