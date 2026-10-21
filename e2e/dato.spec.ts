import { expect, test, type Page } from '@playwright/test';

// The soft note under the time on the date step looks at the time of day, not only the date.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

async function toDateStep(page: Page, now: string) {
  await page.clock.setFixedTime(new Date(now));
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, 'age-5').click();
  await visible(page, 'next').click();
  await expect(page.getByText('Steg 2 av 4').filter({ visible: true })).toBeVisible();
}

test('today at 21.01: the suggested 16.30 has been, so no «det går», and «Neste» still works', async ({ page }) => {
  await toDateStep(page, '2026-10-21T19:01:00Z'); // Wednesday 21.01 in Oslo
  await visible(page, 'day-2026-10-21').click();
  await expect(visible(page, 'party-time')).toContainText('16.30');
  const note = visible(page, 'date-notice');
  await expect(note).toHaveText(/Tidspunktet har allerede vært i dag/);
  await expect(note).not.toHaveText(/det går/);
  await expect(visible(page, 'next')).toBeEnabled();
});

test('today at 10.00: short notice, but it works', async ({ page }) => {
  await toDateStep(page, '2026-10-21T08:00:00Z'); // 10.00 in Oslo
  await visible(page, 'day-2026-10-21').click();
  await expect(visible(page, 'date-notice')).toHaveText(/Det er kort tid, men det går/);
});

test('tomorrow late in the evening: short notice as before', async ({ page }) => {
  await toDateStep(page, '2026-10-21T19:01:00Z');
  await visible(page, 'day-2026-10-22').click();
  await expect(visible(page, 'date-notice')).toHaveText(/Det er kort tid, men det går/);
});
