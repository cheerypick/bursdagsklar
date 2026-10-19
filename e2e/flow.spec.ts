import { expect, test, type Page } from '@playwright/test';

// The whole milestone-1 flow, in every engine: setup → neutral date picker → Festen er klar →
// Planen → Gjøremål → tick a to-do → reload keeps it.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

/** ISO date of the first given weekday (0 = Sunday … 6 = Saturday) at least `days` days from now. */
function nextDayAfter(days: number, weekday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
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

test('date step: neutral picker, the default time follows the day until edited', async ({ page }) => {
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
  // no Saturday shortcuts, no weekend hint
  await expect(visible(page, 'saturday-chips')).toHaveCount(0);
  await expect(page.getByText(/lørdag/i).filter({ visible: true })).toHaveCount(0);

  // a Wednesday: after barnehage, 16.30–18.30, and nothing suggests another day
  await input.fill(nextDayAfter(10, 3));
  await expect(visible(page, 'date-result')).toContainText('Onsdag');
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.30–18.30');
  await expect(visible(page, 'weekend-nudge')).toHaveCount(0);
  await expect(page.getByText(/passer det\?|Bytt til/).filter({ visible: true })).toHaveCount(0);

  // a Saturday: 12.00–14.00; back to a Friday: 16.30–18.30 again
  await input.fill(nextDayAfter(10, 6));
  await expect(visible(page, 'party-time')).toContainText('Kl. 12.00–14.00');
  await input.fill(nextDayAfter(10, 5));
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.30–18.30');

  // a hand-set time (15-minute steps) stays when the date changes
  await visible(page, 'party-time').getByRole('button', { name: 'Endre klokkeslett' }).click();
  await page.getByRole('button', { name: 'Start 15 minutter senere' }).filter({ visible: true }).click();
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.45–18.30');
  await input.fill(nextDayAfter(10, 6));
  await expect(visible(page, 'date-result')).toContainText('Lørdag');
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.45–18.30');
  await expect(visible(page, 'next')).toBeEnabled();
});

test('setup → Festen er klar → Planen → Gjøremål, and a tick survives reload', async ({ page }) => {
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, 'next').click();
  await visible(page, 'age-5').click();
  await visible(page, 'next').click();

  // A real date picker: fill the native <input type="date"> with a Wednesday a few weeks out.
  await visible(page, 'date-input').fill(nextDayAfter(10, 3));
  await expect(visible(page, 'date-result')).toContainText('Onsdag');
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.30–18.30');
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
