import { expect, test, type Page } from '@playwright/test';

// Mat: from the Mat card on Planen → pick a main dish (nothing pre-picked) → amounts with a reason
// per line → «Endre» changes the party's own guest numbers → tap a line to leave it out → a reload
// keeps it → «Start på nytt» clears it.
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

test('Mat: choose Pølser, see the amounts, change the guests (the party), reload keeps it, reset clears it', async ({
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
  await expect(visible(page, 'food-for-whom')).toHaveText('For 11 barn og 4 voksne');
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
  // every quantity line is a checkbox, and all start included
  for (const id of ['grillpolser', 'lomper', 'polsebrod', 'ketchup', 'saft', 'vann', 'frukt'])
    await expect(visible(page, `food-line-${id}`)).toHaveAttribute('aria-checked', 'true');
  // no candy in the food: it goes in the goodie bags later
  await expect(visible(page, 'food-line-godteri')).toHaveCount(0);
  await expect(visible(page, 'food-amounts')).not.toContainText('Godteri');
  // one guest count: the old food-only steppers and «Bruk tallene fra festen» are gone
  await expect(page.getByTestId('food-kids')).toHaveCount(0);
  await expect(page.getByText('Bruk tallene fra festen')).toHaveCount(0);

  // «Endre» edits the party: 10 → 14 invited = 15 children, and one more expected parent (15 % of 14 → 3)
  await visible(page, 'food-guests-edit').click();
  await expect(visible(page, 'food-guests-editor')).toBeVisible();
  await expect(visible(page, 'guest-kids-value')).toHaveText('10');
  await expect(visible(page, 'guest-kids-total')).toHaveText('Med Emma blir det 11 barn.');
  for (let i = 0; i < 4; i++) await visible(page, 'guest-kids-more').click();
  await expect(visible(page, 'guest-kids-value')).toHaveText('14');
  await expect(visible(page, 'guest-kids-total')).toHaveText('Med Emma blir det 15 barn.');
  await expect(visible(page, 'guest-adults-value')).toHaveText('5');
  await expect(visible(page, 'food-for-whom')).toHaveText('For 15 barn og 5 voksne');
  // (15 × 2 + 5 × 2) × 1,35 = 54 → 6 pk = 60
  await expect(visible(page, 'food-amount-grillpolser')).toHaveText('60 stk');
  await visible(page, 'food-guests-done').click();
  await expect(visible(page, 'food-guests-editor')).toHaveCount(0);

  // a dietary chip adds a note line with an extra portion
  await visible(page, 'diet-ingen-svin').getByRole('button').click();
  await expect(visible(page, 'food-line-diet-ingen-svin')).toContainText('1 pk kyllingpølser');
  await expect(visible(page, 'diet-note')).toBeVisible();

  // a reload keeps it all
  await page.waitForTimeout(600); // storage writes are debounced 300 ms
  await page.reload();
  await expect(visible(page, 'menu-chosen-title')).toHaveText('Grillpølser');
  await expect(visible(page, 'food-for-whom')).toHaveText('For 15 barn og 5 voksne');
  await expect(visible(page, 'food-amount-grillpolser')).toHaveText('60 stk');
  await expect(visible(page, 'food-line-diet-ingen-svin')).toBeVisible();

  // Planen shows the menu on the Mat card, and the party's own numbers changed with it
  await visible(page, 'mat-back-to-plan').click();
  await expect(visible(page, 'plan-hero')).toContainText('14 barn');
  const card = visible(page, 'plan-card-food');
  await expect(card).toContainText('Mat: Grillpølser');
  await expect(card).toContainText('60 grillpølser med lomper og pølsebrød');
  await expect(card).toContainText('for 15 barn og 5 voksne');
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

test('Mat: deselect pølsebrød → greyed and struck through, kept after a reload, left out of the Planen card', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);
  await visible(page, 'plan-card-food').click();
  await visible(page, 'menu-card-polser').click();
  await visible(page, 'menu-how-grillpolser').getByRole('button').click();

  const brod = visible(page, 'food-line-polsebrod');
  await expect(brod).toHaveAttribute('role', 'checkbox');
  await expect(brod).toHaveAttribute('aria-checked', 'true');
  await brod.click();
  await expect(brod).toHaveAttribute('aria-checked', 'false');
  // still there, with its amount, but struck through and greyed
  await expect(visible(page, 'food-amount-polsebrod')).toHaveText('24 stk');
  await expect(visible(page, 'food-why-polsebrod')).toHaveText('Ikke med på handlelista');
  const deco = await visible(page, 'food-amount-polsebrod').evaluate(
    (el) => getComputedStyle(el).textDecorationLine || getComputedStyle(el).textDecoration,
  );
  expect(deco).toContain('line-through');
  // the rest stay in
  await expect(visible(page, 'food-line-lomper')).toHaveAttribute('aria-checked', 'true');

  await page.waitForTimeout(600); // storage writes are debounced 300 ms
  await page.reload();
  await expect(visible(page, 'food-line-polsebrod')).toHaveAttribute('aria-checked', 'false');
  await expect(visible(page, 'food-line-lomper')).toHaveAttribute('aria-checked', 'true');

  await visible(page, 'mat-back-to-plan').click();
  const card = visible(page, 'plan-card-food');
  await expect(card).toContainText('50 grillpølser med lomper · 2 flasker saft');
  await expect(card).not.toContainText('pølsebrød');

  // and back in again
  await card.click();
  await visible(page, 'food-line-polsebrod').click();
  await expect(visible(page, 'food-line-polsebrod')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'food-why-polsebrod')).not.toHaveText('Ikke med på handlelista');
  await page.waitForTimeout(600);
  await visible(page, 'mat-back-to-plan').click();
  await expect(visible(page, 'plan-card-food')).toContainText('50 grillpølser med lomper og pølsebrød');
  expect(errors).toEqual([]);
});

test('Mat: changing the children from the Mat screen changes the party, and Planen shows it', async ({ page }) => {
  await createParty(page);
  await expect(visible(page, 'plan-hero')).toContainText('10 barn');
  await visible(page, 'plan-card-food').click();
  await visible(page, 'menu-card-taco').click();
  await expect(visible(page, 'food-for-whom')).toHaveText('For 11 barn og 4 voksne');
  await visible(page, 'food-guests-edit').click();
  for (let i = 0; i < 3; i++) await visible(page, 'guest-kids-more').click();
  await visible(page, 'guest-kids-less').click();
  await expect(visible(page, 'guest-kids-value')).toHaveText('12');
  await expect(visible(page, 'food-for-whom')).toHaveText('For 13 barn og 4 voksne');
  await visible(page, 'food-guests-done').click();
  await page.waitForTimeout(600);
  await visible(page, 'mat-back-to-plan').click();
  await expect(visible(page, 'plan-hero')).toContainText('12 barn');
  await expect(visible(page, 'plan-card-food')).toContainText('for 13 barn og 4 voksne');
  await page.reload();
  await expect(visible(page, 'plan-hero')).toContainText('12 barn');
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
