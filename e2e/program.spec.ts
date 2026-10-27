import { expect, test, type Page } from '@playwright/test';

// Program: from the Program card on Planen. Three ideas for this party (at least one free), each with its
// rules; «Flere ideer» grouped, with «Ute» for a house; picking skattejakt + piñata updates Handleliste
// («Til lekene») and Gjøremål, the Planen card shows the picks, and English works.
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

test('Program: ideas with rules, pick skattejakt + piñata → Handleliste, Gjøremål, Planen; English', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page, 5);

  const card = visible(page, 'plan-card-programme');
  await expect(card).toContainText('Program og leker');
  await card.click();
  await expect(visible(page, 'screen-program')).toBeVisible();
  await expect(page.getByText('Kommer snart')).toHaveCount(0);

  // three ideas for a 5-year-old at home in November, at least one free
  const suggested = visible(page, 'program-suggested');
  await expect(suggested.locator('[data-testid^="activity-"][data-testid$="-pick"]')).toHaveCount(3);
  await expect(visible(page, 'activity-skattejakt')).toBeVisible();
  await expect(visible(page, 'activity-skattejakt-free')).toHaveText('Gratis');
  await expect(visible(page, 'activity-pinata')).toBeVisible();

  // the rules: numbered steps and tips
  await visible(page, 'activity-skattejakt-rules').click();
  const rules = visible(page, 'activity-skattejakt-rules-view');
  await expect(rules).toContainText('Slik leker dere');
  await expect(rules).toContainText('1');
  await expect(rules).toContainText('For de yngste');

  // pick skattejakt + piñata
  await visible(page, 'activity-skattejakt-pick').click();
  await visible(page, 'activity-pinata-pick').click();
  await expect(visible(page, 'activity-pinata-pick')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'program-chosen')).toContainText('2 leker valgt');
  await expect(visible(page, 'activity-pinata-shop')).toBeVisible();
  await expect(visible(page, 'program-timeline')).toContainText('Skattejakt');
  await expect(visible(page, 'program-timeline-pinata')).toBeVisible();

  // «Flere ideer»: grouped; a house shows «Ute, hvis været tillater»
  await visible(page, 'program-more-toggle').click();
  await expect(visible(page, 'program-group-gratis')).toContainText('Gratis');
  await expect(visible(page, 'program-group-ute')).toContainText('hvis været tillater');

  // Handleliste: «Til lekene» with the piñata and candy to fill it
  await visible(page, 'program-shopping-link').click();
  await expect(visible(page, 'screen-shopping')).toBeVisible();
  await expect(visible(page, 'shop-group-leker')).toContainText('Til lekene');
  await expect(visible(page, 'shop-item-program-pinata')).toContainText('Piñata');
  await expect(visible(page, 'shop-item-program-pinataGodteri')).toBeVisible();
  await visible(page, 'shopping-back').click();

  // Planen shows the picks
  await expect(visible(page, 'plan-hero')).toBeVisible();
  await expect(visible(page, 'plan-card-programme')).toContainText('Skattejakt, Piñata');
  await expect(visible(page, 'plan-card-programme')).toContainText('2 valgt');

  // Gjøremål: draw the map, hide the goodie bags, the piñata
  await visible(page, 'plan-card-todo').click();
  await expect(visible(page, 'screen-todo')).toContainText('Tegn kartet');
  await expect(visible(page, 'screen-todo')).toContainText('Gjem godteposene');
  await expect(visible(page, 'screen-todo')).toContainText(/piñata/);
  await page.goto('/plan');

  // English: the card, the screen and the rules; the photo hunt list is there to copy
  await visible(page, 'language-en').click();
  await expect(visible(page, 'plan-card-programme')).toContainText('Treasure hunt, Piñata');
  await visible(page, 'plan-card-programme').click();
  await expect(visible(page, 'activity-skattejakt')).toContainText('Treasure hunt');
  await expect(visible(page, 'activity-skattejakt-free')).toHaveText('Free');
  await visible(page, 'program-more-toggle').click();
  await visible(page, 'activity-fotojakt-rules').click();
  await expect(visible(page, 'program-photo-list')).toBeVisible();
  await expect(visible(page, 'program-photo-list').getByText('10', { exact: true })).toBeVisible();
  await expect(visible(page, 'program-photo-copy')).toBeVisible();
  await visible(page, 'program-done').click();
  await visible(page, 'language-nb').click();
  await expect(visible(page, 'plan-card-programme')).toContainText('Skattejakt');

  expect(errors).toEqual([]);
});
