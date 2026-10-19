import { expect, test, type Page } from '@playwright/test';

// The whole milestone-1 flow, in every engine: setup → weekend nudge → Festen er klar →
// Planen → Gjøremål → tick a to-do → reload keeps it.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

test('welcome screen renders without waiting for fonts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await expect(page.getByText('Hele bursdagen, klar.').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
  expect(await page.evaluate(() => document.body.innerText.trim().length)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('setup → Festen er klar → Planen → Gjøremål, and a tick survives reload', async ({ page }) => {
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, 'next').click();
  await visible(page, 'age-5').click();
  await visible(page, 'next').click();

  // A date without a year resolves to the next 8. november; whatever year, the
  // flow must parse it and show a result (this broke in Safari once).
  await visible(page, 'date-input').fill('8. november');
  await expect(visible(page, 'date-result')).toBeVisible();
  const nudge = visible(page, 'weekend-nudge');
  if (await nudge.count()) {
    await expect(nudge).toContainText('8. november er en søndag');
    await page.getByText('Ja, lørdag 7.').filter({ visible: true }).click();
    await expect(visible(page, 'date-result')).toHaveText('Lørdag 7. november');
  }
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
