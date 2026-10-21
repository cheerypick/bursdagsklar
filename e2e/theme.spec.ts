import { expect, test, type Locator, type Page } from '@playwright/test';

// The theme is optional and chosen on Planen («Velg tema (valgfritt)»). Without one the whole app
// keeps the neutral brand look; picking one repaints everything. Frost's primary is #1F5A8A =
// rgb(31, 90, 138); the brand primary is #1F3D36 = rgb(31, 61, 54).
const FROST_PRIMARY = 'rgb(31, 90, 138)';
const BRAND_PRIMARY = 'rgb(31, 61, 54)';

const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
const bg = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);

async function setup(page: Page) {
  await page.goto('/');
  const start = visible(page, 'start');
  await expect(start).toBeVisible();
  expect(await bg(start)).toBe(BRAND_PRIMARY);
  await start.click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, 'age-5').click();
  await visible(page, 'next').click();
  // the first pickable day two weeks or more out: page forward once, pick a day in the middle
  await visible(page, 'calendar-next').click();
  await visible(page, 'calendar-grid')
    .getByRole('button', { name: /^(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag) 15\. / })
    .click();
  await expect(visible(page, 'date-result')).not.toContainText('Velg');
  await visible(page, 'next').click();
  await expect(
    page.getByRole('heading', { name: 'Hvor mange barn blir det?' }).filter({ visible: true }),
  ).toBeVisible();
  await visible(page, 'next').click();
  await visible(page, 'place-hus').click();
  await visible(page, 'next').click();
}

test('no theme: neutral look and words everywhere, and a «Velg tema» card on Planen', async ({ page }) => {
  await setup(page);
  const ready = visible(page, 'screen-ready');
  await expect(ready).toContainText('Emmas fest er klar.');
  expect(await bg(ready)).toBe(BRAND_PRIMARY);
  await expect(visible(page, 'invitation-headline')).toHaveText('Bli med på bursdagsfest!');
  await expect(ready).not.toContainText(/Frost|Enhjørning|Pokémon|Paw Patrol|tema/i);
  await expect(visible(page, 'license-note')).toHaveCount(0);

  await visible(page, 'see-plan').click();
  expect(await bg(visible(page, 'plan-hero'))).toBe(BRAND_PRIMARY);
  await expect(visible(page, 'theme-card')).toContainText('Velg tema (valgfritt)');
  await expect(visible(page, 'license-note')).toHaveCount(0);
});

test('Frost chosen from the Planen card paints Planen and Festen er klar', async ({ page }) => {
  await setup(page);
  await visible(page, 'see-plan').click();
  await visible(page, 'theme-card').click();
  await expect(visible(page, 'screen-theme')).toBeVisible();
  // the picker names licensed themes, so the not-affiliated line is there
  await expect(visible(page, 'license-note')).toContainText('ikke tilknyttet Disney, Spin Master');
  await page.getByRole('radio', { name: 'Frost' }).filter({ visible: true }).click();
  await visible(page, 'theme-done').click();
  await page.waitForTimeout(600); // storage writes are debounced 300 ms

  const hero = visible(page, 'plan-hero');
  await expect(hero).toContainText('Emmas 5-årsdag');
  expect(await bg(hero)).toBe(FROST_PRIMARY);
  await expect(visible(page, 'plan-greeting')).toHaveText('Det blir en iskald fest!');
  await expect(visible(page, 'theme-card')).toContainText('Tema: Frost');
  expect(await bg(visible(page, 'next-task-cta'))).toBe(FROST_PRIMARY);
  await expect(visible(page, 'screen-plan')).toContainText('Lyseblå og hvit kake');
  await expect(visible(page, 'license-note')).toBeVisible();

  // the theme survives a reload, and Festen er klar follows it too
  await page.reload();
  expect(await bg(visible(page, 'plan-hero'))).toBe(FROST_PRIMARY);
  await page.goto('/klar');
  const ready = visible(page, 'screen-ready');
  expect(await bg(ready)).toBe(FROST_PRIMARY);
  await expect(visible(page, 'invitation-headline')).toHaveText('Bli med på Frost-fest med snø og glitter!');

  // and «Uten tema» goes back to the neutral look
  await page.goto('/tema');
  await visible(page, 'theme-none').click();
  await visible(page, 'theme-done').click();
  expect(await bg(visible(page, 'plan-hero'))).toBe(BRAND_PRIMARY);
  await expect(visible(page, 'theme-card')).toContainText('Velg tema (valgfritt)');
});

test('a non-licensed theme shows no not-affiliated line on Planen', async ({ page }) => {
  await setup(page);
  await visible(page, 'see-plan').click();
  await visible(page, 'theme-card').click();
  await page.getByRole('radio', { name: 'Dinosaurer' }).filter({ visible: true }).click();
  await visible(page, 'theme-done').click();
  await expect(visible(page, 'plan-greeting')).toHaveText('Klar for en brølende god fest?');
  await expect(visible(page, 'license-note')).toHaveCount(0);
});

test('the picker offers Enhjørninger and no Havfruer; an old Havfruer party opens without a theme', async ({
  page,
}) => {
  await setup(page);
  await visible(page, 'see-plan').click();
  await visible(page, 'theme-card').click();
  await expect(page.getByRole('radio', { name: 'Enhjørninger' }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Havfru/ })).toHaveCount(0);
  await visible(page, 'theme-done').click();
  await page.waitForTimeout(600); // storage writes are debounced 300 ms

  // a party saved while Havfruer still existed
  await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (!k.startsWith('bursdagsklar:party:')) continue;
      const p = JSON.parse(localStorage.getItem(k)!);
      localStorage.setItem(k, JSON.stringify({ ...p, theme: 'havfruer' }));
    }
  });
  await page.reload();
  const hero = visible(page, 'plan-hero');
  await expect(hero).toContainText('Emmas 5-årsdag');
  expect(await bg(hero)).toBe(BRAND_PRIMARY);
  await expect(visible(page, 'theme-card')).toContainText('Velg tema (valgfritt)');
});
