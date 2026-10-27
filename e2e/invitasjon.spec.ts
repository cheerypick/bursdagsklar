import { expect, test, type Page } from '@playwright/test';

// Invitasjon: from the Invitasjon card on Planen. A 4-year-old: «noen foreldre blir og hjelper til» is
// pre-ticked and its line is in the text; untick → the line is gone; siblings toggle; the phone field
// (empty → a soft tip, never blocking); «Kopier tekst» copies the text.
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
  // the adults line follows the youngest child (3–4: helping parents are counted in the food)
  await expect(
    page.getByText('Med de minste blir gjerne noen foreldre og hjelper til', { exact: false }),
  ).toBeVisible();
  await visible(page, 'next').click();
  await visible(page, 'place-hus').click();
  await visible(page, 'next').click();
  await expect(visible(page, 'screen-ready')).toContainText('Emmas fest er klar.');
  await visible(page, 'see-plan').click();
  await expect(visible(page, 'plan-hero')).toBeVisible();
}

const HELP_LINE = 'Vi blir glade om noen foreldre har lyst til å bli og hjelpe til.';
const SIBLINGS_LINE = 'Søsken er velkomne – si gjerne fra hvor mange.';

test('Invitasjon for a 4-year-old: parents-help pre-ticked, siblings, phone, copy', async ({
  page,
  context,
  browserName,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await createParty(page, 4);

  const card = visible(page, 'plan-card-invite');
  await expect(card).toContainText('Invitasjon');
  await expect(card).toContainText('Klar til å sendes');
  await card.click();
  await expect(visible(page, 'screen-invitation')).toBeVisible();
  await expect(page.getByText('Kommer snart')).toHaveCount(0);
  await expect(visible(page, 'invitation-card')).toBeVisible();

  const text = visible(page, 'invitation-text');
  const help = visible(page, 'invitation-parents-help');
  await expect(help).toHaveAttribute('aria-checked', 'true');
  await expect(text).toHaveValue(/Emma fyller 4 år/);
  await expect(text).toHaveValue(new RegExp(HELP_LINE));
  await expect(visible(page, 'invitation-parents-help-sub')).toContainText('foreldre som hjelper til');

  // untick → the line is gone
  await help.click();
  await expect(help).toHaveAttribute('aria-checked', 'false');
  await expect(text).not.toHaveValue(new RegExp(HELP_LINE));

  // siblings: off by default, on adds the line
  const siblings = visible(page, 'invitation-siblings');
  await expect(siblings).toHaveAttribute('aria-checked', 'false');
  await expect(text).not.toHaveValue(/Søsken/);
  await siblings.click();
  await expect(text).toHaveValue(new RegExp(SIBLINGS_LINE));

  // reply mode and svarfrist (default: the day before the party)
  await expect(text).toHaveValue(/Gi beskjed hvis dere ikke kommer, gjerne innen \S+ 14\./);
  await visible(page, 'invitation-reply-ifComing').click();
  await expect(text).toHaveValue(/Gi beskjed om dere kommer, gjerne innen \S+ 14\./);

  // phone: empty → soft tip; typed → in the text, tip gone
  await expect(visible(page, 'invitation-phone-tip')).toContainText('Tips: Legg gjerne til et telefonnummer');
  await visible(page, 'invitation-phone').fill('90000000');
  await expect(text).toHaveValue(/Send gjerne en melding til 900 00 000\./);
  await expect(page.getByTestId('invitation-phone-tip')).toHaveCount(0);
  await visible(page, 'invitation-address').fill('Bjerkeveien 12');
  await expect(text).toHaveValue(/Hvor: Bjerkeveien 12/);
  await expect(visible(page, 'invitation-where')).toHaveText('Bjerkeveien 12');

  // copy
  await visible(page, 'invitation-copy').click();
  await expect(page.getByText('Kopiert')).toBeVisible();
  if (browserName === 'chromium') {
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Emma fyller 4 år');
    expect(copied).toContain('900 00 000');
  }

  // own edit, then «Lag teksten på nytt»
  await text.fill('Vår egen tekst');
  await expect(visible(page, 'invitation-edited')).toBeVisible();
  await visible(page, 'invitation-regenerate').click();
  await expect(text).toHaveValue(/Emma fyller 4 år/);

  // the choices survive a reload (saved 300 ms after a change)
  await page.waitForTimeout(600);
  await page.reload();
  await expect(visible(page, 'invitation-parents-help')).toHaveAttribute('aria-checked', 'false');
  await expect(visible(page, 'invitation-text')).toHaveValue(new RegExp(SIBLINGS_LINE));

  // done-state on Planen
  await visible(page, 'invitation-sent').click();
  await page.waitForTimeout(600);
  await page.goto('/plan');
  await expect(visible(page, 'plan-card-invite')).toContainText('Sendt');
  expect(errors).toEqual([]);
});

test('Invitasjon for a 6-year-old: parents-help not ticked', async ({ page }) => {
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Ali');
  await visible(page, 'age-6').click();
  await visible(page, 'next').click();
  await visible(page, 'calendar-next').click();
  await visible(page, 'calendar-grid')
    .getByRole('button', { name: /^(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag) 15\. / })
    .click();
  await visible(page, 'next').click();
  await expect(page.getByText('Dere voksne er med i maten', { exact: false })).toBeVisible();
  await visible(page, 'next').click();
  await visible(page, 'place-leilighet').click();
  await visible(page, 'next').click();
  await visible(page, 'see-plan').click();
  await visible(page, 'plan-card-invite').click();
  await expect(visible(page, 'invitation-parents-help')).toHaveAttribute('aria-checked', 'false');
  await expect(visible(page, 'invitation-text')).not.toHaveValue(new RegExp(HELP_LINE));
});

test('Invitation in English: switch on Planen, the screen and the generated text follow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page, 4);
  // Språk / Language at the foot of Planen
  await visible(page, 'language-en').click();
  const card = visible(page, 'plan-card-invite');
  await expect(card).toContainText('Invitation');
  await expect(card).toContainText('Card and text, ready to share');
  await card.click();
  await expect(visible(page, 'screen-invitation')).toBeVisible();
  await expect(page.getByText('Phone for replies').filter({ visible: true }).first()).toBeVisible();
  await expect(visible(page, 'invitation-phone-tip')).toContainText('Tip: You might want to add a phone number');

  const text = visible(page, 'invitation-text');
  await expect(visible(page, 'invitation-parents-help')).toHaveAttribute('aria-checked', 'true');
  await expect(text).toHaveValue(/Emma is turning 4, and we'd love to celebrate with you!/);
  await expect(text).toHaveValue(/When: \w+day 15 \w+, \d\d:\d\d–\d\d:\d\d/);
  await expect(text).toHaveValue(/We'd be glad if a few parents would like to stay and help out\./);
  await expect(text).toHaveValue(/Let us know if you can't come, ideally by \w+day 14 /);
  await expect(text).not.toHaveValue(/[æøå]/i);
  await visible(page, 'invitation-siblings').click();
  await expect(text).toHaveValue(/Siblings are welcome – just let us know how many\./);
  await visible(page, 'invitation-reply-ifComing').click();
  await expect(text).toHaveValue(/Let us know if you're coming, ideally by/);
  await visible(page, 'invitation-phone').fill('90000000');
  await expect(text).toHaveValue(/Feel free to send a message to 900 00 000\./);
  await expect(visible(page, 'invitation-card')).toContainText('Please reply by');
  expect(errors).toEqual([]);
});
