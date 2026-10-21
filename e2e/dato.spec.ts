import { expect, test, type Page } from '@playwright/test';

// The soft note under the time on the date step looks at the time of day, not only the date.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

async function toDateStep(page: Page, now: string, age = 5) {
  await page.clock.setFixedTime(new Date(now));
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, `age-${age}`).click();
  await visible(page, 'next').click();
  await expect(page.getByText('Steg 2 av 4').filter({ visible: true })).toBeVisible();
}

test('today at 21.01: the suggested 17.00 has been, so no «det går», and «Neste» still works', async ({ page }) => {
  await toDateStep(page, '2026-10-21T19:01:00Z'); // Wednesday 21.01 in Oslo
  await visible(page, 'day-2026-10-21').click();
  await expect(visible(page, 'party-time')).toContainText('17.00');
  const note = visible(page, 'date-notice');
  await expect(note).toHaveText(/Tidspunktet har allerede vært i dag/);
  await expect(note).not.toHaveText(/det går/);
  await expect(visible(page, 'next')).toBeEnabled();
});

test('today at 10.00: short notice, but it works', async ({ page }) => {
  await toDateStep(page, '2026-10-21T08:00:00Z'); // 10.00 in Oslo
  await visible(page, 'day-2026-10-21').click();
  await expect(visible(page, 'date-notice')).toHaveText(/Det er kort tid, men det går/);
});

test('tomorrow late in the evening: short notice as before', async ({ page }) => {
  await toDateStep(page, '2026-10-21T19:01:00Z');
  await visible(page, 'day-2026-10-22').click();
  await expect(visible(page, 'date-notice')).toHaveText(/Det er kort tid, men det går/);
});

// New default times and soft tips (Ekaterina, 21 Oct 2026). Seen on Wednesday 21 October at 10.00,
// so the November days are far enough ahead for no short-notice note.
const MORNING = '2026-10-21T08:00:00Z';

test('a weekday: 17.00–19.00, dinner, and no tip', async ({ page }) => {
  await toDateStep(page, MORNING);
  await visible(page, 'calendar-next').click();
  await visible(page, 'day-2026-11-11').click(); // Wednesday
  await expect(visible(page, 'party-time')).toContainText('Kl. 17.00–19.00');
  await expect(visible(page, 'party-time')).toContainText('maten blir middag');
  await expect(visible(page, 'date-tip-busy')).toHaveCount(0);
  await expect(visible(page, 'date-tip-pickup')).toHaveCount(0);
  await expect(visible(page, 'date-notice')).toHaveCount(0);
});

test('a Saturday for a 5-year-old: 12.00–14.00 and the soft «Fredag og helg» tip', async ({ page }) => {
  await toDateStep(page, MORNING);
  await visible(page, 'calendar-next').click();
  await visible(page, 'day-2026-11-14').click(); // Saturday
  await expect(visible(page, 'party-time')).toContainText('Kl. 12.00–14.00');
  await expect(visible(page, 'party-time')).toContainText('maten blir lunsj');
  await expect(visible(page, 'date-tip-busy')).toHaveText(
    'Tips: Fredag og helg kan noen ha andre planer. Send gjerne invitasjonen tidlig.',
  );
  await expect(visible(page, 'next')).toBeEnabled();
});

test('a Saturday for an 8-year-old: 14.00–16.00', async ({ page }) => {
  await toDateStep(page, MORNING, 8);
  await visible(page, 'calendar-next').click();
  await visible(page, 'day-2026-11-14').click();
  await expect(visible(page, 'party-time')).toContainText('Kl. 14.00–16.00');
});

test('a weekday moved to 16.00: the barnehage tip, softly', async ({ page }) => {
  await toDateStep(page, MORNING);
  await visible(page, 'calendar-next').click();
  await visible(page, 'day-2026-11-11').click();
  await visible(page, 'party-time').getByRole('button', { name: 'Endre klokkeslett' }).click();
  await expect(visible(page, 'time-hint')).toHaveText('16.30 kan passe hvis dere henter hele gjengen i barnehagen.');
  const earlier = page.getByRole('button', { name: 'Start 15 minutter tidligere' }).filter({ visible: true });
  for (let i = 0; i < 4; i++) await earlier.click();
  await expect(visible(page, 'party-time')).toContainText('Kl. 16.00–19.00');
  await expect(visible(page, 'date-tip-pickup')).toHaveText(
    'Tips: Starter dere før barnehagen stenger, kan det være lurt å hente barna selv.',
  );
  await expect(visible(page, 'date-tip-busy')).toHaveCount(0);
  await expect(visible(page, 'next')).toBeEnabled();
});
