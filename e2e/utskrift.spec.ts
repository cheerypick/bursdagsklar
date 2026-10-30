import { expect, test, type Page } from '@playwright/test';

// Utskrivbare invitasjoner: «Skriv ut invitasjoner (PDF)» on Invitasjon. On the web the A4 sheets are added
// behind a print style sheet and the browser's print dialog opens (stubbed here): illustrated A5 cards, two per
// landscape sheet, one per name on the Gjesteliste (answers are not looked at) or blank «Til: ____» cards, the
// card picker, the extra lines, white paper, the parents' names, names escaped, English works.
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
/** The print waits for the drawing and the fonts, so the dialog opens a moment after the tap. */
const printed = (page: Page, n: number) => expect.poll(() => prints(page), { timeout: 10_000 }).toBe(n);
const cardStyle = (page: Page) =>
  sheet(page)
    .locator('.bk-card')
    .first()
    .evaluate((el) => {
      const cs = getComputedStyle(el);
      return { image: cs.backgroundImage, color: cs.backgroundColor, card: el.getAttribute('data-card') };
    });
const sheet = (page: Page) => page.locator('#bk-print');

test('Utskrift: illustrated cards, two per A4 sheet, blank «Til: ____» cards when there are no names', async ({
  page,
  request,
}) => {
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
  // 12 children with Emma → 11 guests → 12 cards (six sheets of two)
  await expect(visible(page, 'invitation-print-blank')).toHaveText('12 kort med «Til: ____» som du kan skrive navn på');
  await expect(visible(page, 'invitation-print-sheets')).toHaveText('6 ark');
  await expect(visible(page, 'invitation-print-names-tip')).toBeVisible();
  // no theme → the «Bursdag» card is chosen; six cards to pick from
  await expect(box.getByRole('radio')).toHaveCount(6);
  await expect(visible(page, 'invitation-card-bursdag')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'invitation-card-chosen')).toHaveText('Valgt kort: Bursdag');
  await expect(visible(page, 'invitation-hosts-tip')).toBeVisible();

  await stubPrint(page);
  await button.click();
  await printed(page, 1);
  await expect(sheet(page).locator('.bk-page')).toHaveCount(6);
  await expect(sheet(page).locator('.bk-card')).toHaveCount(12);
  await expect(sheet(page).locator('.bk-to-blank')).toHaveCount(12);
  await expect(sheet(page).locator('.bk-h').first()).toHaveText('Emma fyller 5!');
  // the drawing is there (and loads), on cream paper
  const style = await cardStyle(page);
  expect(style.card).toBe('bursdag');
  expect(style.image).toMatch(/url\(.*bursdag.*\.webp/);
  expect(style.color).toBe('rgb(251, 245, 232)');
  const art = /url\("?([^")]+)"?\)/.exec(style.image)?.[1] ?? '';
  const res = await request.get(art);
  expect(res.ok()).toBe(true);
  expect((await res.body()).length).toBeGreaterThan(50_000);
  // hidden on screen: the app looks the same
  await expect(sheet(page)).toBeHidden();
  // in print only the sheets show, the app is hidden
  await page.emulateMedia({ media: 'print' });
  await expect(sheet(page)).toBeVisible();
  await expect(page.locator('#root')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });

  // a soft choice of how many: one fewer → 11 cards, the last sheet with one
  await visible(page, 'invitation-print-count-less').click();
  await expect(visible(page, 'invitation-print-count-value')).toHaveText('11');
  await button.click();
  await printed(page, 2);
  await expect(page.locator('#bk-print')).toHaveCount(1);
  await expect(sheet(page).locator('.bk-card:not(.bk-empty)')).toHaveCount(11);
  await expect(sheet(page).locator('.bk-page')).toHaveCount(6);
  expect(errors).toEqual([]);
});

test("Utskrift: pick another card, the extra lines, white paper and the parents' names", async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);
  await visible(page, 'plan-card-invite').click();
  await visible(page, 'invitation-hosts').fill('Kari og Per');
  await visible(page, 'invitation-phone').fill('90000000');
  await visible(page, 'invitation-reply-ifComing').click();
  await visible(page, 'invitation-print').scrollIntoViewIfNeeded();
  await expect(visible(page, 'invitation-hosts-tip')).toHaveCount(0);

  // «Velg kort»: the dinosaurs
  await visible(page, 'invitation-card-dinosaurer').click();
  await expect(visible(page, 'invitation-card-dinosaurer')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'invitation-card-bursdag')).toHaveAttribute('aria-checked', 'false');
  await expect(visible(page, 'invitation-card-chosen')).toHaveText('Valgt kort: Dinosaurer');

  // the extra lines: allergies is offered (and picked) until she changes it; siblings appears when ticked
  const info = visible(page, 'invitation-info');
  await expect(visible(page, 'invitation-info-allergies')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'invitation-info-siblings')).toHaveCount(0);
  await visible(page, 'invitation-siblings').click();
  await expect(visible(page, 'invitation-info-siblings')).toHaveAttribute('aria-checked', 'true');
  await expect(info).toContainText('Søsken er hjertelig velkomne');
  await visible(page, 'invitation-info-allergies').click();
  await expect(visible(page, 'invitation-info-allergies')).toHaveAttribute('aria-checked', 'false');

  // white paper
  await visible(page, 'invitation-white-paper').click();
  await expect(visible(page, 'invitation-white-paper')).toHaveAttribute('aria-checked', 'true');

  await stubPrint(page);
  await visible(page, 'invitation-print-button').click();
  await printed(page, 1);
  const style = await cardStyle(page);
  expect(style.card).toBe('dinosaurer');
  expect(style.image).toMatch(/url\(.*dinosaurer.*\.webp/);
  expect(style.color).toBe('rgb(255, 255, 255)');
  const card = sheet(page).locator('.bk-card').first();
  await expect(card.locator('.bk-info')).toHaveText(['Søsken er hjertelig velkomne']);
  await expect(card.locator('.bk-svar1')).toHaveText('Svar til Kari og Per (Emmas foreldre)');
  await expect(card.locator('.bk-tel')).toHaveText('900 00 000');
  // the text invitation uses the names too
  await expect(visible(page, 'invitation-text')).toHaveValue(/Send gjerne en melding til Kari og Per på 900 00 000\./);

  // back to cream
  await visible(page, 'invitation-white-paper').click();
  await visible(page, 'invitation-print-button').click();
  await printed(page, 2);
  expect((await cardStyle(page)).color).toBe('rgb(251, 245, 232)');
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
  await expect(visible(page, 'invitation-print-sheets')).toHaveText('2 ark');
  await expect(visible(page, 'invitation-print-names-tip')).toHaveCount(0);

  await stubPrint(page);
  await visible(page, 'invitation-print-button').click();
  await printed(page, 1);
  const names = sheet(page).locator('.bk-name');
  await expect(names).toHaveText(['Ola', 'Sara', '<b>Åse</b> & Ørjan']);
  await expect(sheet(page).locator('.bk-name b')).toHaveCount(0);
  await expect(sheet(page).locator('.bk-card')).toHaveCount(4);
  await expect(sheet(page).locator('.bk-page')).toHaveCount(2);
  await expect(sheet(page).locator('.bk-to-blank')).toHaveCount(1);
  await expect(sheet(page).locator('.bk-to-label').first()).toHaveText('Til:');

  // English
  await page.goto('/plan');
  await visible(page, 'language-en').click();
  await visible(page, 'plan-card-invite').click();
  await visible(page, 'invitation-print').scrollIntoViewIfNeeded();
  await expect(visible(page, 'invitation-print-button')).toHaveText('Print invitations (PDF)');
  await expect(visible(page, 'invitation-print-named')).toHaveText('3 cards with names from the guest list');
  await expect(visible(page, 'invitation-card-chosen')).toHaveText('Chosen card: Birthday');
  await stubPrint(page);
  await visible(page, 'invitation-print-button').click();
  await printed(page, 1);
  await expect(sheet(page).locator('.bk-to-label').first()).toHaveText('To:');
  await expect(sheet(page).locator('.bk-h').first()).toHaveText('Emma is turning 5!');
  expect(errors).toEqual([]);
});
