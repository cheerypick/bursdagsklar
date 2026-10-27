import { expect, test, type Page } from '@playwright/test';

// Språk / Language: switch to English on the front page → setup, Planen and Handleliste are in English,
// a reload keeps English; switch back to Norsk at the foot of Planen and the plan reads Norwegian again.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
const text = (page: Page, s: string | RegExp) => page.getByText(s).filter({ visible: true }).first();

test('switch to English and back: front page, a setup step, Planen and Handleliste; reload keeps it', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  // Norwegian by default (the device locale here is nb-NO)
  await expect(text(page, 'Hele bursdagen, klar.')).toBeVisible();
  await visible(page, 'language-en').click();
  await expect(text(page, 'The whole birthday, sorted.')).toBeVisible();
  await expect(visible(page, 'start')).toContainText('Plan the birthday');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  // reload on the front page: still English, no Norwegian flash needed to get there
  await page.reload();
  await expect(text(page, 'The whole birthday, sorted.')).toBeVisible();

  // setup in English: who → when (English calendar) → how many → where
  await visible(page, 'start').click();
  await expect(text(page, 'Step 1 of 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: "Who's having a birthday?" }).filter({ visible: true })).toBeVisible();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, 'age-5').click();
  await visible(page, 'next').click();
  await expect(page.getByRole('heading', { name: 'When is the party?' }).filter({ visible: true })).toBeVisible();
  const cal = visible(page, 'calendar');
  await expect(cal).toContainText(/Mo\s*Tu\s*We\s*Th\s*Fr\s*Sa\s*Su/);
  await expect(visible(page, 'calendar-month')).toHaveText(
    /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/,
  );
  await visible(page, 'calendar-next').click();
  await visible(page, 'calendar-grid')
    .getByRole('button', { name: /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) 15 / })
    .click();
  await expect(visible(page, 'next')).toContainText('Next');
  await visible(page, 'next').click();
  await expect(
    page.getByRole('heading', { name: 'How many children are coming?' }).filter({ visible: true }),
  ).toBeVisible();
  await visible(page, 'next').click();
  await visible(page, 'place-hus').click();
  await visible(page, 'next').click();
  await expect(visible(page, 'screen-ready')).toContainText("Emma's party is ready.");
  await visible(page, 'see-plan').click();

  // Planen in English
  await expect(visible(page, 'plan-hero')).toContainText("Emma's 5th birthday");
  await expect(text(page, 'Everything for the party')).toBeVisible();
  await expect(visible(page, 'plan-card-food')).toContainText('Food');

  // Mat → grill sausages, then Handleliste in English
  await visible(page, 'plan-card-food').click();
  await visible(page, 'menu-card-polser').click();
  await visible(page, 'menu-how-grillpolser').getByRole('button').click();
  await expect(visible(page, 'menu-chosen-title')).toHaveText('Grill sausages');
  await page.waitForTimeout(600); // the app saves 300 ms after a change
  await page.goto('/plan');
  await expect(visible(page, 'plan-card-shopping')).toContainText('Shopping list');
  await visible(page, 'plan-card-shopping').click();
  await expect(visible(page, 'screen-shopping')).toBeVisible();
  await expect(text(page, 'Meat and cold cuts')).toBeVisible();
  await expect(visible(page, 'shop-item-grillpolser')).toContainText('Grill sausages');
  await expect(visible(page, 'shop-item-grillpolser')).toContainText('5 packs');

  // a reload keeps English
  await page.reload();
  await expect(text(page, 'Meat and cold cuts')).toBeVisible();

  // back to Norsk at the foot of Planen
  await page.goto('/plan');
  await expect(visible(page, 'plan-hero')).toContainText("Emma's 5th birthday");
  await visible(page, 'language-nb').click();
  await expect(visible(page, 'plan-hero')).toContainText('Emmas 5-årsdag');
  await expect(text(page, 'Alt til festen')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'nb');
  await page.reload();
  await expect(visible(page, 'plan-hero')).toContainText('Emmas 5-årsdag');
  expect(errors).toEqual([]);
});
