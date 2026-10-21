import { expect, test, type Page } from '@playwright/test';

// The whole flow, in every engine: 4-step setup (who · when · how many · where) → our own
// calendar → Festen er klar → Planen → Gjøremål → tick a to-do → reload keeps it.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

/** ISO date of the first given weekday (0 = Sunday … 6 = Saturday) at least `days` days from now. */
function nextDayAfter(days: number, weekday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Click a day in our calendar: back to this month, then page forward with the big arrow until it shows. */
async function pickDay(page: Page, iso: string) {
  const day = visible(page, `day-${iso}`);
  if (await day.count()) return day.click();
  const prev = visible(page, 'calendar-prev');
  while (await prev.isEnabled()) await prev.click();
  for (let i = 0; i < 13; i++) {
    if (await day.count()) return day.click();
    await visible(page, 'calendar-next').click();
  }
  throw new Error(`day ${iso} not reachable`);
}

async function who(page: Page, name = 'Emma', age = 5) {
  await page.goto('/');
  await visible(page, 'start').click();
  await expect(page.getByText('Steg 1 av 4').filter({ visible: true })).toBeVisible();
  await visible(page, 'name-input').fill(name);
  await visible(page, `age-${age}`).click();
}

test('welcome screen renders without waiting for fonts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await expect(page.getByText('Hele bursdagen, klar.').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
  expect(await page.evaluate(() => document.body.innerText.trim().length)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('who step: ages 3–10 only', async ({ page }) => {
  await who(page);
  for (const a of [1, 2, 11, 12]) await expect(visible(page, `age-${a}`)).toHaveCount(0);
  for (const a of [3, 10]) await expect(visible(page, `age-${a}`)).toHaveCount(1);
});

test('date step: our own calendar, Norwegian, Monday first; the time follows the day until edited', async ({
  page,
}) => {
  await who(page);
  await visible(page, 'next').click();
  await expect(page.getByText('Steg 2 av 4').filter({ visible: true })).toBeVisible();
  // no native date input any more
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
  const cal = visible(page, 'calendar');
  await expect(cal).toBeVisible();
  await expect(cal).toContainText(/ma\s*ti\s*on\s*to\s*fr\s*lø\s*sø/i);
  await expect(visible(page, 'calendar-month')).toHaveText(
    /^(Januar|Februar|Mars|April|Mai|Juni|Juli|August|September|Oktober|November|Desember) \d{4}$/,
  );
  // this month: the previous-month arrow is off, yesterday is disabled, today is marked
  await expect(visible(page, 'calendar-prev')).toBeDisabled();
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (yesterday.getMonth() === today.getMonth()) await expect(visible(page, `day-${iso(yesterday)}`)).toBeDisabled();
  await expect(visible(page, `day-${iso(today)}`)).toHaveAttribute('aria-label', /, i dag$/);

  // navigate months: forward and back again
  const first = await visible(page, 'calendar-month').innerText();
  await visible(page, 'calendar-next').click();
  await expect(visible(page, 'calendar-month')).not.toHaveText(first);
  await visible(page, 'calendar-prev').click();
  await expect(visible(page, 'calendar-month')).toHaveText(first);

  // a Wednesday: after barnehage, 16.30–18.30, with an accessible label like «onsdag 11. november 2026»
  const wed = nextDayAfter(10, 3);
  await pickDay(page, wed);
  await expect(visible(page, `day-${wed}`)).toHaveAttribute('aria-label', /^onsdag \d{1,2}\. [a-zæøå]+ \d{4}$/);
  await expect(visible(page, `day-${wed}`)).toHaveAttribute('aria-pressed', 'true');
  await expect(visible(page, 'date-result')).toContainText('Onsdag');
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.30–18.30');
  await expect(page.getByText(/passer det\?|Bytt til/).filter({ visible: true })).toHaveCount(0);

  // a Saturday: 12.00–14.00; back to a Friday: 16.30–18.30 again
  await pickDay(page, nextDayAfter(10, 6));
  await expect(visible(page, 'party-time')).toContainText('Kl. 12.00–14.00');
  await pickDay(page, nextDayAfter(10, 5));
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.30–18.30');

  // a hand-set time (15-minute steps) stays when the date changes
  await visible(page, 'party-time').getByRole('button', { name: 'Endre klokkeslett' }).click();
  await page.getByRole('button', { name: 'Start 15 minutter senere' }).filter({ visible: true }).click();
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.45–18.30');
  await pickDay(page, nextDayAfter(10, 6));
  await expect(visible(page, 'date-result')).toContainText('Lørdag');
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.45–18.30');
  await expect(visible(page, 'next')).toBeEnabled();
});

test('date step: keyboard arrows move between days on the web', async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), 'keyboard is a desktop concern');
  await who(page);
  await visible(page, 'next').click();
  const wed = nextDayAfter(10, 3);
  await pickDay(page, wed);
  await visible(page, `day-${wed}`).focus();
  await page.keyboard.press('ArrowRight');
  const next = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
  expect(next).toMatch(/^torsdag /);
  await page.keyboard.press('Enter');
  await expect(visible(page, 'date-result')).toContainText('Torsdag');
});

test('setup in 4 steps → Festen er klar → Planen → Gjøremål, and a tick survives reload', async ({ page }) => {
  await who(page);
  await visible(page, 'next').click();
  await pickDay(page, nextDayAfter(10, 3));
  await expect(visible(page, 'date-result')).toContainText('Onsdag');
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.30–18.30');
  await visible(page, 'next').click();
  // kids: keep the default (wait for the step, so the click isn't eaten by the fading one)
  await expect(
    page.getByRole('heading', { name: 'Hvor mange barn inviterer dere?' }).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByText('Steg 3 av 4').filter({ visible: true })).toBeVisible();
  await visible(page, 'next').click();
  // where (the last step); no theme in setup
  await expect(page.getByText('Steg 4 av 4').filter({ visible: true })).toBeVisible();
  await expect(visible(page, 'next')).toBeDisabled();
  await visible(page, 'place-hus').click();
  await visible(page, 'next').click();

  await expect(visible(page, 'screen-ready')).toContainText('Emmas fest er klar.');
  // the way to the plan is the hero of the screen: visible without scrolling
  const cta = visible(page, 'see-plan');
  await expect(cta).toHaveAccessibleName('Se planen din');
  await expect(cta).toBeInViewport({ ratio: 1 });
  const box = (await cta.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(64);
  await cta.click();
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

test('joint birthday: two children of different ages', async ({ page }) => {
  await who(page, 'Emma', 5);
  await visible(page, 'add-child').click();
  await visible(page, 'name-input-2').fill('Jonas');
  await expect(visible(page, 'next')).toBeDisabled(); // Jonas has no age yet
  await visible(page, 'age-2-7').click();
  await visible(page, 'next').click();
  await pickDay(page, nextDayAfter(10, 3));
  await visible(page, 'next').click();
  await expect(
    page.getByRole('heading', { name: 'Hvor mange barn inviterer dere?' }).filter({ visible: true }),
  ).toBeVisible();
  await expect(visible(page, 'step-kids')).toContainText('Uten Emma og Jonas');
  await visible(page, 'next').click();
  await visible(page, 'place-leilighet').click();
  await visible(page, 'next').click();

  const ready = visible(page, 'screen-ready');
  await expect(ready).toContainText('Festen til Emma og Jonas er klar.');
  await expect(visible(page, 'invitation-card')).toContainText('Emma og Jonas');
  await expect(visible(page, 'invitation-card')).toContainText('fyller 5 og 7');
  await visible(page, 'see-plan').click();
  await expect(visible(page, 'plan-hero')).toContainText('Emma og Jonas fyller 5 og 7');
});
