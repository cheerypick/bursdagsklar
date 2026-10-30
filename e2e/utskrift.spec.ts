import { expect, test, type Page } from '@playwright/test';

// Utskrivbare invitasjoner: «Skriv ut invitasjoner (PDF)» on Invitasjon. On the web the A4 pages are added
// behind a print style sheet and the browser's print dialog opens (stubbed here): four cards per page, one per
// name on the Gjesteliste (answers are not looked at) or blank «Til: ____» cards, names escaped, English works.
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

/** window.print is replaced so the test sees the call instead of a real dialog. */
async function stubPrint(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __prints: number };
    w.__prints = 0;
    window.print = () => {
      w.__prints += 1;
    };
  });
}
const prints = (page: Page) => page.evaluate(() => (window as unknown as { __prints: number }).__prints);
const sheet = (page: Page) => page.locator('#bk-print');

test('Utskrift: blank «Til: ____» cards when there are no names, four per A4 page', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);
  await visible(page, 'plan-card-invite').click();
  await expect(visible(page, 'screen-invitation')).toBeVisible();

  const box = visible(page, 'invitation-print');
  await box.scrollIntoViewIfNeeded();
  await expect(box).toContainText('Skriv ut invitasjoner');
  const button = visible(page, 'invitation-print-button');
  await expect(button).toBeVisible();
  await expect(button).toHaveText('Skriv ut invitasjoner (PDF)');
  // 12 children with Emma → 11 guests → 12 cards (three full sheets)
  await expect(visible(page, 'invitation-print-blank')).toHaveText('12 kort med «Til: ____» som du kan skrive navn på');
  await expect(visible(page, 'invitation-print-sheets')).toHaveText('3 ark');
  await expect(visible(page, 'invitation-print-names-tip')).toBeVisible();

  await stubPrint(page);
  await button.click();
  expect(await prints(page)).toBe(1);
  await expect(sheet(page).locator('.bk-page')).toHaveCount(3);
  await expect(sheet(page).locator('.bk-card')).toHaveCount(12);
  await expect(sheet(page).locator('.bk-to-blank')).toHaveCount(12);
  await expect(sheet(page).locator('.bk-card').first()).toContainText('Emma fyller 5 år');
  // hidden on screen: the app looks the same
  await expect(sheet(page)).toBeHidden();
  // in print only the pages show, the app is hidden
  await page.emulateMedia({ media: 'print' });
  await expect(sheet(page)).toBeVisible();
  await expect(page.locator('#root')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });

  // a soft choice of how many: one fewer → 11 cards, the last sheet with three
  await visible(page, 'invitation-print-count-less').click();
  await expect(visible(page, 'invitation-print-count-value')).toHaveText('11');
  await button.click();
  expect(await prints(page)).toBe(2);
  await expect(page.locator('#bk-print')).toHaveCount(1);
  await expect(sheet(page).locator('.bk-card')).toHaveCount(11);
  await expect(sheet(page).locator('.bk-page')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('Utskrift: one card per name on the Gjesteliste (also «Kommer ikke»), escaped names, English', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);
  await visible(page, 'plan-card-guests').click();
  const input = visible(page, 'guests-add-input');
  for (const name of ['Ola', 'Sara', '<b>Åse</b> & Ørjan']) {
    await input.fill(name);
    await input.press('Enter');
  }
  await visible(page, 'guest-gjest-2-status-no').click();
  await visible(page, 'guests-done').click();
  await visible(page, 'plan-card-invite').click();
  await visible(page, 'invitation-print').scrollIntoViewIfNeeded();
  await expect(visible(page, 'invitation-print-named')).toHaveText('3 kort med navn fra gjestelista');
  await expect(visible(page, 'invitation-print-blank')).toHaveText('1 kort med «Til: ____» som du kan skrive navn på');
  await expect(visible(page, 'invitation-print-names-tip')).toHaveCount(0);

  await stubPrint(page);
  await visible(page, 'invitation-print-button').click();
  expect(await prints(page)).toBe(1);
  const names = sheet(page).locator('.bk-name');
  await expect(names).toHaveText(['Ola', 'Sara', '<b>Åse</b> & Ørjan']);
  await expect(sheet(page).locator('.bk-name b')).toHaveCount(0);
  await expect(sheet(page).locator('.bk-card')).toHaveCount(4);
  await expect(sheet(page).locator('.bk-to-blank')).toHaveCount(1);
  await expect(sheet(page).locator('.bk-to-label').first()).toHaveText('Til:');

  // English
  await page.goto('/plan');
  await visible(page, 'language-en').click();
  await visible(page, 'plan-card-invite').click();
  await visible(page, 'invitation-print').scrollIntoViewIfNeeded();
  await expect(visible(page, 'invitation-print-button')).toHaveText('Print invitations (PDF)');
  await expect(visible(page, 'invitation-print-named')).toHaveText('3 cards with names from the guest list');
  await stubPrint(page);
  await visible(page, 'invitation-print-button').click();
  await expect(sheet(page).locator('.bk-to-label').first()).toHaveText('To:');
  await expect(sheet(page).locator('.bk-card').first()).toContainText('Emma is turning 5');
  expect(errors).toEqual([]);
});
