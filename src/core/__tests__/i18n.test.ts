import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { i18n } from '../../i18n/i18n';
import { defaultPartyTime } from '../rules/partyTime';
import { formatLong, formatRange, formatRangeCompact } from '../rules/dates';
import { dayLabel, monthTitle, weekdayHeaders } from '../rules/calendar';
import { foodCardSummary, foodPlan, partyFoodPlan } from '../rules/menu';
import { handleliste, shoppingCardLine } from '../rules/shopping';
import { buildTasks, groupTasks } from '../rules/todos';
import { planTitle, readyTitle, summarize, withMenu } from '../party';
import { invitationCard } from '../texts/render';
import { themeById, licenseDisclaimer } from '../themes';
import type { MenuChoice } from '../model';

/**
 * The same rules in both languages (Ekaterina, 21 Oct 2026): core returns text through the shared
 * i18next instance, so switching the language changes every word and no number.
 */
const inLanguage = (lng: 'nb' | 'en', f: () => void) => {
  void i18n.changeLanguage(lng);
  try {
    f();
  } finally {
    void i18n.changeLanguage('nb');
  }
};

const emmaPlan = (menu: MenuChoice) =>
  foodPlan({ menu, counts: { kids: 13, adults: 4 }, age: 5, diets: [], celebrants: 1 });
const line = (plan: ReturnType<typeof foodPlan>, id: string) =>
  plan.sections.flatMap((s) => s.lines).find((l) => l.id === id)!;

describe('core rules in nb and en', () => {
  beforeEach(() => void i18n.changeLanguage('nb'));
  afterEach(() => void i18n.changeLanguage('nb'));

  it('the time reason: weekday and weekend, both languages', () => {
    expect(defaultPartyTime(5, false).why).toBe('etter barnehagen – passer fint rundt middag');
    expect(defaultPartyTime(8, true).why).toBe('etter lunsj, før middag');
    inLanguage('en', () => {
      expect(defaultPartyTime(5, false).why).toBe('after kindergarten – fits nicely around dinner');
      expect(defaultPartyTime(8, true).why).toBe('after lunch, before dinner');
      expect(defaultPartyTime(5, true).why).toBe('middle of the day – fits nicely around lunch');
      expect(defaultPartyTime(8, false).why).toBe('after school – fits nicely around dinner');
      // the time itself never changes with the language
      expect(defaultPartyTime(5, true)).toMatchObject({ start: '12:00', end: '14:00' });
    });
  });

  it('grill sausages for Emma: same numbers, words in the language', () => {
    const nb = line(emmaPlan({ kind: 'grillpolser' }), 'grillpolser');
    expect(nb.why).toBe(
      '13 barn × 3 + 4 voksne × 2 = 47. 5 pk Gilde Grillpølser à 10 = 50, eller 1 storpakning (3 × 10) og 2 pk',
    );
    inLanguage('en', () => {
      const plan = emmaPlan({ kind: 'grillpolser' });
      expect(plan.forWhom).toBe('for 13 kids and 4 adults');
      const en = line(plan, 'grillpolser');
      expect(en.name).toBe('Grill sausages');
      expect(en.packs).toBe('5 packs of 10');
      expect(en.why).toBe(
        '13 kids × 3 + 4 adults × 2 = 47. 5 × Gilde Grillpølser (10 each) = 50, or 1 big pack (3 × 10) and 2 more',
      );
      expect(line(plan, 'lomper').why).toMatch(/^About 30 of each – some like lompe, some a bun/);
    });
  });

  it('pre-baked pizza bases: «13 barn ÷ 4 + 4 voksne ÷ 2 = 6 bunner» / «13 kids ÷ 4 + 4 adults ÷ 2 = 6 bases»', () => {
    const menu: MenuChoice = { kind: 'pizza', style: 'hjemmelaget', dough: 'ferdigstekt' };
    expect(line(emmaPlan(menu), 'langpanner').why).toBe('13 barn ÷ 4 + 4 voksne ÷ 2 = 6 bunner, rundet opp. 3 pk à 2');
    inLanguage('en', () => {
      expect(line(emmaPlan(menu), 'langpanner').why).toBe(
        '13 kids ÷ 4 + 4 adults ÷ 2 = 6 bases, rounded up. 3 packs of 2',
      );
    });
  });

  it('drinks: «jus» in Norwegian, «juice» in English, numbers in the locale', () => {
    const nb = line(emmaPlan({ kind: 'taco' }), 'saft');
    expect(nb.why).toContain('Jus i stedet');
    expect(nb.why).toMatch(/\d,\d liter/);
    inLanguage('en', () => {
      const en = line(emmaPlan({ kind: 'taco' }), 'saft');
      expect(en.name).toBe('Cordial or juice');
      expect(en.why).toContain('Juice instead');
      expect(en.why).toMatch(/\d\.\d litres/);
    });
  });

  it('plurals in both languages (one adult, one bag)', () => {
    const plan = foodPlan({
      menu: { kind: 'grillpolser' },
      counts: { kids: 1, adults: 1 },
      age: 5,
      diets: [],
      celebrants: 1,
    });
    expect(plan.forWhom).toBe('for 1 barn og 1 voksen');
    inLanguage('en', () => {
      const p = foodPlan({
        menu: { kind: 'grillpolser' },
        counts: { kids: 1, adults: 1 },
        age: 5,
        diets: [],
        celebrants: 1,
      });
      expect(p.forWhom).toBe('for 1 kid and 1 adult');
      expect(line(p, 'lok').amount).toBe('1 bag');
    });
  });

  it('dates: our own calendar in English month and day names', () => {
    expect(formatLong('2026-11-07')).toBe('lørdag 7. november');
    expect(monthTitle({ y: 2026, m: 11 })).toBe('November 2026');
    inLanguage('en', () => {
      expect(formatLong('2026-11-07')).toBe('Saturday 7 November');
      expect(monthTitle({ y: 2026, m: 11 })).toBe('November 2026');
      expect(monthTitle({ y: 2026, m: 10 })).toBe('October 2026');
      expect(dayLabel('2026-11-11')).toBe('Wednesday 11 November 2026');
      expect(weekdayHeaders()).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
      expect(formatRange('17:00', '19:00')).toBe('17:00–19:00');
      expect(formatRangeCompact('12:00', '14:00')).toBe('12:00–14:00');
    });
    expect(monthTitle({ y: 2026, m: 10 })).toBe('Oktober 2026');
    expect(formatRangeCompact('12:00', '14:00')).toBe('12–14');
  });

  it('Planen, Handleliste, to-dos and the invitation card switch language', () => {
    const p = withMenu(emma(), { kind: 'grillpolser' });
    const nbList = handleliste(p);
    inLanguage('en', () => {
      expect(planTitle(p)).toBe("Emma's 5th birthday");
      expect(readyTitle(p)).toBe("Emma's party is ready.");
      const list = handleliste(p);
      expect(list.title).toMatch(/^Shopping list – Emma's birthday \d+ [A-Z][a-z]{2}$/);
      expect(list.groups.map((g) => g.title)).toContain('Meat and cold cuts');
      // the same items (ids) in both languages: only the words change
      expect(list.groups.flatMap((g) => g.items.map((i) => i.id))).toEqual(
        nbList.groups.flatMap((g) => g.items.map((i) => i.id)),
      );
      const sausages = list.groups.flatMap((g) => g.items).find((i) => i.id === 'grillpolser')!;
      expect(sausages).toMatchObject({
        qty: '5 packs',
        detail: '10 each, 50 in total',
        text: '5 packs grill sausages',
      });
      expect(shoppingCardLine({ count: 1, tickedCount: 0 })).toBe('1 item');
      expect(foodCardSummary(p)!.line).toBe(
        '50 grill sausages with lompe and hot dog buns · 2 bottles of cordial · for 13 kids and 4 adults',
      );
      const { tasks } = buildTasks(p);
      expect(tasks.find((t) => t.id === 'sendInvite')!.title).toBe('Send the invitation');
      expect(groupTasks(p, tasks, p.plannedFrom).map((g) => g.title)).toContain('Party week');
      expect(summarize(p, p.plannedFrom).progressLine).toMatch(/^\d+ of \d+ to-dos done\./);
      expect(invitationCard(p).rsvp).toMatch(/^Please reply by \d+ [A-Z]/);
      expect(themeById('frost').name).toBe('Frozen');
      expect(licenseDisclaimer()).toBe(
        'Bursdagsklar is not affiliated with Disney, Spin Master or The Pokémon Company.',
      );
    });
    // and back: nothing English is left behind
    expect(planTitle(p)).toBe('Emmas 5-årsdag');
    expect(themeById('frost').name).toBe('Frost');
    expect(partyFoodPlan(p)!.title).toBe('Grillpølser');
  });
});
