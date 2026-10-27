import { expect, test, type Page } from '@playwright/test';

// Kake: from the Kake card on Planen. The default is the Toro chocolate langpanne with the gluten note;
// switching to «Bake fra bunnen» shows the TINE recipe, then Muffins and «Kjøpe ferdig». Handleliste
// follows the choice («Til kaken»), the Planen card shows the chosen cake and «Valgt», and English works.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

async function createParty(page: Page, age: number) {
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, `age-${age}`).click();
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

test('Kake: Toro by default, from scratch, muffins, ready-made; Handleliste and Planen follow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page, 7);

  const card = visible(page, 'plan-card-cake');
  await expect(card).toContainText('Kake');
  await expect(card).toContainText('Toro sjokoladekake med glasur');
  await expect(card).not.toContainText('Valgt');
  await card.click();
  await expect(visible(page, 'screen-cake')).toBeVisible();
  await expect(page.getByText('Kommer snart')).toHaveCount(0);

  // the default: Toro Sjokoladekake Langpanne + Kremet Sjokoladeglasur, with the soft gluten label
  await expect(visible(page, 'cake-kind-toro')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'cake-amount')).toContainText(/Ca\. \d+ biter/);
  await expect(visible(page, 'cake-details-toro')).toContainText('Toro Sjokoladekake Langpanne');
  await expect(visible(page, 'cake-gluten')).toHaveText('Glutenfri ifølge Orkla – sjekk pakken');
  await expect(visible(page, 'cake-glaze-name')).toHaveText('Toro Kremet Sjokoladeglasur');
  await expect(visible(page, 'cake-shop-kake-toro')).toContainText('1 pk Toro Sjokoladekake Langpanne');
  await visible(page, 'cake-glaze-langpanne').click();
  await expect(visible(page, 'cake-glaze-name')).toHaveText('Toro Sjokoladeglasur til langpanne');
  await expect(visible(page, 'cake-shop-kake-margarin')).toContainText('1 dl flytende margarin');

  // from scratch: the TINE recipe, with its source
  await visible(page, 'cake-kind-scratch').click();
  await expect(visible(page, 'cake-kind-scratch')).toHaveAttribute('aria-checked', 'true');
  const recipe = visible(page, 'cake-recipe');
  await expect(recipe).toContainText('Sjokoladekake i langpanne');
  await expect(visible(page, 'cake-recipe-cake')).toContainText('225 g');
  await expect(visible(page, 'cake-recipe-cake')).toContainText('Hvetemel');
  await expect(visible(page, 'cake-recipe-glaze')).toContainText('Melis');
  await expect(visible(page, 'cake-recipe-source')).toContainText('Oppskrift fra TINE');
  await expect(visible(page, 'cake-shop-kake-egg')).toContainText('5 stk egg');
  await expect(page.getByTestId('cake-shop-kake-toro')).toHaveCount(0);

  // muffins: Toro, 12 per pack
  await visible(page, 'cake-kind-muffins').click();
  await expect(visible(page, 'cake-details-muffins')).toContainText('Toro Lyse Muffins');
  await expect(visible(page, 'cake-gluten')).toBeVisible();
  await expect(visible(page, 'cake-muffins-need')).toContainText(/Du trenger \d+ pakker?, \d+ muffins\./);
  await visible(page, 'cake-flavour-sjokolade').click();
  await expect(visible(page, 'cake-details-muffins')).toContainText('Toro Sjokolademuffins');

  // ready-made: a soft note, nothing to buy here
  await visible(page, 'cake-kind-buy').click();
  await expect(visible(page, 'cake-buy-text')).toContainText('REMA 1000');
  await expect(visible(page, 'cake-shopping')).toContainText('Ingenting å handle til kaken');

  // back to scratch, «Ferdig» → Planen shows the chosen cake and «Valgt»
  await visible(page, 'cake-kind-scratch').click();
  await visible(page, 'cake-done').click();
  await expect(visible(page, 'plan-hero')).toBeVisible();
  await expect(visible(page, 'plan-card-cake')).toContainText('Sjokoladekake fra bunnen');
  await expect(visible(page, 'plan-card-cake')).toContainText('Valgt');

  // Handleliste: «Til kaken» with the recipe's ingredients, the candles where they were
  await visible(page, 'plan-card-shopping').click();
  await expect(visible(page, 'screen-shopping')).toBeVisible();
  const kake = visible(page, 'shop-group-kake');
  await expect(kake).toContainText('Til kaken');
  await expect(visible(page, 'shop-item-kake-egg')).toBeVisible();
  await expect(visible(page, 'shop-item-kake-melis')).toBeVisible();
  await expect(page.getByTestId('shop-item-kake-toro')).toHaveCount(0);
  await expect(visible(page, 'shop-item-kakelys')).toBeVisible();

  // English
  await page.goto('/plan');
  await visible(page, 'language-en').click();
  await expect(visible(page, 'plan-card-cake')).toContainText('Homemade chocolate cake');
  await expect(visible(page, 'plan-card-cake')).toContainText('Chosen');
  await visible(page, 'plan-card-cake').click();
  await expect(visible(page, 'screen-cake')).toContainText('The cake');
  await expect(visible(page, 'cake-recipe')).toContainText('Chocolate sheet-pan cake');
  await visible(page, 'cake-kind-toro').click();
  await expect(visible(page, 'cake-gluten')).toHaveText('Gluten-free according to Orkla – check the pack');
  await expect(visible(page, 'cake-amount')).toContainText(/About \d+ pieces/);
  // in-app navigation: a reload right after a tap could beat the debounced save
  await visible(page, 'cake-shopping-link').click();
  await expect(visible(page, 'shop-group-kake')).toContainText('For the cake');
  await expect(visible(page, 'shop-item-kake-toro')).toContainText('Toro Sjokoladekake Langpanne');
  await visible(page, 'shopping-back').click();
  await visible(page, 'language-nb').click();
  await expect(visible(page, 'plan-card-cake')).toContainText('Toro sjokoladekake med glasur');

  expect(errors).toEqual([]);
});
