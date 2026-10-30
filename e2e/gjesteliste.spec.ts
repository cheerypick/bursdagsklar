import { expect, test, type Page } from '@playwright/test';

// Gjesteliste (optional): from the Gjesteliste card on Planen. Add three names (Enter adds the next), one
// «Kommer ikke» and one allergy note → a soft hint (the plan's number never changes on its own; the button
// changes it only when tapped), the Planen card shows «3 navn · 1 kommer», Mat shows the note as one soft line,
// Godteposer and Invitasjon pick up the names, long names wrap, and English works.
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

test('Gjesteliste: 3 names, one «Kommer ikke», one allergy → soft hint, Planen, Mat, feed-ins, English', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);

  // Planen: optional
  const card = visible(page, 'plan-card-guests');
  await expect(card).toContainText('Gjesteliste (valgfritt)');
  await expect(visible(page, 'plan-card-guests-line')).toHaveText('Valgfritt: navn, svar og allergier');
  await card.click();
  await expect(visible(page, 'screen-guests')).toBeVisible();
  await expect(visible(page, 'guests-empty')).toBeVisible();
  await expect(visible(page, 'guests-hint')).toHaveCount(0);
  await expect(visible(page, 'guests-celebrants')).toHaveText(
    'Emma er med i tallet fra før, så her skriver du bare gjestene.',
  );
  await expect(visible(page, 'guests-privacy')).toHaveText('Navnene lagres bare på denne enheten.');

  // quick add: Enter adds and keeps the field ready for the next name
  const input = visible(page, 'guests-add-input');
  await input.fill('Ola');
  await input.press('Enter');
  await expect(input).toHaveValue('');
  await input.fill('Sara');
  await input.press('Enter');
  await input.fill('Maximilian Alexander Johannessen-Berg');
  await visible(page, 'guests-add').click();
  await expect(page.locator('[data-testid$="-name"][data-testid^="guest-"]').filter({ visible: true })).toHaveText([
    'Ola',
    'Sara',
    'Maximilian Alexander Johannessen-Berg',
  ]);
  // a long name wraps onto two lines on a phone, never cut off with «…»
  const longName = visible(page, 'guest-gjest-3-name');
  const box = await longName.boundingBox();
  if ((page.viewportSize()?.width ?? 0) < 600) expect(box!.height).toBeGreaterThan(30);
  expect(await longName.evaluate((el) => getComputedStyle(el).textOverflow)).not.toBe('ellipsis');

  // every child starts «Venter på svar»; the plan's number (12, Emma included) has not moved
  await expect(visible(page, 'guest-gjest-1-status-pending')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'guests-hint-text')).toHaveText(
    '3 navn på lista. Med Emma blir det 4 barn, planen regner med 12.',
  );
  await expect(visible(page, 'guests-hint-not-all')).toBeVisible();

  // one «Kommer», one «Kommer ikke», one allergy note
  await visible(page, 'guest-gjest-1-status-yes').click();
  await visible(page, 'guest-gjest-2-status-no').click();
  await expect(visible(page, 'guest-gjest-2-status-no')).toHaveAttribute('aria-checked', 'true');
  const note = visible(page, 'guest-gjest-1-note');
  await note.fill('nøtter');
  await note.press('Enter');
  await expect(visible(page, 'guests-counts')).toHaveText('1 kommer · 1 kommer ikke · 1 venter på svar');
  await expect(visible(page, 'guests-hint-text')).toHaveText(
    '1 har svart at de ikke kommer. Da blir dere kanskje 3 barn med Emma, planen regner med 12.',
  );
  await expect(visible(page, 'guests-hint')).toContainText('Tallet i planen endres bare hvis du vil.');
  await expect(visible(page, 'guests-hint-apply')).toHaveText('Bruk 3 barn i planen');

  // Planen: «3 navn · 1 kommer», and the plan still counts 12 (soft hints only)
  await visible(page, 'guests-done').click();
  await expect(visible(page, 'plan-card-guests-line')).toHaveText('3 navn · 1 kommer');
  await expect(visible(page, 'plan-hero')).toContainText('12 barn');

  // Mat: the note as one soft line, nothing ticked
  await visible(page, 'plan-card-food').click();
  await expect(visible(page, 'food-guest-notes-text')).toHaveText('Fra gjestelista: Ola (nøtter)');
  await visible(page, 'menu-card-polser').click();
  await visible(page, 'menu-how-grillpolser').getByRole('button').click();
  await expect(visible(page, 'food-for-whom')).toHaveText('For 12 barn og 4 voksne');
  await expect(visible(page, 'food-diets').getByTestId('food-guest-notes-text')).toHaveText(
    'Fra gjestelista: Ola (nøtter)',
  );
  // nothing is ticked for her: the diet chips stay hers to tap
  await expect(visible(page, 'food-diets')).not.toContainText('✓');

  // Godteposer: «skriv navn på posene»
  await page.goto('/godteposer');
  await visible(page, 'goodie-style-klassisk').click();
  await expect(visible(page, 'goodie-names')).toContainText('Skriv gjerne navnet på hver pose');

  // Invitasjon: a personal text for each child who has not said no
  await page.goto('/invitasjon');
  await expect(visible(page, 'invitation-personal')).toContainText('Hei Ola!');
  await expect(visible(page, 'invitation-personal')).not.toContainText('Hei Sara!');
  await expect(visible(page, 'invitation-personal-gjest-1-copy')).toBeVisible();

  // a reload keeps the list
  await page.goto('/gjesteliste');
  await page.reload();
  await expect(visible(page, 'guest-gjest-1-note')).toHaveValue('nøtter');
  await expect(visible(page, 'guest-gjest-2-status-no')).toHaveAttribute('aria-checked', 'true');

  // «Bruk 3 barn i planen» changes the number only when tapped
  await visible(page, 'guests-hint-apply').click();
  await expect(visible(page, 'guests-hint-text')).toHaveText('Lista og planen stemmer: 3 barn med Emma.');
  await expect(visible(page, 'guests-hint-apply')).toHaveCount(0);

  // English (navigate in the app: the save is debounced by a moment)
  await visible(page, 'guests-done').click();
  await expect(visible(page, 'plan-hero')).toContainText('3 barn');
  await visible(page, 'language-en').click();
  await expect(visible(page, 'plan-card-guests')).toContainText('Guest list (optional)');
  await expect(visible(page, 'plan-card-guests-line')).toHaveText('3 names · 1 coming');
  await visible(page, 'plan-card-guests').click();
  await expect(visible(page, 'guest-gjest-2-status-no')).toHaveText('Not coming');
  await expect(visible(page, 'guests-privacy')).toHaveText('The names are only stored on this device.');
  await expect(visible(page, 'guests-hint-text')).toHaveText('The list and the plan match: 3 children with Emma.');
  await page.goto('/mat');
  await expect(visible(page, 'food-guest-notes-text')).toHaveText('From the guest list: Ola (nøtter)');

  // remove a child
  await page.goto('/gjesteliste');
  await visible(page, 'guest-gjest-3-remove').click();
  await expect(visible(page, 'guest-gjest-3')).toHaveCount(0);
  expect(errors).toEqual([]);
});
