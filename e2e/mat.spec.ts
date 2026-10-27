import { expect, test, type Page } from '@playwright/test';

// Mat: from the Mat card on Planen → pick a main dish (nothing pre-picked) → amounts with a reason
// per line → «Endre» changes the party's own guest numbers → tap a line to leave it out → a reload
// keeps it → «Start på nytt» clears it.
// The default party is 12 children (Emma included: one children number) and 4 adults.
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
    page.getByRole('heading', { name: 'Hvor mange barn blir det?' }).filter({ visible: true }),
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
  for (const id of ['polser', 'pizza', 'annet'])
    await expect(visible(page, `menu-card-${id}`)).not.toHaveAttribute('aria-checked', 'true');
  // taco and pasta are hidden for now
  for (const id of ['taco', 'pasta']) await expect(page.getByTestId(`menu-card-${id}`)).toHaveCount(0);
  await expect(visible(page, 'food-amounts')).toHaveCount(0);

  // Pølser needs one more tap: grill or kjele
  await visible(page, 'menu-card-polser').click();
  await expect(visible(page, 'menu-polser')).toContainText('Grill eller kjele?');
  await expect(visible(page, 'food-amounts')).toHaveCount(0);
  await visible(page, 'menu-how-grillpolser').getByRole('button').click();

  await expect(visible(page, 'menu-chosen-title')).toHaveText('Grillpølser');
  await expect(visible(page, 'food-for-whom')).toHaveText('For 12 barn og 4 voksne');
  // 12 × 3 + 4 × 2 = 44 → 5 pk Gilde Grillpølser à 10 = 50
  await expect(visible(page, 'food-amount-grillpolser')).toHaveText('50 stk');
  await expect(visible(page, 'food-line-grillpolser')).toContainText('5 pk à 10');
  await expect(visible(page, 'food-why-grillpolser')).toHaveText(
    '12 barn × 3 + 4 voksne × 2 = 44. 5 pk Gilde Grillpølser à 10 = 50, eller 1 storpakning (3 × 10) og 2 pk',
  );
  // lomper and pølsebrød: ca. 60 % each (30), so there is some bread to spare
  await expect(visible(page, 'food-amount-lomper')).toHaveText('30 stk');
  await expect(visible(page, 'food-amount-polsebrod')).toHaveText('32 stk');
  await expect(visible(page, 'food-why-polsebrod')).toHaveText('Ca. 30 av hver – noen vil ha lompe, noen brød');
  await expect(visible(page, 'food-amount-ketchup')).toHaveText('1 av hver');
  await expect(visible(page, 'food-amount-lok')).toHaveText('2 poser');
  await expect(visible(page, 'food-amount-saft')).toHaveText('2 flasker saft');
  // «jus», not «juice»; and no «påbegynte»
  await expect(visible(page, 'food-line-saft')).toContainText('Saft eller jus');
  await expect(visible(page, 'food-amounts')).not.toContainText(/juice|påbegynt/i);
  // icons are hidden from screen readers with aria-hidden on the web, not native-only props
  expect(await page.locator('svg[importantforaccessibility], svg[importantForAccessibility]').count()).toBe(0);
  expect(await page.locator('svg[aria-hidden="true"]').count()).toBeGreaterThan(0);
  await expect(visible(page, 'food-line-vann')).toBeVisible();
  await expect(visible(page, 'food-line-frukt')).toBeVisible();
  await expect(visible(page, 'food-section-kake')).toContainText('Kaken velger du under Kake');
  // every quantity line is a checkbox, and all start included
  for (const id of ['grillpolser', 'lomper', 'polsebrod', 'ketchup', 'lok', 'saft', 'vann', 'frukt'])
    await expect(visible(page, `food-line-${id}`)).toHaveAttribute('aria-checked', 'true');
  // no candy in the food: it goes in the goodie bags later
  await expect(visible(page, 'food-line-godteri')).toHaveCount(0);
  await expect(visible(page, 'food-amounts')).not.toContainText('Godteri');
  // one guest count: the old food-only steppers and «Bruk tallene fra festen» are gone
  await expect(page.getByTestId('food-kids')).toHaveCount(0);
  await expect(page.getByText('Bruk tallene fra festen')).toHaveCount(0);

  // «Endre» edits the party's one children number: 12 → 16, and one more expected parent
  // (15 % of the 15 guests' families → 3)
  await visible(page, 'food-guests-edit').click();
  await expect(visible(page, 'food-guests-editor')).toBeVisible();
  await expect(visible(page, 'guest-kids-value')).toHaveText('12');
  await expect(visible(page, 'guest-kids-with')).toHaveText('Med Emma');
  await expect(visible(page, 'food-guests-editor')).not.toContainText('nvitert');
  await expect(visible(page, 'food-guests-editor')).not.toContainText('blir det');
  for (let i = 0; i < 4; i++) await visible(page, 'guest-kids-more').click();
  await expect(visible(page, 'guest-kids-value')).toHaveText('16');
  await expect(visible(page, 'guest-adults-value')).toHaveText('5');
  await expect(visible(page, 'food-for-whom')).toHaveText('For 16 barn og 5 voksne');
  // 16 × 3 + 5 × 2 = 58 → 6 pk = 60
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
  await expect(visible(page, 'food-for-whom')).toHaveText('For 16 barn og 5 voksne');
  await expect(visible(page, 'food-amount-grillpolser')).toHaveText('60 stk');
  await expect(visible(page, 'food-line-diet-ingen-svin')).toBeVisible();

  // Planen shows the menu on the Mat card, and the party's own numbers changed with it
  await visible(page, 'mat-back-to-plan').click();
  await expect(visible(page, 'plan-meta')).toContainText('16 barn');
  const card = visible(page, 'plan-card-food');
  await expect(card).toContainText('Mat: Grillpølser');
  await expect(card).toContainText('60 grillpølser med lomper og pølsebrød');
  await expect(card).toContainText('for 16 barn og 5 voksne');
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
  await expect(visible(page, 'food-amount-polsebrod')).toHaveText('32 stk');
  await expect(visible(page, 'food-why-polsebrod')).toHaveText('Ikke med på handlelista');
  const deco = await visible(page, 'food-amount-polsebrod').evaluate(
    (el) => getComputedStyle(el).textDecorationLine || getComputedStyle(el).textDecoration,
  );
  expect(deco).toContain('line-through');
  // the rest stay in, and the lomper now cover every sausage
  await expect(visible(page, 'food-line-lomper')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'food-amount-lomper')).toHaveText('50 stk');
  await expect(visible(page, 'food-why-lomper')).toHaveText('Uten pølsebrød: én lompe per pølse');

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
  await expect(visible(page, 'food-amount-lomper')).toHaveText('30 stk');
  await page.waitForTimeout(600);
  await visible(page, 'mat-back-to-plan').click();
  await expect(visible(page, 'plan-card-food')).toContainText('50 grillpølser med lomper og pølsebrød');
  expect(errors).toEqual([]);
});

test('One children number: 12 in setup is 12 on Planen, Mat and Festen er klar; 14 in Endre is 14 everywhere', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
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
  // setup asks for everyone, Emma included
  await expect(
    page.getByRole('heading', { name: 'Hvor mange barn blir det?' }).filter({ visible: true }),
  ).toBeVisible();
  await expect(visible(page, 'step-kids')).toContainText('Med Emma');
  await expect(visible(page, 'step-kids')).not.toContainText('Uten Emma');
  // set 12 by hand (down one, up one, so the stepper is really used)
  await visible(page, 'kids-count-less').click();
  await expect(visible(page, 'kids-count-value')).toHaveText('11');
  await visible(page, 'kids-count-more').click();
  await expect(visible(page, 'kids-count-value')).toHaveText('12');
  await visible(page, 'next').click();
  await visible(page, 'place-hus').click();
  await visible(page, 'next').click();

  // Festen er klar: 12
  const ready = visible(page, 'screen-ready');
  await expect(ready).toContainText('Mat for 12 barn og 4 voksne');
  await visible(page, 'see-plan').click();

  // Planen: 12
  await expect(visible(page, 'plan-meta')).toContainText('· 12 barn');
  // Mat: 12
  await visible(page, 'plan-card-food').click();
  await visible(page, 'menu-card-pizza').click();
  await expect(visible(page, 'food-for-whom')).toHaveText('For 12 barn og 4 voksne');

  // Endre: the same 12, to 14
  await visible(page, 'food-guests-edit').click();
  await expect(visible(page, 'guest-kids-value')).toHaveText('12');
  await expect(visible(page, 'guest-kids-with')).toHaveText('Med Emma');
  await visible(page, 'guest-kids-more').click();
  await visible(page, 'guest-kids-more').click();
  await expect(visible(page, 'guest-kids-value')).toHaveText('14');
  await expect(visible(page, 'food-for-whom')).toHaveText('For 14 barn og 4 voksne');
  await visible(page, 'food-guests-done').click();
  await page.waitForTimeout(600); // storage writes are debounced 300 ms

  // everything says 14
  await visible(page, 'mat-back-to-plan').click();
  await expect(visible(page, 'plan-meta')).toContainText('· 14 barn');
  await expect(visible(page, 'plan-card-food')).toContainText('for 14 barn og 4 voksne');
  await page.goto('/klar');
  await expect(visible(page, 'screen-ready')).toContainText('Hjemmelaget pizza for 14 barn og 4 voksne');
  await page.goto('/gjoremal');
  await expect(visible(page, 'screen-todo')).toContainText('14 barn');
  await expect(visible(page, 'screen-todo')).toContainText('Og fyll 14 godteposer');
  await page.reload();
  await expect(visible(page, 'screen-todo')).toContainText('14 barn');
  for (const n of ['11', '13', '15']) await expect(visible(page, 'screen-todo')).not.toContainText(`${n} barn`);
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

  // unpick «Noe annet», pick Pizza (homemade by default), then switch to frozen
  await visible(page, 'menu-card-annet').click();
  await expect(visible(page, 'food-amounts')).toHaveCount(0);
  await visible(page, 'menu-card-pizza').click();
  await expect(visible(page, 'menu-chosen-title')).toHaveText('Hjemmelaget pizza');
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
      // schema 2 counted the invited children without Emma: 12 + Emma = 13 children now
      kidsInvited: 12,
      siblingsAttending: 0,
      hostAdults: 2,
      menu: { kind: 'wienerpolser' },
      menuChosen: false,
      cake: { mode: 'bake', cakeId: 'vaniljekake-langpanne', muffins: false },
      programme: { activities: [] },
      guests: [],
      haveAtHome: [],
      taskState: {},
    };
    localStorage.setItem(`bursdagsklar:party:${id}`, JSON.stringify(party));
    localStorage.setItem('bursdagsklar:index', JSON.stringify({ schemaVersion: 2, activeId: id, ids: [id] }));
  });
  await page.goto('/plan');
  await expect(visible(page, 'plan-hero')).toContainText('Emmas 5-årsdag');
  await expect(visible(page, 'plan-meta')).toContainText('· 13 barn');
  await expect(visible(page, 'plan-card-food')).toContainText('Velg meny');
  await visible(page, 'plan-card-food').click();
  await expect(visible(page, 'menu-card-polser')).not.toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'food-amounts')).toHaveCount(0);
});
