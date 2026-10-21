import { expect, test, type Page } from '@playwright/test';

// Mat: from the Mat card on Planen → pick a main dish (nothing pre-picked) → amounts with a reason
// per line → adjust the child count → a reload keeps it → «Start på nytt» clears it.
// The default party is 10 invited + Emma = 11 children and 4 adults.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
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
  await visible(page, 'see-plan').click();
  await expect(visible(page, 'plan-hero')).toBeVisible();
}

test('Mat: choose Pølser, see the amounts, change the child count, reload keeps it, reset clears it', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);

  // the Mat card is live, and asks for a menu
  const foodCard = visible(page, 'plan-card-food');
  await expect(foodCard).toContainText('Velg meny');
  await foodCard.click();
  await expect(visible(page, 'screen-mat')).toBeVisible();
  await expect(page.getByText('Kommer snart')).toHaveCount(0);

  // nothing is pre-picked
  for (const id of ['polser', 'pizza', 'taco', 'pasta', 'annet'])
    await expect(visible(page, `menu-card-${id}`)).not.toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'food-amounts')).toHaveCount(0);

  // Pølser needs one more tap: grill or kjele
  await visible(page, 'menu-card-polser').click();
  await expect(visible(page, 'menu-how')).toContainText('Grill eller kjele?');
  await expect(visible(page, 'food-amounts')).toHaveCount(0);
  await visible(page, 'menu-how-grillpolser').getByRole('button').click();

  await expect(visible(page, 'menu-chosen-title')).toHaveText('Grillpølser');
  await expect(visible(page, 'food-for-whom')).toHaveText('Grillpølser for 11 barn og 4 voksne');
  // (11 × 2 + 4 × 2) × 1,35 = 40,5 → 41 → 5 pk à 10
  await expect(visible(page, 'food-amount-grillpolser')).toHaveText('50 stk');
  await expect(visible(page, 'food-line-grillpolser')).toContainText('5 pk à 10');
  await expect(visible(page, 'food-why-grillpolser')).toHaveText(
    'ca. 2 per barn og 2 per voksen + 35 % ekstra = 41, rundet opp til hele pakker',
  );
  await expect(visible(page, 'food-amount-lomper')).toHaveText('50 stk');
  await expect(visible(page, 'food-amount-saft')).toHaveText('2 flasker saft');
  await expect(visible(page, 'food-line-vann')).toBeVisible();
  await expect(visible(page, 'food-line-frukt')).toBeVisible();
  await expect(visible(page, 'food-section-kake')).toContainText('Kake senere');

  // more children → more sausages: (15 × 2 + 8) × 1,35 = 51,3 → 52 → 6 pk = 60
  await expect(visible(page, 'food-kids-value')).toHaveText('11');
  for (let i = 0; i < 4; i++) await visible(page, 'food-kids-more').click();
  await expect(visible(page, 'food-kids-value')).toHaveText('15');
  await expect(visible(page, 'food-amount-grillpolser')).toHaveText('60 stk');
  await expect(visible(page, 'food-counts')).toContainText('Fra festen: 11 barn og 4 voksne.');

  // a dietary chip adds a note line with an extra portion
  await visible(page, 'diet-ingen-svin').getByRole('button').click();
  await expect(visible(page, 'food-line-diet-ingen-svin')).toContainText('1 pk kyllingpølser');
  await expect(visible(page, 'diet-note')).toBeVisible();

  // a reload keeps it all
  await page.waitForTimeout(600); // storage writes are debounced 300 ms
  await page.reload();
  await expect(visible(page, 'menu-chosen-title')).toHaveText('Grillpølser');
  await expect(visible(page, 'food-kids-value')).toHaveText('15');
  await expect(visible(page, 'food-amount-grillpolser')).toHaveText('60 stk');
  await expect(visible(page, 'food-line-diet-ingen-svin')).toBeVisible();

  // Planen shows the menu on the Mat card
  await visible(page, 'mat-back-to-plan').click();
  const card = visible(page, 'plan-card-food');
  await expect(card).toContainText('Mat: Grillpølser');
  await expect(card).toContainText('60 grillpølser · 2 flasker saft · for 15 barn og 4 voksne');
  await expect(card).not.toContainText('Velg meny');

  // «Start på nytt» clears the menu with everything else
  await visible(page, 'start-over').click();
  await visible(page, 'confirm-dialog-confirm').click();
  await expect(visible(page, 'start')).toBeVisible();
  await page.waitForTimeout(600);
  expect(await appKeys(page)).toEqual([]);
  await createParty(page);
  await expect(visible(page, 'plan-card-food')).toContainText('Velg meny');
  await visible(page, 'plan-card-food').click();
  await expect(visible(page, 'menu-card-polser')).not.toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'food-amounts')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Mat: «Noe annet» calculates only drinks, snacks and cake; switching dish works', async ({ page }) => {
  await createParty(page);
  await visible(page, 'plan-card-food').click();
  await visible(page, 'menu-card-annet').click();
  await visible(page, 'menu-annet-input').fill('Kyllingsuppe');
  await expect(visible(page, 'menu-chosen-title')).toHaveText('Kyllingsuppe');
  await expect(visible(page, 'food-amount-egen')).toHaveText('Din egen');
  await expect(visible(page, 'food-amount-saft')).toHaveText('2 flasker saft');
  await expect(visible(page, 'food-line-grillpolser')).toHaveCount(0);

  await visible(page, 'menu-change').click();
  await visible(page, 'menu-card-pizza').click();
  await expect(visible(page, 'food-amounts')).toHaveCount(0); // which pizza? not assumed
  await visible(page, 'menu-how-frossen').getByRole('button').click();
  await expect(visible(page, 'menu-chosen-title')).toHaveText('Frossenpizza');
  await expect(visible(page, 'food-line-frossenpizza')).toBeVisible();
  await expect(visible(page, 'food-line-ovnstid')).toBeVisible();
});

test('Mat: a party saved before the Mat screen (schema 2) opens with no menu chosen', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const id = '7d0c3f5e-1c1a-4f6b-9a51-6a3c2b1e0e01';
    const party = {
      id,
      schemaVersion: 2,
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-19T08:00:00.000Z',
      plannedFrom: '2026-10-19',
      celebrants: [{ id: 'c1', name: 'Emma', age: 5 }],
      date: '2027-01-14',
      start: '16:30',
      end: '18:30',
      theme: null,
      home: { type: 'hus', garden: null },
      kidsInvited: 12,
      siblingsAttending: 0,
      hostAdults: 2,
      menu: { kind: 'wienerpolser' },
      menuChosen: false,
      cake: { mode: 'bake', cakeId: 'vaniljekake-langpanne', muffins: false },
      programme: { includePinata: false, includeSkattejakt: false },
      guests: [],
      haveAtHome: [],
      taskState: {},
    };
    localStorage.setItem(`bursdagsklar:party:${id}`, JSON.stringify(party));
    localStorage.setItem('bursdagsklar:index', JSON.stringify({ schemaVersion: 2, activeId: id, ids: [id] }));
  });
  await page.goto('/plan');
  await expect(visible(page, 'plan-hero')).toContainText('Emmas 5-årsdag');
  await expect(visible(page, 'plan-card-food')).toContainText('Velg meny');
  await visible(page, 'plan-card-food').click();
  await expect(visible(page, 'menu-card-polser')).not.toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'food-amounts')).toHaveCount(0);
});
