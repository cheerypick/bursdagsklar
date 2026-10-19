import { expect, test, type Page } from '@playwright/test';

// The whole milestone-1 flow, in every engine: setup → weekend nudge → Festen er klar →
// Planen → Gjøremål → tick a to-do → reload keeps it.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

/** ISO date of the first Sunday at least `days` days from now (local time). */
function nextSundayAfter(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

test('welcome screen renders without waiting for fonts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await expect(page.getByText('Hele bursdagen, klar.').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
  expect(await page.evaluate(() => document.body.innerText.trim().length)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('date step: the next-Saturday chips pick a date in one tap', async ({ page }) => {
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, 'next').click();
  await visible(page, 'age-5').click();
  await visible(page, 'next').click();
  const input = visible(page, 'date-input');
  await expect(input).toHaveAttribute('type', 'date');
  await expect(input).toHaveAttribute('min', /^\d{4}-\d{2}-\d{2}$/);
  await expect(input).toHaveAttribute('max', /^\d{4}-\d{2}-\d{2}$/);
  await visible(page, 'saturday-chips').getByRole('button').first().click();
  await expect(visible(page, 'date-result')).toContainText('Lørdag');
  await expect(visible(page, 'weekend-nudge')).toHaveCount(0);
  await expect(visible(page, 'next')).toBeEnabled();
});

test('setup → Festen er klar → Planen → Gjøremål, and a tick survives reload', async ({ page }) => {
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, 'next').click();
  await visible(page, 'age-5').click();
  await visible(page, 'next').click();

  // A real date picker: fill the native <input type="date"> with a Sunday a few
  // weeks out. The gentle weekend hint offers the Saturday before; never a block.
  const sunday = nextSundayAfter(10);
  await visible(page, 'date-input').fill(sunday);
  await expect(visible(page, 'date-result')).toContainText('Søndag');
  const nudge = visible(page, 'weekend-nudge');
  await expect(nudge).toContainText('Det er en søndag – passer det?');
  await nudge.getByRole('button', { name: /^Bytt til lørdag \d+\./ }).click();
  await expect(visible(page, 'date-result')).toContainText('Lørdag');
  await expect(nudge).toHaveCount(0);
  await visible(page, 'next').click();
  // kids: keep the default (wait for the step, so the click isn't eaten by the fading one)
  await expect(
    page.getByRole('heading', { name: 'Hvor mange barn inviterer dere?' }).filter({ visible: true }),
  ).toBeVisible();
  await visible(page, 'next').click();
  await page.getByRole('radio', { name: 'Enhjørning' }).filter({ visible: true }).click();
  await visible(page, 'next').click();

  await expect(visible(page, 'screen-ready')).toContainText('Emmas fest er klar.');
  await visible(page, 'see-plan').click();
  await expect(visible(page, 'screen-plan')).toContainText('Emmas 5-årsdag');

  // Phone: bottom tab bar. Desktop: links in the top navigation.
  await page
    .getByRole('tab', { name: 'Gjøremål' })
    .or(page.getByRole('link', { name: 'Gjøremål' }))
    .filter({ visible: true })
    .first()
    .click();
  await expect(visible(page, 'screen-todo')).toBeVisible();
  const tick = page
    .getByRole('checkbox', { name: /^Marker som gjort: Skriv ut \d+ invitasjonskort$/ })
    .filter({ visible: true });
  await tick.click();
  await page.waitForTimeout(600); // storage writes are debounced 300 ms

  await page.reload();
  await expect(visible(page, 'screen-todo')).toBeVisible();
  await expect(
    page
      .getByRole('checkbox', { name: /^Marker som ikke gjort: Skriv ut \d+ invitasjonskort$/ })
      .filter({ visible: true }),
  ).toHaveCount(1);
});
