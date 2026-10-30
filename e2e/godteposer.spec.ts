import { expect, test, type Page } from '@playwright/test';

// Godteposer (optional): from the Godteposer card on Planen. Nothing is chosen by default; «Uten godteri»
// shows suggestion chips (adapted to age and theme), two picks go on Handleliste one per child with the bags,
// «Vi dropper godteposer» clears the bags from Handleliste and Gjøremål, Planen shows the choice, and English works.
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

test('Godteposer: Uten godteri + 2 chips → Handleliste; «Vi dropper» clears; Planen; English', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page, 5);

  // Planen: optional, nothing chosen
  const card = visible(page, 'plan-card-goodie');
  await expect(card).toContainText('Godteposer (valgfritt)');
  await expect(visible(page, 'plan-card-goodie-line')).toHaveText(
    'Valgfritt: godteri, uten godteri eller litt av begge',
  );
  await expect(visible(page, 'plan-card-goodie-done')).toHaveCount(0);
  await card.click();
  await expect(visible(page, 'screen-goodie')).toBeVisible();
  for (const s of ['klassisk', 'uten', 'begge', 'skip'])
    await expect(visible(page, `goodie-style-${s}`)).toHaveAttribute('aria-checked', 'false');
  await expect(visible(page, 'goodie-choose-style')).toBeVisible();
  const kids = Number((await visible(page, 'goodie-amount').textContent())?.match(/(\d+) poser/)?.[1]);
  expect(kids).toBeGreaterThan(1);
  await expect(visible(page, 'goodie-gentle')).toHaveText(
    'Noen foreldre ønsker mindre godteri – Uten godteri er et fint alternativ.',
  );

  // Uten godteri: no candy chips, small toys «fra 4 år» for a 5-year-old
  await visible(page, 'goodie-style-uten').click();
  await expect(visible(page, 'goodie-style-uten')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'goodie-godteri')).toHaveCount(0);
  await expect(visible(page, 'goodie-sprettball')).toContainText('fra 4 år');
  await visible(page, 'goodie-klistremerker').click();
  await visible(page, 'goodie-sapebobler').click();
  await expect(visible(page, 'goodie-klistremerker')).toHaveAttribute('aria-pressed', 'true');
  await expect(visible(page, 'goodie-shop-pose-klistremerker')).toHaveText(`• ${kids} ark klistremerker`);
  await expect(visible(page, 'goodie-shop-pose-sapebobler')).toHaveText(`• ${kids} såpebobler`);

  // Handleliste: the bags and the two picks, one per child; a link back to the screen
  await visible(page, 'goodie-shopping-link').click();
  await expect(visible(page, 'screen-shopping')).toBeVisible();
  const group = visible(page, 'shop-group-godteposer');
  await expect(visible(page, 'shop-qty-godteposer')).toHaveText(`${kids} stk`);
  await expect(visible(page, 'shop-qty-pose-klistremerker')).toHaveText(`${kids} ark`);
  await expect(visible(page, 'shop-qty-pose-sapebobler')).toHaveText(`${kids} stk`);
  await expect(group).toContainText('Godteposer: Uten godteri');
  await visible(page, 'shopping-goodie-link').click();
  await expect(visible(page, 'screen-goodie')).toBeVisible();

  // Planen shows the choice
  await visible(page, 'goodie-done').click();
  await expect(visible(page, 'plan-card-goodie-line')).toHaveText('Uten godteri · 2 ting');
  await expect(visible(page, 'plan-card-goodie-done')).toHaveText('Valgt');

  // Gjøremål: «Pakk godteposene»
  await page.goto('/gjoremal');
  await expect(page.getByText('Pakk godteposene').filter({ visible: true })).toBeVisible();

  // «Vi dropper godteposer»: nothing about bags on Handleliste or Gjøremål
  await page.goto('/godteposer');
  await visible(page, 'goodie-style-skip').click();
  await expect(visible(page, 'goodie-style-skip')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'goodie-skipped')).toContainText('Dere dropper godteposer');
  await expect(visible(page, 'goodie-chips')).toHaveCount(0);
  await visible(page, 'goodie-done').click();
  await expect(visible(page, 'plan-card-goodie-line')).toHaveText('Vi dropper godteposer');
  await expect(visible(page, 'plan-card-goodie-done')).toHaveText('Valgt');
  await visible(page, 'plan-card-shopping').click();
  await expect(visible(page, 'screen-shopping')).toBeVisible();
  await expect(visible(page, 'shop-group-godteposer')).toHaveCount(0);
  await expect(page.locator('[data-testid^="shop-item-pose-"]').filter({ visible: true })).toHaveCount(0);
  await page.goto('/gjoremal');
  await expect(page.getByText('Pakk godteposene')).toHaveCount(0);

  // English (and back to the bags: her picks come back)
  await page.goto('/plan');
  await visible(page, 'language-en').click();
  await expect(visible(page, 'plan-card-goodie')).toContainText('Goodie bags (optional)');
  await expect(visible(page, 'plan-card-goodie-line')).toHaveText("We're skipping goodie bags");
  await visible(page, 'plan-card-goodie').click();
  await expect(visible(page, 'screen-goodie')).toContainText('What goes in the bags?');
  await visible(page, 'goodie-style-begge').click();
  await expect(visible(page, 'goodie-candy-per-bag')).toHaveText('Sweets: about 50 g per bag, the rest small things.');
  await expect(visible(page, 'goodie-klistremerker')).toHaveAttribute('aria-pressed', 'true');
  await expect(visible(page, 'goodie-allergy')).toContainText('allergies');
  await expect(visible(page, 'goodie-shop-pose-sapebobler')).toHaveText(`• ${kids} soap bubbles`);
  await visible(page, 'goodie-done').click();
  await expect(visible(page, 'plan-card-goodie-line')).toHaveText('A bit of both · 2 things');
  await visible(page, 'language-nb').click();
  expect(errors).toEqual([]);
});

test('Godteposer: a 3-year-old gets no small-parts suggestions, said softly', async ({ page }) => {
  await createParty(page, 3);
  await visible(page, 'plan-card-goodie').click();
  await visible(page, 'goodie-style-uten').click();
  await expect(visible(page, 'goodie-klistremerker')).toBeVisible();
  await expect(visible(page, 'goodie-sprettball')).toHaveCount(0);
  await expect(visible(page, 'goodie-smafigurer')).toHaveCount(0);
  await expect(visible(page, 'goodie-small-parts')).toHaveText('Til de minste har vi holdt unna ting med smådeler.');
});
