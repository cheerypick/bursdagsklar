/// <reference types="node" />
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { i18n } from '../../i18n/i18n';
import type { Party, Task } from '../model';
import { buildTasks } from '../rules/todos';
import { isReminderSection } from '../rules/reminders';

/**
 * Ekaterina, 30 Oct 2026: «Double check … that we don't have any blind to do buttons». Every to-do link
 * must open a screen that exists, and a to-do that says its text is «skrevet / ferdig skrevet» must link
 * to the place where that text is shown.
 */
const APP = fileURLToPath(new URL('../../app', import.meta.url));

/** «/paminnelser?m=svar» → src/app/paminnelser.tsx (or …/index.tsx). */
function routeFile(route: string): string | null {
  const path = route.split(/[?#]/)[0].replace(/^\//, '');
  for (const f of [`${path}.tsx`, join(path, 'index.tsx')]) if (existsSync(join(APP, f))) return f;
  return null;
}

/** Where a written text is actually shown: the invitation text on Invitasjon, the reminders on Påminnelser. */
function showsWrittenText(route: string): boolean {
  const [path, query = ''] = route.split('?');
  if (path === '/invitasjon') return true;
  if (path === '/paminnelser') return isReminderSection(new URLSearchParams(query).get('m'));
  return false;
}

/** Parties that between them switch on every to-do the rules know. */
const parties: Party[] = [
  emma(),
  emma({ plannedFrom: '2026-11-02', programme: { activities: ['pinata', 'fiskedam', 'fotojakt'] } }),
  emma({
    celebrants: [{ id: 'c1', name: 'Emma', age: 8 }],
    programme: { activities: ['skattejakt', 'pinata', 'fiskedam', 'fotojakt'] },
  }),
  emma({ menu: { kind: 'pizza', style: 'hjemmelaget' }, cake: { mode: 'buy', kind: 'buy' } as Party['cake'] }),
  emma({ menu: { kind: 'pizza', style: 'bestilt', takeawaySize: '40' }, haveAtHome: ['saftdispenser'] }),
  emma({
    menu: { kind: 'flere', dishes: [{ kind: 'grillpolser' }, { kind: 'pizza', style: 'frossen' }] },
    cake: { mode: 'bake', cakeId: 'vaniljekake-langpanne', muffins: true, kind: 'muffins' } as Party['cake'],
  }),
];

afterEach(async () => {
  await i18n.changeLanguage('nb');
});

describe('to-do links (no blind buttons)', () => {
  for (const lng of ['nb', 'en'] as const) {
    it(`${lng}: every link opens a route that exists in src/app`, async () => {
      await i18n.changeLanguage(lng);
      const seen = new Map<string, Task>();
      for (const p of parties) for (const task of buildTasks(p).tasks) seen.set(task.id, task);
      const broken = [...seen.values()].filter((x) => x.link && !routeFile(x.link.route)).map((x) => x.id);
      expect(broken).toEqual([]);
      // every link has words on it
      expect([...seen.values()].filter((x) => x.link && !x.link.label.trim()).map((x) => x.id)).toEqual([]);
    });

    it(`${lng}: a to-do that says its text is written links to where the text is`, async () => {
      await i18n.changeLanguage(lng);
      // «så første brett er klart rundt kl. 15» (Festdagen's clock times) is about food, not a written text
      const claims = lng === 'nb' ? /skrevet|er klar(?!t?\s+rundt)/i : /written|is ready(?!\s+around)/i;
      const bad: string[] = [];
      let checked = 0;
      for (const p of parties)
        for (const task of buildTasks(p).tasks) {
          if (!claims.test(`${task.title} ${task.detail ?? ''}`)) continue;
          checked++;
          if (!task.link || !showsWrittenText(task.link.route)) bad.push(task.id);
        }
      expect(bad).toEqual([]);
      expect(checked).toBeGreaterThanOrEqual(4); // sendInvite, rsvpReminder, partyReminder, thanks
    });
  }

  it('the parties above reach every to-do with a promise or a natural place to go', () => {
    const ids = new Set(parties.flatMap((p) => buildTasks(p).tasks.map((x) => x.id)));
    for (const id of [
      'rsvpReminder',
      'partyReminder',
      'thanks',
      'orderPinata',
      'buyPinata',
      'rsvpDeadline',
      'orderPizza',
      'checkGrill',
      'borrowDispenser',
    ])
      expect(ids).toContain(id);
  });

  it('the reminders, the piñata, the svarfrist and ordered pizza now link somewhere useful', () => {
    const tasks = new Map(
      parties.flatMap((p) => buildTasks(p).tasks).map((x) => [x.id, x.link?.route ?? null] as const),
    );
    expect(tasks.get('rsvpReminder')).toBe('/paminnelser?m=svar');
    expect(tasks.get('partyReminder')).toBe('/paminnelser?m=fest');
    expect(tasks.get('thanks')).toBe('/paminnelser?m=takk');
    expect(tasks.get('orderPinata')).toBe('/program');
    expect(tasks.get('buyPinata')).toBe('/program');
    expect(tasks.get('rsvpDeadline')).toBe('/gjesteliste');
    expect(tasks.get('orderPizza')).toBe('/mat');
  });

  it('no weekend in the to-do words (a party can be any day)', () => {
    const words = parties
      .flatMap((p) => buildTasks(p).tasks)
      .map((x) => `${x.title} ${x.detail ?? ''}`)
      .join(' ');
    expect(words).not.toMatch(/fredag|lørdag|søndag|helg/i);
  });
});
