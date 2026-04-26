import { expect, test, type Page } from '@playwright/test';

async function loginAs(page: Page, persona: 'alice' | 'bob'): Promise<void> {
  await page.goto('/login');
  const button = page.getByRole('button', {
    name: persona === 'alice' ? 'Continue as Alice' : 'Continue as Bob',
  });
  await button.click();
  await page.waitForURL('**/dashboard');
}

async function signOut(page: Page): Promise<void> {
  await page.locator('[data-slot="sign-out-button"]').click();
  await page.waitForURL('**/login');
}

async function createRequestFromAliceToBob(
  page: Page,
  amount: string,
  memo: string,
): Promise<void> {
  await loginAs(page, 'alice');
  await page.getByRole('link', { name: 'New request' }).click();
  await page.waitForURL('**/requests/new');
  await page.getByLabel('Recipient email').fill('bob@example.com');
  await page.getByLabel('Amount (USD)').fill(amount);
  await page.getByLabel('Memo (optional)').fill(memo);
  await page.getByRole('button', { name: 'Send request' }).click();
  await page.waitForURL('**/dashboard');
  await signOut(page);
}

test.describe.serial('US2 — Decline an incoming request', () => {
  test('Bob can decline a pending request from Alice', async ({ page }) => {
    const memo = `decline-test-${Date.now()}`;
    await createRequestFromAliceToBob(page, '7.50', memo);

    await loginAs(page, 'bob');

    const card = page
      .locator('[data-slot="incoming-list"] [data-slot="request-card"]')
      .filter({ hasText: memo });
    await card.click();

    await page.waitForURL(/\/requests\/[0-9a-f-]+$/);
    await page.locator('[data-slot="decline-button"]').click();

    await expect(page.locator('[data-slot="status-badge"]')).toHaveAttribute(
      'data-status',
      'declined',
      { timeout: 5000 },
    );
    // Action panel disappears once the request is no longer pending.
    await expect(page.locator('[data-slot="request-actions"]')).toHaveCount(0);
  });
});
