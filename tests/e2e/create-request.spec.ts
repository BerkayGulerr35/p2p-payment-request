import { expect, test } from '@playwright/test';

// Logs in as the seeded persona via the dev-mode quick-login button.
async function loginAs(
  page: import('@playwright/test').Page,
  persona: 'alice' | 'bob',
): Promise<void> {
  await page.goto('/login');
  const button = page.getByRole('button', {
    name: persona === 'alice' ? 'Continue as Alice' : 'Continue as Bob',
  });
  await button.click();
  await page.waitForURL('**/dashboard');
}

test.describe('US1 — Send a payment request', () => {
  test('Alice can create a request to Bob and see it on her dashboard', async ({ page }) => {
    await loginAs(page, 'alice');

    await page.getByRole('link', { name: 'New request' }).click();
    await page.waitForURL('**/requests/new');

    await page.getByLabel('Recipient email').fill('bob@example.com');
    await page.getByLabel('Amount (USD)').fill('50.00');
    await page.getByLabel('Memo (optional)').fill('Lunch yesterday');
    await page.getByRole('button', { name: 'Send request' }).click();

    await page.waitForURL('**/dashboard');
    const card = page.locator('[data-slot="outgoing-list"] [data-slot="request-card"]').first();
    await expect(card).toBeVisible();
    await expect(card.locator('[data-slot="amount"]')).toContainText('$50.00');
    await expect(card.locator('[data-slot="memo"]')).toContainText('Lunch yesterday');
    await expect(card.locator('[data-slot="counterparty-name"]')).toContainText('Bob');
  });

  test('rejects an unregistered recipient email', async ({ page }) => {
    await loginAs(page, 'alice');
    await page.goto('/requests/new');

    await page.getByLabel('Recipient email').fill('ghost@example.com');
    await page.getByLabel('Amount (USD)').fill('10.00');
    await page.getByRole('button', { name: 'Send request' }).click();

    await expect(page.locator('[data-slot="form-error"]')).toContainText(
      'No registered user has that email.',
    );
  });

  test('rejects amounts above the maximum', async ({ page }) => {
    await loginAs(page, 'alice');
    await page.goto('/requests/new');

    await page.getByLabel('Recipient email').fill('bob@example.com');
    await page.getByLabel('Amount (USD)').fill('1000000.01');
    await page.getByRole('button', { name: 'Send request' }).click();

    await expect(page.locator('[data-slot="error-amount_dollars"]')).toBeVisible();
  });

  test('rejects a self-request', async ({ page }) => {
    await loginAs(page, 'alice');
    await page.goto('/requests/new');

    await page.getByLabel('Recipient email').fill('alice@example.com');
    await page.getByLabel('Amount (USD)').fill('5.00');
    await page.getByRole('button', { name: 'Send request' }).click();

    await expect(page.locator('[data-slot="form-error"]')).toContainText(
      'You cannot send a request to yourself.',
    );
  });
});
