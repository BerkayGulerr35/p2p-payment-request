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

test.describe.serial('US5 — Public read-only link', () => {
  test('an unauthenticated visitor can view a request summary at /r/[public_id]', async ({
    page,
    browser,
  }) => {
    const memo = `public-link-${Date.now()}`;

    // Alice creates a request and grabs the public_id from the detail page.
    await loginAs(page, 'alice');
    await page.goto('/requests/new');
    await page.getByLabel('Recipient email').fill('bob@example.com');
    await page.getByLabel('Amount (USD)').fill('25.00');
    await page.getByLabel('Memo (optional)').fill(memo);
    await page.getByRole('button', { name: 'Send request' }).click();
    await page.waitForURL('**/dashboard');

    const card = page
      .locator('[data-slot="outgoing-list"] [data-slot="request-card"]')
      .filter({ hasText: memo });
    await card.click();
    await page.waitForURL(/\/requests\/[0-9a-f-]+$/);

    const publicId = await page
      .locator('[data-slot="copy-public-link"]')
      .getAttribute('data-public-id');
    expect(publicId).toBeTruthy();

    // Open an incognito context (no Alice session) and navigate to /r/[public_id].
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(`/r/${publicId}`);

    await expect(guestPage.locator('[data-slot="public-summary"]')).toBeVisible();
    await expect(guestPage.locator('[data-slot="amount"]')).toContainText('$25.00');
    await expect(guestPage.locator('[data-slot="memo"]')).toContainText(memo);
    await expect(guestPage.locator('[data-slot="sender-name"]')).toContainText('Alice');

    // No action controls anywhere on the public page.
    await expect(guestPage.locator('[data-slot="pay-button"]')).toHaveCount(0);
    await expect(guestPage.locator('[data-slot="decline-button"]')).toHaveCount(0);
    await expect(guestPage.locator('[data-slot="cancel-button"]')).toHaveCount(0);

    await guest.close();
  });

  test('an unknown public_id renders the not-found page', async ({ browser }) => {
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto('/r/00000000-0000-0000-0000-000000000000');
    // Next.js dev server serves the not-found page with HTTP 200, so we
    // assert by checking the rendered content. In a production build the
    // status would be 404; either way the page itself is the correct one.
    await expect(guestPage.locator('[data-slot="public-summary-not-found"]')).toBeVisible();
    await expect(guestPage.locator('[data-slot="public-summary"]')).toHaveCount(0);
    await guest.close();
  });
});
