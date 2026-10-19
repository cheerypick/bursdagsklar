import { expect, test, type Locator, type Page } from '@playwright/test';

// The chosen theme paints the whole app. Frost's primary is #1F5A8A = rgb(31, 90, 138);
// the brand primary before a theme is chosen is #1F3D36 = rgb(31, 61, 54).
const FROST_PRIMARY = 'rgb(31, 90, 138)';
const BRAND_PRIMARY = 'rgb(31, 61, 54)';

const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
const bg = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);

async function setupWithTheme(page: Page, themeName: string) {
  await page.goto('/');
  const start = visible(page, 'start');
  await expect(start).toBeVisible();
  // brand look before a theme is chosen
  expect(await bg(start)).toBe(BRAND_PRIMARY);
  await start.click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, 'next').click();
  await visible(page, 'age-5').click();
  await visible(page, 'next').click();
  await visible(page, 'saturday-chips').getByRole('button').first().click();
  await visible(page, 'next').click();
  await expect(
    page.getByRole('heading', { name: 'Hvor mange barn inviterer dere?' }).filter({ visible: true }),
  ).toBeVisible();
  await visible(page, 'next').click();
  // the picker names licensed themes, so the not-affiliated line is there
  await expect(visible(page, 'license-note')).toContainText('ikke tilknyttet Disney, Spin Master');
  await page.getByRole('radio', { name: themeName }).filter({ visible: true }).click();
  await visible(page, 'next').click();
}

test('Frost paints Festen er klar and Planen in its own colours and words', async ({ page }) => {
  await setupWithTheme(page, 'Frost');

  const ready = visible(page, 'screen-ready');
  await expect(ready).toContainText('Emmas fest er klar.');
  expect(await bg(ready)).toBe(FROST_PRIMARY);
  await expect(visible(page, 'invitation-headline')).toHaveText('Bli med på Frost-fest med snø og glitter!');
  await expect(ready).toContainText('Lyseblå og hvit kake med snøkrystaller');
  await expect(visible(page, 'license-note')).toBeVisible();

  await visible(page, 'see-plan').click();
  const hero = visible(page, 'plan-hero');
  await expect(hero).toContainText('Emmas 5-årsdag');
  expect(await bg(hero)).toBe(FROST_PRIMARY);
  await expect(visible(page, 'plan-greeting')).toHaveText('Det blir en iskald fest!');
  expect(await bg(visible(page, 'next-task-cta'))).toBe(FROST_PRIMARY);
  await expect(visible(page, 'screen-plan')).toContainText('Lyseblå og hvit kake');
  await expect(visible(page, 'license-note')).toBeVisible();

  // the theme survives a reload
  await page.reload();
  expect(await bg(visible(page, 'plan-hero'))).toBe(FROST_PRIMARY);
});

test('a non-licensed theme shows no not-affiliated line on Planen', async ({ page }) => {
  await setupWithTheme(page, 'Dinosaurer');
  await visible(page, 'see-plan').click();
  await expect(visible(page, 'plan-greeting')).toHaveText('Klar for en brølende god fest?');
  await expect(visible(page, 'license-note')).toHaveCount(0);
});
