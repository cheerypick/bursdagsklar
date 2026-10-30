import { expect, test, type Page } from '@playwright/test';

// Påminnelser (30 Oct 2026, «no blind to-do buttons»): the to-dos that say «Den er ferdig skrevet» open the
// written message. From Gjøremål, «Åpne påminnelsen» on the svarfrist to-do lands on the svarpåminnelse with
// one «Kommer Ola?» per child still waiting; copy works; the tone switch and the thank-you toggles change
// the text; Invitasjon has a way in; the calendar file downloads on the web.
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

/** Clipboard stub (no Web Share API, like a desktop browser): what was copied lands in window.__copied. */
async function stubClipboard(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __copied: string | null };
    w.__copied = null;
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (t: string) => {
          w.__copied = t;
        },
      },
    });
  });
}
const copied = (page: Page) => page.evaluate(() => (window as unknown as { __copied: string | null }).__copied);

async function openTodos(page: Page) {
  await page
    .getByRole('tab', { name: 'Gjøremål' })
    .or(page.getByRole('link', { name: 'Gjøremål' }))
    .filter({ visible: true })
    .first()
    .click();
  await expect(visible(page, 'screen-todo')).toBeVisible();
}

test('from Gjøremål to the written svarpåminnelse: one per child waiting, copy works', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await stubClipboard(page);
  await createParty(page);

  // two names on the guest list: Ola still waiting, Sara has said yes
  await page.goto('/gjesteliste');
  const input = visible(page, 'guests-add-input');
  await input.fill('Ola');
  await input.press('Enter');
  await input.fill('Sara');
  await input.press('Enter');
  await visible(page, 'guest-gjest-2-status-yes').click();
  await expect(visible(page, 'guest-gjest-2-status-yes')).toHaveAttribute('aria-checked', 'true');
  await page.waitForTimeout(600); // storage writes are debounced
  await page.goto('/plan');

  await openTodos(page);
  await page
    .getByRole('link', { name: /^Åpne påminnelsen: Svarfrist i morgen/ })
    .filter({ visible: true })
    .click();
  await expect(visible(page, 'screen-reminders')).toBeVisible();
  await expect(page).toHaveURL(/\/paminnelser\?m=svar/);
  await expect(visible(page, 'reminders-tab-svar')).toHaveAttribute('aria-selected', 'true');
  await expect(visible(page, 'reminders-svar')).toContainText('Svarpåminnelse');
  await expect(visible(page, 'reminders-svar-count')).toHaveText(
    '1 venter på svar på gjestelista. Her er en melding til hver:',
  );
  await expect(visible(page, 'reminders-svar-gjest-1')).toContainText('Kommer Ola?');
  await expect(visible(page, 'reminders-svar-gjest-2')).toHaveCount(0);
  await expect(visible(page, 'reminders-svar-preview')).toContainText('Kommer Ola? Svarfristen er');

  await visible(page, 'reminders-svar-gjest-1-copy').click();
  await expect(page.getByText('Kopiert', { exact: true })).toBeVisible();
  const text = await copied(page);
  expect(text).toMatch(/^Hei! Bare en liten påminnelse om Emmas bursdag \S+ 15\. \S+ kl\. \d/);
  expect(text).toContain('Kommer Ola?');
  expect(text).not.toMatch(/[{}]/);

  // the short tone
  await visible(page, 'reminders-tone-kort').click();
  await expect(visible(page, 'reminders-svar-preview')).toContainText('Hei! Kommer Ola i Emmas bursdag');

  // «Sendt» ticks the to-do in Gjøremål too
  await visible(page, 'reminders-svar-sent').click();
  await expect(visible(page, 'reminders-svar-sent')).toHaveAttribute('aria-checked', 'true');
  expect(errors).toEqual([]);
});

test('before the party and the thank-you: links from the to-dos, toggles, the Invitasjon entry', async ({ page }) => {
  await stubClipboard(page);
  await createParty(page);

  // Invitasjon: the address and phone go into the party reminder; the entry row opens Påminnelser
  await visible(page, 'plan-card-invite').click();
  await visible(page, 'invitation-address').fill('Storgata 12');
  await visible(page, 'invitation-phone').fill('90000000');
  await visible(page, 'invitation-reminders').click();
  await expect(visible(page, 'screen-reminders')).toBeVisible();
  // no names on the list: one general message
  await expect(visible(page, 'reminders-svar-general-why')).toContainText('felles påminnelse');
  await expect(visible(page, 'reminders-svar-text')).toContainText('Kommer barnet deres?');

  await page.goto('/plan');
  await openTodos(page);
  await page
    .getByRole('link', { name: /^Åpne påminnelsen: Send påminnelse til foreldrene/ })
    .filter({ visible: true })
    .click();
  await expect(visible(page, 'reminders-tab-fest')).toHaveAttribute('aria-selected', 'true');
  await expect(visible(page, 'reminders-fest-text')).toContainText('i Storgata 12');
  await expect(visible(page, 'reminders-fest-text')).toContainText('Ring oss på 900 00 000');
  await expect(visible(page, 'reminders-fest-tip')).toHaveCount(0);
  await visible(page, 'reminders-fest-copy').click();
  await expect(page.getByText('Kopiert', { exact: true })).toBeVisible();
  expect(await copied(page)).toContain('Hei alle sammen! Vi gleder oss til Emmas bursdag');

  await page.goto('/plan');
  await openTodos(page);
  await page
    .getByRole('link', { name: /^Åpne takkemeldingen: Send takkemelding/ })
    .filter({ visible: true })
    .click();
  await expect(visible(page, 'reminders-tab-takk')).toHaveAttribute('aria-selected', 'true');
  const thanks = visible(page, 'reminders-takk-text');
  await expect(thanks).toContainText('Og takk for gavene, Emma ble så glad.');
  await visible(page, 'reminders-takk-gift').click();
  await expect(thanks).toContainText('Og takk for den fine gaven');
  await visible(page, 'reminders-takk-forgotten').click();
  await expect(thanks).toContainText('PS: Noen har glemt igjen ting hos oss.');
  await expect(thanks).toContainText('Hilsen Emma og familien');
});

test('«Legg i kalenderen» downloads a calendar file on the web', async ({ page }) => {
  await createParty(page);
  await page.goto('/paminnelser');
  await expect(visible(page, 'reminders-calendar')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    visible(page, 'reminders-calendar-party').click(),
  ]);
  expect(download.suggestedFilename()).toBe('emma-bursdag.ics');
  const path = await download.path();
  const fs = await import('node:fs');
  const ics = fs.readFileSync(path, 'utf8');
  expect(ics).toContain('BEGIN:VEVENT');
  expect(ics).toContain('SUMMARY:Emmas bursdag');
  expect(ics).toMatch(/DTSTART:\d{8}T\d{6}\r\n/);
});
