import { expect, test, type Page } from '@playwright/test';

// «Endre festen» (Ekaterina, 30 Oct 2026): change the setup answers from Planen without losing anything.
// Emma (5), the 15th next month, 12 children, a house; Pølser on Mat, one to-do ticked and her own invitation
// text. Then «Endre festen»: the 20th, 16 children and a second birthday child (Jonas, 7). Planen, Mat and
// Handleliste follow, the ticked to-do stays ticked, and Invitasjon keeps her text with a soft hint.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
const SHOTS = process.env.ENDRE_SHOTS;

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

/** the app saves 300 ms after a change: let it land before leaving the page */
async function go(page: Page, path: string) {
  await page.waitForTimeout(600);
  await page.goto(path);
}

const todoBox = (page: Page, done: boolean) =>
  page
    .getByRole('checkbox', {
      name: new RegExp(`^Marker som ${done ? 'ikke ' : ''}gjort: Skriv ut invitasjonskortene$`),
    })
    .filter({ visible: true });

test('Endre festen: date, children and a second birthday child; everything follows, ticks and her text stay', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);

  // before: Pølser on Mat (12 children), one ticked to-do, her own invitation text
  await visible(page, 'plan-card-food').click();
  await visible(page, 'menu-card-polser').click();
  await visible(page, 'menu-how-grillpolser').getByRole('button').click();
  await expect(visible(page, 'food-for-whom')).toHaveText(/^For 12 barn og \d+ voksne$/);
  await go(page, '/handleliste');
  const sausagesBefore = await visible(page, 'shop-qty-grillpolser').textContent();
  await go(page, '/gjoremal');
  await todoBox(page, false).click();
  await expect(todoBox(page, true)).toHaveCount(1);
  await go(page, '/invitasjon');
  await visible(page, 'invitation-text').fill('Hei! Emma fyller 5 år. Velkommen til fest hos oss!');
  await expect(visible(page, 'invitation-edited')).toBeVisible();
  await expect(visible(page, 'invitation-update-hint')).toHaveCount(0);

  // Planen: the entry sits in the party header
  await go(page, '/plan');
  const entry = visible(page, 'edit-party');
  await expect(entry).toHaveText('Endre festen');
  await expect(entry).toBeInViewport();
  await expect(visible(page, 'plan-meta')).toContainText('15.');
  await expect(visible(page, 'plan-meta')).toContainText('12 barn');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}-planen.png` });
  await entry.click();

  // the edit screen: the setup controls, prefilled
  await expect(visible(page, 'screen-edit-party')).toBeVisible();
  await expect(visible(page, 'name-input')).toHaveValue('Emma');
  await expect(visible(page, 'age-5')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'kids-count-value')).toHaveText('12');
  await expect(visible(page, 'place-hus')).toHaveAttribute('aria-checked', 'true');
  await expect(visible(page, 'date-card')).toContainText('15.');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}-skjema.png` });

  // a second birthday child: saving waits softly until Jonas has a name and an age
  await visible(page, 'add-child').click();
  await expect(visible(page, 'edit-party-incomplete')).toBeVisible();
  await expect(visible(page, 'edit-party-save')).toBeDisabled();
  await visible(page, 'name-input-2').fill('Jonas');
  await visible(page, 'age-2-7').click();
  await expect(visible(page, 'edit-party-incomplete')).toHaveCount(0);

  // the date: our own calendar opens on the party's month
  await visible(page, 'date-card').click();
  await visible(page, 'calendar-grid')
    .getByRole('button', { name: /^(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag) 20\. / })
    .click();
  await expect(visible(page, 'date-card')).toContainText('20.');
  // her time stays (it does not jump to a weekday/weekend default)
  const time = await visible(page, 'party-time').textContent();
  // 16 children in total
  for (let i = 0; i < 4; i++) await visible(page, 'kids-count-more').click();
  await expect(visible(page, 'kids-count-value')).toHaveText('16');
  await expect(visible(page, 'party-time')).toHaveText(time!);

  await visible(page, 'edit-party-save').click();
  await expect(visible(page, 'screen-plan')).toBeVisible();
  await expect(visible(page, 'plan-title')).toContainText('Emma og Jonas');
  await expect(visible(page, 'plan-meta')).toContainText('20.');
  await expect(visible(page, 'plan-meta')).toContainText('16 barn');

  // Mat and Handleliste follow the new number
  await go(page, '/mat');
  await expect(visible(page, 'food-for-whom')).toHaveText(/^For 16 barn og \d+ voksne$/);
  await go(page, '/handleliste');
  await expect(visible(page, 'shop-qty-grillpolser')).not.toHaveText(sausagesBefore!);

  // the ticked to-do is still ticked (also after a reload)
  await go(page, '/gjoremal');
  await expect(todoBox(page, true)).toHaveCount(1);

  // Invitasjon: her text is kept, with a soft hint to update it
  await go(page, '/invitasjon');
  await expect(visible(page, 'invitation-text')).toHaveValue('Hei! Emma fyller 5 år. Velkommen til fest hos oss!');
  await expect(visible(page, 'invitation-update-hint-text')).toHaveText(
    'Du har endret datoen og navn eller alder. Vil du oppdatere teksten?',
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}-hint.png` });
  await visible(page, 'invitation-update-hint-update').click();
  await expect(visible(page, 'invitation-update-hint')).toHaveCount(0);
  await expect(visible(page, 'invitation-text')).toHaveValue(/Emma og Jonas/);
  await expect(visible(page, 'invitation-text')).toHaveValue(/20\./);
  expect(errors).toEqual([]);
});

test('Endre festen: «Avbryt» changes nothing; «Behold teksten min» keeps her text and hides the hint', async ({
  page,
}) => {
  await createParty(page);
  await visible(page, 'edit-party').click();
  for (let i = 0; i < 3; i++) await visible(page, 'kids-count-more').click();
  await expect(visible(page, 'kids-count-value')).toHaveText('15');
  await visible(page, 'edit-party-cancel').click();
  await expect(visible(page, 'plan-meta')).toContainText('12 barn');

  // her own text, then a new time
  await go(page, '/invitasjon');
  await visible(page, 'invitation-text').fill('Vår egen tekst');
  await go(page, '/plan');
  await visible(page, 'edit-party').click();
  await page
    .getByRole('button', { name: /^Endre klokkeslett$/ })
    .filter({ visible: true })
    .click();
  await page
    .getByRole('button', { name: /^Start 15 minutter senere$/ })
    .filter({ visible: true })
    .click();
  await visible(page, 'edit-party-save').click();
  await expect(visible(page, 'screen-plan')).toBeVisible();
  await go(page, '/invitasjon');
  await expect(visible(page, 'invitation-update-hint-text')).toHaveText(
    'Du har endret klokkeslettet. Vil du oppdatere teksten?',
  );
  await visible(page, 'invitation-update-hint-keep').click();
  await expect(visible(page, 'invitation-update-hint')).toHaveCount(0);
  await expect(visible(page, 'invitation-text')).toHaveValue('Vår egen tekst');
  await page.waitForTimeout(600);
  await page.reload();
  await expect(visible(page, 'invitation-text')).toHaveValue('Vår egen tekst');
  await expect(visible(page, 'invitation-update-hint')).toHaveCount(0);
});

test('Endre festen in English', async ({ page }) => {
  await createParty(page);
  // the language picker sits at the foot of Planen
  await visible(page, 'language-en').click();
  await expect(visible(page, 'edit-party')).toHaveText('Edit party');
  await visible(page, 'edit-party').click();
  await expect(visible(page, 'screen-edit-party')).toContainText('Edit the party');
  await expect(visible(page, 'edit-party-save')).toHaveText('Save changes');
});
