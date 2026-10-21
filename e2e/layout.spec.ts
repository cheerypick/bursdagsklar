import { expect, test, type Page } from '@playwright/test';

// iPhone Safari with its toolbars showing leaves a short screen (≈ 390 × 664). On the setup steps
// the question, the input and the big «Neste» must fit on that screen, and «Neste» must never
// cover the content: the scroll area ends where the footer begins.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });

test.beforeEach(() => {
  test.skip(test.info().project.name.includes('desktop'), 'phone layout only (desktop keeps «Neste» inline)');
});

/** Distance «Neste» overlaps the scroll area (≤ 0 = clear) and how far the content overflows it. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const shown = (el: Element) => (el as HTMLElement).offsetParent !== null;
    const next = [...document.querySelectorAll('[data-testid="next"]')].find(shown);
    const scroller = [...document.querySelectorAll('div')]
      .filter((d) => shown(d) && ['auto', 'scroll'].includes(getComputedStyle(d).overflowY))
      .pop();
    if (!next || !scroller) return null;
    return {
      overlap: scroller.getBoundingClientRect().bottom - next.getBoundingClientRect().top,
      overflow: scroller.scrollHeight - scroller.clientHeight,
    };
  });
}

async function expectNextClearOfContent(page: Page) {
  const m = await measure(page);
  expect(m).not.toBeNull();
  expect(m!.overlap).toBeLessThanOrEqual(0);
}

async function toDateStep(page: Page) {
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Emma');
  await visible(page, 'age-5').click();
  await expectNextClearOfContent(page);
  await visible(page, 'next').click();
  await expect(page.getByText('Steg 2 av 4').filter({ visible: true })).toBeVisible();
}

/** Page forward to the first month that needs six week rows (the tallest calendar). */
async function toSixWeekMonth(page: Page) {
  const rows = () => visible(page, 'calendar-grid').evaluate((el) => el.childElementCount);
  for (let i = 0; i < 12 && (await rows()) < 6; i++) await visible(page, 'calendar-next').click();
  expect(await rows()).toBe(6);
}

for (const height of [664, 750]) {
  test.describe(`390 × ${height}`, () => {
    test.use({ viewport: { width: 390, height } });

    test('date step: the whole six-week calendar and «Neste» fit on one screen', async ({ page }) => {
      await toDateStep(page);
      await toSixWeekMonth(page);
      const m = (await measure(page))!;
      expect(m.overlap).toBeLessThanOrEqual(0);
      expect(m.overflow).toBeLessThanOrEqual(1); // no scrolling needed

      const last = page.locator('[data-testid^="day-"]').filter({ visible: true }).last();
      const next = visible(page, 'next');
      await expect(last).toBeInViewport({ ratio: 1 });
      await expect(next).toBeInViewport({ ratio: 1 });
      const dayBox = (await last.boundingBox())!;
      const nextBox = (await next.boundingBox())!;
      expect(dayBox.y + dayBox.height).toBeLessThanOrEqual(nextBox.y);

      // a real tap lands on the last day (not on the footer), and «Neste» unlocks
      await last.click();
      await expect(last).toHaveAttribute('aria-pressed', 'true');
      await expect(next).toBeEnabled();
      await expect(next).toBeInViewport({ ratio: 1 });
      // the time below the calendar is reachable by scrolling, still clear of «Neste»
      await visible(page, 'party-time').scrollIntoViewIfNeeded();
      const timeBox = (await visible(page, 'party-time').boundingBox())!;
      expect(timeBox.y + timeBox.height).toBeLessThanOrEqual((await next.boundingBox())!.y);
      await expectNextClearOfContent(page);
    });

    test('every setup step keeps its content clear of «Neste»', async ({ page }) => {
      await toDateStep(page);
      await expectNextClearOfContent(page);
      await page.locator('[data-testid^="day-"]').filter({ visible: true }).last().click();
      await visible(page, 'next').click();
      await expect(page.getByText('Steg 3 av 4').filter({ visible: true })).toBeVisible();
      await expectNextClearOfContent(page);
      await visible(page, 'next').click();
      await expect(page.getByText('Steg 4 av 4').filter({ visible: true })).toBeVisible();
      await expectNextClearOfContent(page);
      await expect(visible(page, 'next')).toBeInViewport();
    });
  });
}

test.describe('landing page on a short phone', () => {
  for (const height of [664, 750]) {
    test(`390 × ${height}: the whole «Planlegg bursdagen» button is on screen without scrolling`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height });
      await page.goto('/');
      const cta = visible(page, 'start');
      await expect(cta).toBeInViewport({ ratio: 1 });
      const box = (await cta.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      // the photo is still there, just shorter
      const img = page.getByRole('img', { name: /./ }).filter({ visible: true }).first();
      expect((await img.boundingBox())!.height).toBeGreaterThanOrEqual(240);
    });
  }
});
