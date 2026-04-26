import { expect, test, type Page } from '@playwright/test';

async function loginAs(page: Page, persona: 'alice' | 'bob'): Promise<void> {
  await page.goto('/login');
  await page
    .getByRole('button', {
      name: persona === 'alice' ? 'Continue as Alice' : 'Continue as Bob',
    })
    .click();
  await page.waitForURL('**/dashboard');
}

async function createRequestAs(
  page: Page,
  persona: 'alice' | 'bob',
  recipientEmail: string,
  amount: string,
  memo: string,
): Promise<void> {
  await loginAs(page, persona);
  await page.goto('/requests/new');
  await page.getByLabel('Recipient email').fill(recipientEmail);
  await page.getByLabel('Amount (USD)').fill(amount);
  await page.getByLabel('Memo (optional)').fill(memo);
  await page.getByRole('button', { name: 'Send request' }).click();
  await page.waitForURL('**/dashboard');
  await page.locator('[data-slot="sign-out-button"]').click();
  await page.waitForURL('**/login');
}

test.describe.serial('US6 — Dashboard filter and search', () => {
  test('search narrows the dashboard by memo content', async ({ page }) => {
    const lunchMemo = `lunch-${Date.now()}`;
    const dinnerMemo = `dinner-${Date.now()}`;

    await createRequestAs(page, 'alice', 'bob@example.com', '11.11', lunchMemo);
    await createRequestAs(page, 'alice', 'bob@example.com', '22.22', dinnerMemo);

    await loginAs(page, 'alice');
    await expect(page.locator('[data-slot="outgoing-list"]')).toContainText(lunchMemo);
    await expect(page.locator('[data-slot="outgoing-list"]')).toContainText(dinnerMemo);

    await page.locator('[data-slot="filter-search"]').fill('lunch-');
    await expect(page.locator('[data-slot="outgoing-list"]')).toContainText(lunchMemo);
    await expect(page.locator('[data-slot="outgoing-list"]')).not.toContainText(dinnerMemo);

    await page.locator('[data-slot="filter-search"]').fill('dinner-');
    await expect(page.locator('[data-slot="outgoing-list"]')).toContainText(dinnerMemo);
    await expect(page.locator('[data-slot="outgoing-list"]')).not.toContainText(lunchMemo);
  });
});
