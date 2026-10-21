import { expect, test, type Locator, type Page } from '@playwright/test';

// «Start på nytt»: on Planen and Festen er klar, behind our own confirm dialog (never window.confirm).
// Confirming deletes everything the app stored, repaints in the neutral look and opens the start screen;
// a reload stays empty.
const BRAND_PRIMARY = 'rgb(31, 61, 54)';
const FROST_PRIMARY = 'rgb(31, 90, 138)';

const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
const bg = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
const appKeys = (page: Page) =>
  page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.startsWith('bursdagsklar')));

async function createParty(page: Page) {
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, 'age-5').click();
  await visible(page, 'next').click();
  await visible(page, 'calendar-next').click();
  await visible(page, 'calendar-grid')
    .getByRole('button', { name: /^(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag) 15\. / })
    .click();
  await visible(page, 'next').click();
  await expect(
    page.getByRole('heading', { name: 'Hvor mange barn inviterer dere?' }).filter({ visible: true }),
  ).toBeVisible();
  await visible(page, 'next').click();
  await visible(page, 'place-hus').click();
  await visible(page, 'next').click();
  await expect(visible(page, 'screen-ready')).toContainText('Emmas fest er klar.');
}

test('Planen: «Start på nytt» → our dialog → start screen, theme neutral, and a reload is still empty', async ({
  page,
}) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await createParty(page);
  await visible(page, 'see-plan').click();
  // choose Frost, so the reset has a theme to undo
  await visible(page, 'theme-card').click();
  await page.getByRole('radio', { name: 'Frost' }).filter({ visible: true }).click();
  await visible(page, 'theme-done').click();
  await page.waitForTimeout(600); // storage writes are debounced 300 ms
  expect(await bg(visible(page, 'plan-hero'))).toBe(FROST_PRIMARY);
  expect(await appKeys(page)).not.toEqual([]);

  // Avbryt keeps everything
  const action = visible(page, 'start-over');
  await expect(action).toHaveAccessibleName('Start på nytt');
  await action.click();
  const dialog = visible(page, 'confirm-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Vil du starte på nytt?');
  await expect(dialog).toContainText('Planen for Emma slettes.');
  await expect(visible(page, 'confirm-dialog-confirm')).toHaveText('Slett og start på nytt');
  await visible(page, 'confirm-dialog-cancel').click();
  await expect(visible(page, 'confirm-dialog')).toHaveCount(0);
  await expect(visible(page, 'plan-hero')).toContainText('Emmas 5-årsdag');

  // confirm deletes it all
  await visible(page, 'start-over').click();
  await visible(page, 'confirm-dialog-confirm').click();
  const start = visible(page, 'start');
  await expect(start).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  // On desktop the pointer still rests where «Slett og start på nytt» was, which is now over the start
  // button, so WebKit painted its hover colour (brand green2, rgb(44, 83, 72)) and the test flaked.
  // Move the pointer away, then wait for the resting colour.
  await page.mouse.move(1, 1);
  await expect.poll(() => bg(start)).toBe(BRAND_PRIMARY);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('brand');
  await page.waitForTimeout(600); // a pending debounced save must not bring the party back
  expect(await appKeys(page)).toEqual([]);

  await page.reload();
  await expect(visible(page, 'start')).toBeVisible();
  await expect(page.getByText('Hele bursdagen, klar.').filter({ visible: true })).toBeVisible();
  expect(await appKeys(page)).toEqual([]);
  // /plan has nothing to show and goes back to the start screen
  await page.goto('/plan');
  await expect(visible(page, 'start')).toBeVisible();
  // and a new setup starts empty
  await visible(page, 'start').click();
  await expect(visible(page, 'name-input')).toHaveValue('');
  expect(dialogs).toEqual([]); // never window.confirm
});

test('Festen er klar: a quiet «Start på nytt»; Escape cancels', async ({ page }) => {
  await createParty(page);
  const ready = visible(page, 'screen-ready');
  const action = ready.getByTestId('start-over').filter({ visible: true });
  await expect(action).toBeVisible();
  // secondary: much smaller than the hero button to the plan
  const hero = (await visible(page, 'see-plan').boundingBox())!;
  const quiet = (await action.boundingBox())!;
  expect(quiet.height).toBeLessThan(hero.height);
  await action.click();
  await expect(visible(page, 'confirm-dialog')).toContainText('Planen for Emma slettes.');
  // Escape cancels on the web
  await page.keyboard.press('Escape');
  await expect(visible(page, 'confirm-dialog')).toHaveCount(0);
  await action.click();
  await visible(page, 'confirm-dialog-confirm').click();
  await expect(visible(page, 'start')).toBeVisible();
  expect(await appKeys(page)).toEqual([]);
});
