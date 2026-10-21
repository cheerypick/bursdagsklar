import { expect, test, type Page } from '@playwright/test';

// Handleliste: from the Handleliste card on Planen. Generated from the party (the included Mat lines,
// drinks, fruit, party things, candy for the goodie bags); tap a row to tick it off, ticks survive a
// reload; «Legg til vare»; «Del listen» copies plain text when the browser has no share sheet; a line
// deselected on Mat is not on the list.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

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
    page.getByRole('heading', { name: 'Hvor mange barn blir det?' }).filter({ visible: true }),
  ).toBeVisible();
  await visible(page, 'next').click();
  await visible(page, 'place-hus').click();
  await visible(page, 'next').click();
  await expect(visible(page, 'screen-ready')).toContainText('Emmas fest er klar.');
  await visible(page, 'see-plan').click();
  await expect(visible(page, 'plan-hero')).toBeVisible();
}

async function pickPolser(page: Page) {
  if (!(await visible(page, 'plan-card-food').count())) {
    await page.waitForTimeout(600);
    await page.goto('/plan');
  }
  await visible(page, 'plan-card-food').click();
  await visible(page, 'menu-card-polser').click();
  await visible(page, 'menu-how-grillpolser').getByRole('button').click();
  await expect(visible(page, 'menu-chosen-title')).toHaveText('Grillpølser');
}

async function openList(page: Page) {
  // the app saves 300 ms after a change: let it land before leaving the page
  await page.waitForTimeout(600);
  await page.goto('/plan');
  const card = visible(page, 'plan-card-shopping');
  await expect(card).toContainText('Handleliste');
  await card.click();
  await expect(visible(page, 'screen-shopping')).toBeVisible();
}

const item = (page: Page, id: string) => visible(page, `shop-item-${id}`);

test('Handleliste: pick Pølser, tick 2 items, reload keeps them; goodie-bag suggestions; the Planen card counts', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);

  // before a menu: drinks, fruit and party things, and a nudge to pick a main dish
  await expect(visible(page, 'plan-card-shopping-count')).toHaveText(/^\d+ varer$/);
  await openList(page);
  await expect(visible(page, 'shopping-no-menu')).toBeVisible();
  await expect(item(page, 'saft')).toBeVisible();
  await expect(item(page, 'grillpolser')).toHaveCount(0);

  await pickPolser(page);
  await openList(page);
  await expect(visible(page, 'shopping-no-menu')).toHaveCount(0);
  // grouped by store section
  for (const g of ['kjott', 'brod', 'frukt', 'drikke', 'torrvarer', 'fest', 'godteposer'])
    await expect(visible(page, `shop-group-${g}`)).toBeVisible();
  await expect(visible(page, 'shop-group-kjott')).toContainText('Kjøtt og pålegg');
  // 12 children, 4 adults: 12 × 2 + 4 × 1,5 = 30, pluss 2 = 32 → 4 pk à 10
  await expect(visible(page, 'shop-qty-grillpolser')).toHaveText('4 pk');
  await expect(item(page, 'grillpolser')).toContainText('à 10, 50 stk i alt');
  await expect(visible(page, 'shop-qty-godteposer')).toHaveText('12 stk');
  // nothing inside the goodie bags is assumed
  await expect(visible(page, 'shop-group-godteposer').locator('[data-testid^="shop-item-pose-"]')).toHaveCount(0);
  await expect(visible(page, 'shopping-goodie-suggestions')).toContainText('Forslag til innhold');
  await expect(visible(page, 'shopping-healthier')).toHaveText(
    'Sunnere alternativer: rosiner, fruktstang og småleker.',
  );
  await expect(visible(page, 'shop-qty-kakelys')).toHaveText('1 sett');

  // tick two
  await item(page, 'grillpolser').click();
  await item(page, 'saft').click();
  await expect(item(page, 'grillpolser')).toHaveAttribute('aria-checked', 'true');
  await expect(item(page, 'saft')).toHaveAttribute('aria-checked', 'true');
  await expect(item(page, 'lomper')).toHaveAttribute('aria-checked', 'false');
  await expect(visible(page, 'shopping-progress')).toHaveText(/^2 av \d+ kjøpt$/);

  // tap Popcorn: one small bag per child goes on the list
  await expect(visible(page, 'goodie-popcorn')).toHaveAttribute('aria-pressed', 'false');
  await visible(page, 'goodie-popcorn').click();
  await expect(visible(page, 'goodie-popcorn')).toHaveAttribute('aria-pressed', 'true');
  await expect(visible(page, 'shop-qty-pose-popcorn')).toHaveText('12 stk');
  await expect(item(page, 'pose-popcorn')).toContainText('Popcorn, små poser');

  // the save is debounced: give it a moment before the reload
  await page.waitForTimeout(600);
  await page.reload();
  await expect(visible(page, 'screen-shopping')).toBeVisible();
  await expect(item(page, 'grillpolser')).toHaveAttribute('aria-checked', 'true');
  await expect(item(page, 'saft')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'goodie-popcorn')).toHaveAttribute('aria-pressed', 'true');
  await expect(item(page, 'pose-popcorn')).toBeVisible();
  await expect(item(page, 'pose-godteri')).toHaveCount(0);
  // a ticked row moves to the bottom of its group
  const kjottIds = await visible(page, 'shop-group-kjott')
    .locator('[data-testid^="shop-item-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(kjottIds.at(-1)).toBe('shop-item-grillpolser');

  // the Planen card counts them
  await visible(page, 'shopping-back').click();
  await expect(visible(page, 'plan-card-shopping-count')).toHaveText(/^\d+ varer · 2 kjøpt$/);

  // «Nullstill avkrysninger» (with a confirm)
  await openList(page);
  // a second tap on the chip takes Popcorn off the list again
  await visible(page, 'goodie-popcorn').click();
  await expect(item(page, 'pose-popcorn')).toHaveCount(0);
  await visible(page, 'shopping-clear').click();
  await page.getByRole('button', { name: 'Nullstill', exact: true }).filter({ visible: true }).click();
  await expect(item(page, 'grillpolser')).toHaveAttribute('aria-checked', 'false');
  await expect(visible(page, 'shopping-progress')).toHaveText(/^0 av \d+ kjøpt$/);
  expect(errors).toEqual([]);
});

test('Handleliste: «Legg til vare» adds my own item, it survives a reload and can be deleted', async ({ page }) => {
  await createParty(page);
  await pickPolser(page);
  await openList(page);
  await visible(page, 'shopping-add-input').fill('Sugerør');
  await visible(page, 'shopping-add').click();
  await expect(visible(page, 'shop-group-egne')).toContainText('Egne varer');
  await expect(item(page, 'egen-1')).toContainText('Sugerør');
  await expect(visible(page, 'shopping-add-input')).toHaveValue('');
  // Enter adds too
  await visible(page, 'shopping-add-input').fill('Servietter med enhjørning');
  await visible(page, 'shopping-add-input').press('Enter');
  await expect(item(page, 'egen-2')).toContainText('Servietter med enhjørning');
  await item(page, 'egen-1').click();
  await page.waitForTimeout(600);
  await page.reload();
  await expect(item(page, 'egen-1')).toHaveAttribute('aria-checked', 'true');
  await expect(item(page, 'egen-2')).toBeVisible();
  await visible(page, 'shop-delete-egen-1').click();
  await expect(item(page, 'egen-1')).toHaveCount(0);
  await expect(item(page, 'egen-2')).toBeVisible();
});

test('Handleliste: «Del listen» without a share sheet copies plain text and says «Kopiert»', async ({ page }) => {
  // no Web Share API (like desktop Chrome on Linux): the list is copied instead
  await page.addInitScript(() => {
    const w = window as unknown as { __copied: string | null };
    w.__copied = null;
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (t: string) => {
          w.__copied = t;
        },
      },
    });
  });
  await createParty(page);
  await pickPolser(page);
  await openList(page);
  await item(page, 'saft').click();
  await visible(page, 'shopping-add-input').fill('Sugerør');
  await visible(page, 'shopping-add').click();
  await visible(page, 'shopping-share').click();
  await expect(page.getByText('Kopiert', { exact: true })).toBeVisible();
  const text = await page.evaluate(() => (window as unknown as { __copied: string | null }).__copied);
  expect(text).toMatch(/^Handleliste – Emmas bursdag 15\. [a-z]{3}\n\n/);
  expect(text).toContain('Kjøtt og pålegg\n☐ 4 pk grillpølser');
  expect(text).toContain('grillpølser');
  expect(text).toContain('☐ Sugerør');
  // ticked items are not shared
  expect(text).not.toContain('saft');
});

test('Handleliste: a line deselected on Mat is not on the list', async ({ page }) => {
  await createParty(page);
  await pickPolser(page);
  await openList(page);
  await expect(item(page, 'polsebrod')).toBeVisible();
  await page.goto('/mat');
  const bun = visible(page, 'food-line-polsebrod');
  await bun.click();
  await expect(bun).toHaveAttribute('aria-checked', 'false');
  await page.waitForTimeout(600);
  await openList(page);
  await expect(item(page, 'polsebrod')).toHaveCount(0);
  await expect(item(page, 'lomper')).toBeVisible();
  // the «Handle tørrvarer» to-do links here too
  await page.goto('/gjoremal');
  await page.getByRole('link', { name: 'Handleliste: Handle tørrvarer' }).filter({ visible: true }).click();
  await expect(visible(page, 'screen-shopping')).toBeVisible();
});
