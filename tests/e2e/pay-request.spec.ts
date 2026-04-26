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

test.describe.serial('US2 — Pay an incoming request', () => {
  test('Bob can pay a pending request from Alice', async ({ page }) => {
    const memo = `pay-test-${Date.now()}`;
    await createRequestFromAliceToBob(page, '12.34', memo);

    await loginAs(page, 'bob');

    const card = page
      .locator('[data-slot="incoming-list"] [data-slot="request-card"]')
      .filter({ hasText: memo });
    await expect(card).toBeVisible();
    await card.click();

    await page.waitForURL(/\/requests\/[0-9a-f-]+$/);
    await expect(page.locator('[data-slot="status-badge"]')).toHaveAttribute(
      'data-status',
      'pending',
    );

    await page.locator('[data-slot="pay-button"]').click();
    await expect(page.locator('[data-slot="pay-button"]')).toContainText('Processing');

    // Status flips after the 2–3 s simulated processing.
    await expect(page.locator('[data-slot="status-badge"]')).toHaveAttribute(
      'data-status',
      'paid',
      { timeout: 8000 },
    );
  });

  test('Bob cannot pay a request that is already paid', async ({ page }) => {
    const memo = `pay-twice-${Date.now()}`;
    await createRequestFromAliceToBob(page, '5.00', memo);

    await loginAs(page, 'bob');

    const card = page
      .locator('[data-slot="incoming-list"] [data-slot="request-card"]')
      .filter({ hasText: memo });
    await card.click();
    await page.waitForURL(/\/requests\/[0-9a-f-]+$/);

    // First pay
    await page.locator('[data-slot="pay-button"]').click();
    await expect(page.locator('[data-slot="status-badge"]')).toHaveAttribute(
      'data-status',
      'paid',
      { timeout: 8000 },
    );

    // Once paid, the action buttons disappear because status is no longer pending.
    await expect(page.locator('[data-slot="request-actions"]')).toHaveCount(0);
  });
});
