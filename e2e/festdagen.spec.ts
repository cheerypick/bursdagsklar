import { expect, test, type Page } from '@playwright/test';

// Festdagen (the «Festdagen» tab): the party day read from the plan. Header with names, date and time; the
// checklist for the day shares its ticks with Gjøremål; the day step by step with the picked games' rules;
// allergies and notes; quick links. No «Kommer snart» left.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
/** The main navigation: bottom tabs on phones, the top bar on wide screens. */
const tab = (page: Page, name: string) =>
  page.getByRole('navigation').filter({ visible: true }).getByLabel(name, { exact: true }).first();

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

async function openDay(page: Page) {
  await tab(page, 'Festdagen').click();
  await expect(visible(page, 'screen-day')).toBeVisible();
}

test('Festdagen: header, checklist shared with Gjøremål, the day step by step, links', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await createParty(page);
  await openDay(page);
  await expect(page.getByText('Kommer snart')).toHaveCount(0);

  // header: names + age, date, time span
  await expect(visible(page, 'day-title')).toHaveText('Emmas 5-årsdag');
  await expect(visible(page, 'day-meta')).toContainText(/15\. .* · kl\. \d/);
  await expect(visible(page, 'day-eyebrow')).toContainText('Festdagen');

  // the day step by step: arrival … cake and song … pickup; no games picked → a soft link to Program
  const steps = visible(page, 'day-steps');
  await expect(steps).toContainText('Gjestene kommer');
  await expect(steps).toContainText('Kake og bursdagssang');
  await expect(visible(page, 'day-step-pickup')).toContainText('foreldrene henter');
  await expect(visible(page, 'day-no-activities')).toBeVisible();

  // allergies: nothing noted yet, a soft way to the guest list
  await expect(visible(page, 'day-notes')).toContainText('Ingen notater ennå');

  // the checklist: the cake job (Toro by default) — tick it here …
  const cake = visible(page, 'day-check-dayCake');
  await expect(cake).toContainText('Finn fram kaken, kakelys og fyrstikker');
  await expect(cake).toContainText(/ca\. \d+\.\d\d/);
  const toggle = visible(page, 'day-check-dayCake-toggle');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  // … and it is ticked in Gjøremål too; untick it there …
  await tab(page, 'Gjøremål').click();
  await expect(visible(page, 'screen-todo')).toBeVisible();
  const inTodo = page
    .getByRole('checkbox', { name: /^Marker som ikke gjort: Finn fram kaken, kakelys og fyrstikker$/ })
    .filter({ visible: true });
  await expect(inTodo).toBeVisible();
  await inTodo.click();
  // … and it is unticked on Festdagen
  await openDay(page);
  await expect(visible(page, 'day-check-dayCake-toggle')).toHaveAttribute('aria-checked', 'false');

  // the shopping list link counts what is left
  await expect(visible(page, 'day-link-shopping-line')).toContainText(/igjen å kjøpe|Lista fylles/);

  // pick skattejakt on Program: it shows up in the day with its rules, and its job is on the checklist
  await visible(page, 'day-to-programme').click();
  await expect(visible(page, 'screen-program')).toBeVisible();
  await visible(page, 'activity-skattejakt-pick').click();
  await openDay(page);
  await expect(visible(page, 'day-no-activities')).toHaveCount(0);
  await visible(page, 'day-step-skattejakt-rules').click();
  await expect(visible(page, 'day-step-skattejakt-rules-view')).toContainText('1');
  await expect(visible(page, 'day-check-hideTreasure')).toBeVisible();
  await expect(visible(page, 'day-check-dayActivities')).toBeVisible();

  expect(errors).toEqual([]);
});
