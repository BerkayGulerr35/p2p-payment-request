import { expect, test, type Page } from '@playwright/test';

async function loginAs(page: Page, persona: 'alice' | 'bob'): Promise<void> {
  await page.goto('/login');
  const button = page.getByRole('button', {
    name: persona === 'alice' ? 'Continue as Alice' : 'Continue as Bob',
  });
  await button.click();
  await page.waitForURL('**/dashboard');
}

test.describe.serial('US3 — Cancel a pending outgoing request', () => {
  test('Alice can cancel a request she sent to Bob', async ({ page }) => {
    const memo = `cancel-test-${Date.now()}`;

    // Create the request as Alice
    await loginAs(page, 'alice');
    await page.getByRole('link', { name: 'New request' }).click();
    await page.waitForURL('**/requests/new');
    await page.getByLabel('Recipient email').fill('bob@example.com');
    await page.getByLabel('Amount (USD)').fill('3.00');
    await page.getByLabel('Memo (optional)').fill(memo);
    await page.getByRole('button', { name: 'Send request' }).click();
    await page.waitForURL('**/dashboard');

    // Open the outgoing card and cancel it
    const card = page
      .locator('[data-slot="outgoing-list"] [data-slot="request-card"]')
      .filter({ hasText: memo });
    await expect(card).toBeVisible();
    await card.click();

    await page.waitForURL(/\/requests\/[0-9a-f-]+$/);
    await page.locator('[data-slot="cancel-button"]').click();

    await expect(page.locator('[data-slot="status-badge"]')).toHaveAttribute(
      'data-status',
      'cancelled',
      { timeout: 5000 },
    );
    await expect(page.locator('[data-slot="request-actions"]')).toHaveCount(0);
  });

  test('Bob cannot pay a request that Alice has cancelled', async ({ page }) => {
    const memo = `cancel-blocks-pay-${Date.now()}`;

    // Alice creates and cancels
    await loginAs(page, 'alice');
    await page.goto('/requests/new');
    await page.getByLabel('Recipient email').fill('bob@example.com');
    await page.getByLabel('Amount (USD)').fill('1.00');
    await page.getByLabel('Memo (optional)').fill(memo);
    await page.getByRole('button', { name: 'Send request' }).click();
    await page.waitForURL('**/dashboard');

    const card = page
      .locator('[data-slot="outgoing-list"] [data-slot="request-card"]')
      .filter({ hasText: memo });
    await card.click();
    await page.waitForURL(/\/requests\/[0-9a-f-]+$/);
    await page.locator('[data-slot="cancel-button"]').click();
    await expect(page.locator('[data-slot="status-badge"]')).toHaveAttribute(
      'data-status',
      'cancelled',
      { timeout: 5000 },
    );

    // Sign out and switch to Bob
    await page.locator('[data-slot="sign-out-button"]').click();
    await page.waitForURL('**/login');

    await loginAs(page, 'bob');

    // Bob's card for this memo should still be visible but with no actions
    const bobCard = page
      .locator('[data-slot="incoming-list"] [data-slot="request-card"]')
      .filter({ hasText: memo });
    await bobCard.click();
    await page.waitForURL(/\/requests\/[0-9a-f-]+$/);
    await expect(page.locator('[data-slot="status-badge"]')).toHaveAttribute(
      'data-status',
      'cancelled',
    );
    await expect(page.locator('[data-slot="request-actions"]')).toHaveCount(0);
  });
});
