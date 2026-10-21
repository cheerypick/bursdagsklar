import { expect, test, type Page } from '@playwright/test';

// Long names (joint birthdays) wrap onto more lines and step down in size; they are never cut off with
// «…». Ekaterina's screenshot showed «Gustav og Pia Hel…» on the invitation card.
const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true });
const FULL = 'Ingrid Alexandra og Matteo Federico';

async function notClipped(page: Page, testId: string) {
  const el = visible(page, testId);
  await expect(el).toBeVisible();
  const m = await el.evaluate((node) => {
    const e = node as HTMLElement;
    const cs = getComputedStyle(e);
    return {
      text: (e.innerText || '').replace(/\s+/g, ' ').trim(),
      sw: e.scrollWidth,
      cw: e.clientWidth,
      sh: e.scrollHeight,
      ch: e.clientHeight,
      overflow: cs.textOverflow,
      overflowY: cs.overflowY,
      clamp: cs.webkitLineClamp,
    };
  });
  expect(m.text).toContain(FULL);
  expect(m.text).not.toContain('…');
  expect(m.overflow).not.toBe('ellipsis');
  expect(m.clamp === 'none' || m.clamp === '' || m.clamp === undefined).toBe(true);
  expect(m.sw).toBeLessThanOrEqual(m.cw + 1);
  // taller than its box only matters when the box hides the overflow (a tight line-height lets glyphs
  // reach a pixel or two past it without anything being cut)
  if (m.overflowY === 'hidden' || m.overflowY === 'clip') expect(m.sh).toBeLessThanOrEqual(m.ch + 1);
}

test('long names: the full names show on the invitation card, Festen er klar and Planen, at 390 and 320 px', async ({
  page,
}) => {
  await page.goto('/');
  await visible(page, 'start').click();
  await visible(page, 'name-input').fill('Ingrid Alexandra');
  await visible(page, 'age-5').click();
  await visible(page, 'add-child').click();
  await visible(page, 'name-input-2').fill('Matteo Federico');
  await visible(page, 'age-2-7').click();
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
  await expect(visible(page, 'screen-ready')).toBeVisible();

  const width = page.viewportSize()!.width;
  for (const w of width < 768 ? [width, 320] : [width]) {
    await page.setViewportSize({ width: w, height: 800 });
    await notClipped(page, 'invitation-name');
    await notClipped(page, 'ready-title');
  }
  await page.setViewportSize({ width, height: 844 });
  await visible(page, 'see-plan').click();
  for (const w of width < 768 ? [width, 320] : [width]) {
    await page.setViewportSize({ width: w, height: 800 });
    await notClipped(page, 'plan-title');
  }
});
