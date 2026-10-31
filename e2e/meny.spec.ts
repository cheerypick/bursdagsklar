import { expect, test, type Page } from '@playwright/test';

// Meny (PR #5): the Mat cards are Pølser, Pizza and Noe annet (taco and pasta hidden for now); Pizza is
// homemade with ready-made dough by default, with topping chips; Pølser and Pizza exclude each other
// (MVP), Noe annet goes with either. The default party is 12 children (Emma included) and 4 adults.
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

test('Meny: Pizza → ready-made dough by default, and a topping chip adds its line', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);
  await visible(page, 'plan-card-food').click();
  // only Pølser, Pizza and Noe annet
  for (const id of ['polser', 'pizza', 'annet']) await expect(visible(page, `menu-card-${id}`)).toBeVisible();
  for (const id of ['taco', 'pasta']) await expect(page.getByTestId(`menu-card-${id}`)).toHaveCount(0);

  await visible(page, 'menu-card-pizza').click();
  await expect(visible(page, 'menu-card-pizza')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'menu-chosen-title')).toHaveText('Hjemmelaget pizza');
  // the default base: ferdig pizzadeig
  await expect(visible(page, 'pizza-dough')).toContainText('Ferdig pizzadeig');
  await expect(visible(page, 'food-line-pizzadeig')).toContainText('Ferdig pizzadeig');
  await expect(visible(page, 'food-line-hvetemel')).toHaveCount(0);
  // 12 × 2 + 4 × 3 = 36 biter → 3 langpanner
  await expect(visible(page, 'food-amount-langpanner')).toHaveText('3 langpanner');
  await expect(visible(page, 'food-why-langpanner')).toHaveText(
    '12 barn × 2 + 4 voksne × 3 = 36 biter. 12 biter per langpanne',
  );
  await expect(visible(page, 'food-amount-pizzadeig')).toHaveText('3 pk');
  await expect(visible(page, 'food-line-pizzasaus')).toBeVisible();
  await expect(visible(page, 'food-line-pizzaost')).toBeVisible();
  // skinke is on by default, pepperoni is not
  await expect(visible(page, 'food-line-pizzaskinke')).toBeVisible();
  await expect(visible(page, 'food-line-pepperoni')).toHaveCount(0);

  await visible(page, 'topping-pepperoni').getByRole('button').click();
  await expect(visible(page, 'food-line-pepperoni')).toBeVisible();
  await expect(visible(page, 'food-amount-pepperoni')).toHaveText('3 pk');
  await visible(page, 'topping-skinke').getByRole('button').click();
  await expect(visible(page, 'food-line-pizzaskinke')).toHaveCount(0);

  // the small «Lag deigen selv» option swaps the dough line for flour and yeast
  await visible(page, 'pizza-dough-selv').click();
  await expect(visible(page, 'food-line-hvetemel')).toBeVisible();
  await expect(visible(page, 'food-line-pizzadeig')).toHaveCount(0);

  // a reload keeps the choices
  await page.waitForTimeout(600);
  await page.reload();
  await expect(visible(page, 'food-line-pepperoni')).toBeVisible();
  await expect(visible(page, 'food-line-hvetemel')).toBeVisible();
  await expect(visible(page, 'food-amounts')).not.toContainText(/juice|påbegynt/i);
  expect(errors).toEqual([]);
});

test('Meny: choosing Pizza deselects Pølser (and back); Noe annet goes with either', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);
  await visible(page, 'plan-card-food').click();
  await visible(page, 'menu-card-polser').click();
  await visible(page, 'menu-how-grillpolser').getByRole('button').click();
  await expect(visible(page, 'food-section-main-polser')).toBeVisible();

  await visible(page, 'menu-card-pizza').click();
  await expect(visible(page, 'menu-card-pizza')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'menu-card-polser')).toHaveAttribute('aria-checked', 'false');
  await expect(visible(page, 'menu-chosen-title')).toHaveText('Hjemmelaget pizza');
  await expect(page.getByTestId('menu-share-note')).toHaveCount(0);
  await expect(page.getByTestId('food-section-main-polser')).toHaveCount(0);
  // the whole party gets pizza: 36 biter → 3 langpanner, no halving
  await expect(visible(page, 'food-amount-langpanner')).toHaveText('3 langpanner');
  await expect(visible(page, 'food-amounts')).not.toContainText(/halvparten/i);

  // Noe annet comes on top of pizza
  await visible(page, 'menu-card-annet').click();
  await expect(visible(page, 'menu-card-pizza')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'menu-card-annet')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'food-amount-langpanner')).toHaveText('3 langpanner');

  // back to Pølser: Pizza goes, Noe annet stays
  await visible(page, 'menu-card-polser').click();
  await expect(visible(page, 'menu-card-pizza')).toHaveAttribute('aria-checked', 'false');
  await expect(visible(page, 'menu-card-polser')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'menu-card-annet')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('food-section-main-pizza')).toHaveCount(0);
  await visible(page, 'menu-how-grillpolser').getByRole('button').click();
  await expect(visible(page, 'food-section-main-polser')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Meny: Ferdigstekte bunner → 1 per 4 children + 1 per 2 adults, whole packs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);
  await visible(page, 'plan-card-food').click();
  await visible(page, 'menu-card-pizza').click();
  await visible(page, 'pizza-dough-ferdigstekt').getByRole('button').click();
  // 12 barn ÷ 4 = 3 + 4 voksne ÷ 2 = 2 → 5 bunner → 3 pk à 2
  await expect(visible(page, 'food-amount-langpanner')).toHaveText('5 bunner');
  await expect(visible(page, 'food-why-langpanner')).toHaveText(
    '12 barn ÷ 4 + 4 voksne ÷ 2 = 5 bunner, rundet opp. 3 pk à 2',
  );
  await expect(visible(page, 'food-amount-pizzabunner')).toHaveText('3 pk');
  await expect(visible(page, 'food-line-pizzasaus')).toContainText('per 2 bunner');
  expect(errors).toEqual([]);
});

test('Meny: a saved party with both pølser and pizza opens with pølser, without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  // let the first page finish loading before navigating away (else WebKit can report an aborted chunk load)
  await expect(visible(page, 'start')).toBeVisible();
  await page.evaluate(() => {
    const id = '7d0c3f5e-1c1a-4f6b-9a51-6a3c2b1e0e06';
    const party = {
      id,
      schemaVersion: 5,
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-19T08:00:00.000Z',
      plannedFrom: '2026-10-19',
      celebrants: [{ id: 'c1', name: 'Emma', age: 5 }],
      date: '2027-01-14',
      start: '16:30',
      end: '18:30',
      theme: null,
      home: { type: 'hus', garden: null },
      children: 13,
      hostAdults: 2,
      menu: {
        kind: 'flere',
        dishes: [
          { kind: 'grillpolser' },
          { kind: 'pizza', style: 'hjemmelaget' },
          { kind: 'annet', text: 'Vårruller' },
        ],
      },
      diets: [],
      foodItems: {},
      cake: { mode: 'bake', cakeId: 'vaniljekake-langpanne', muffins: false },
      programme: { activities: [] },
      guests: [],
      haveAtHome: [],
      taskState: {},
    };
    localStorage.setItem(`bursdagsklar:party:${id}`, JSON.stringify(party));
    localStorage.setItem('bursdagsklar:index', JSON.stringify({ schemaVersion: 5, activeId: id, ids: [id] }));
  });
  await page.goto('/plan');
  await expect(visible(page, 'plan-hero')).toContainText('Emmas 5-årsdag');
  await visible(page, 'plan-card-food').click();
  await expect(visible(page, 'menu-card-polser')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'menu-card-pizza')).toHaveAttribute('aria-checked', 'false');
  await expect(visible(page, 'menu-card-annet')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('food-section-main-pizza')).toHaveCount(0);
  await expect(visible(page, 'food-amounts')).not.toContainText(/halvparten/i);
  expect(errors).toEqual([]);
});

test('Meny: a saved party with taco (hidden now) opens with no menu chosen, without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  // let the first page finish loading before navigating away (else WebKit can report an aborted chunk load)
  await expect(visible(page, 'start')).toBeVisible();
  await page.evaluate(() => {
    const id = '7d0c3f5e-1c1a-4f6b-9a51-6a3c2b1e0e05';
    const party = {
      id,
      schemaVersion: 5,
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-19T08:00:00.000Z',
      plannedFrom: '2026-10-19',
      celebrants: [{ id: 'c1', name: 'Emma', age: 5 }],
      date: '2027-01-14',
      start: '16:30',
      end: '18:30',
      theme: null,
      home: { type: 'hus', garden: null },
      children: 13,
      hostAdults: 2,
      menu: { kind: 'taco' },
      diets: [],
      foodItems: {},
      cake: { mode: 'bake', cakeId: 'vaniljekake-langpanne', muffins: false },
      programme: { activities: [] },
      guests: [],
      haveAtHome: [],
      taskState: {},
    };
    localStorage.setItem(`bursdagsklar:party:${id}`, JSON.stringify(party));
    localStorage.setItem('bursdagsklar:index', JSON.stringify({ schemaVersion: 5, activeId: id, ids: [id] }));
  });
  await page.goto('/plan');
  await expect(visible(page, 'plan-hero')).toContainText('Emmas 5-årsdag');
  await expect(visible(page, 'plan-card-food')).toContainText('Velg meny');
  await visible(page, 'plan-card-food').click();
  for (const id of ['polser', 'pizza', 'annet'])
    await expect(visible(page, `menu-card-${id}`)).not.toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('menu-card-taco')).toHaveCount(0);
  await expect(visible(page, 'food-amounts')).toHaveCount(0);
  expect(errors).toEqual([]);
});
