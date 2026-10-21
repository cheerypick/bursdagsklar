import { describe, expect, it } from 'vitest';
import {
  createParty,
  draftComplete,
  draftAddCelebrant,
  draftRemoveCelebrant,
  draftWithCelebrant,
  draftWithDate,
  normalizeDraft,
  planTitle,
  readyTitle,
  withTheme,
  EMPTY_DRAFT,
  type SetupDraft,
  summarize,
  withDate,
  homeItemsFor,
} from '../party';
import { createPartyRepository, memoryStore, migrate } from '../storage/PartyRepository';
import { emma } from '../__fixtures__/emma';
import { invitationCard, render, genitive, themeTexts, TEMPLATES } from '../texts/render';
import { THEMES } from '../themes';
import { buildTasks } from '../rules/todos';

const draft = {
  ...EMPTY_DRAFT,
  celebrants: [{ id: 'c1', name: ' Emma ', age: 5 }],
  date: '2026-11-07',
  dateText: '7. november',
  start: '12:00',
  end: '14:00',
  kidsInvited: 12,
  place: 'hus' as const,
};

describe('default time follows the date until the parent edits it', () => {
  const base = { ...EMPTY_DRAFT, celebrants: [{ id: 'c1', name: 'Emma', age: 5 }] };
  it('a Wednesday gets 16.30–18.30, with no weekend hint anywhere', () => {
    expect(draftWithDate(base, '2026-11-11')).toEqual({
      date: '2026-11-11',
      dateText: '2026-11-11',
      start: '16:30',
      end: '18:30',
    });
  });
  it('switching to a Saturday moves the default to 12.00–14.00, and back again', () => {
    const wed = { ...base, ...draftWithDate(base, '2026-11-11') };
    const sat = { ...wed, ...draftWithDate(wed, '2026-11-14') };
    expect([sat.start, sat.end]).toEqual(['12:00', '14:00']);
    const fri = { ...sat, ...draftWithDate(sat, '2026-11-13') };
    expect([fri.start, fri.end]).toEqual(['16:30', '18:30']);
  });
  it('a hand-set time is kept when the date or the age changes', () => {
    const edited = { ...base, date: '2026-11-11', start: '17:00', end: '19:15', timeEdited: true };
    expect(draftWithDate(edited, '2026-11-14')).toEqual({ date: '2026-11-14', dateText: '2026-11-14' });
    expect(draftWithCelebrant(edited, 'c1', { age: 7 })).toEqual({ celebrants: [{ id: 'c1', name: 'Emma', age: 7 }] });
  });
  it('picking an age before a date sets no time yet', () => {
    expect(draftWithCelebrant(EMPTY_DRAFT, 'c1', { age: 4 })).toEqual({
      celebrants: [{ id: 'c1', name: '', age: 4 }],
    });
  });
});

describe('setup: who (1–3 children), when, how many, where — no theme', () => {
  it('needs a name and age for every child, a date, a time and a place', () => {
    expect(draftComplete(EMPTY_DRAFT)).toBe(false);
    expect(draftComplete(draft)).toBe(true);
    expect(draftComplete({ ...draft, place: null })).toBe(false);
    const two: SetupDraft = { ...draft, ...draftAddCelebrant(draft) };
    expect(two.celebrants).toHaveLength(2);
    expect(draftComplete(two)).toBe(false); // the second child has no name/age yet
    expect(draftComplete({ ...two, ...draftWithCelebrant(two, 'c2', { name: 'Jonas', age: 7 }) })).toBe(true);
  });
  it('up to three children; the first one cannot be removed', () => {
    let d: SetupDraft = { ...draft };
    d = { ...d, ...draftAddCelebrant(d) };
    d = { ...d, ...draftAddCelebrant(d) };
    expect(d.celebrants.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(draftAddCelebrant(d)).toEqual({});
    expect(draftRemoveCelebrant({ ...draft }, 'c1')).toEqual({});
    d = { ...d, ...draftRemoveCelebrant(d, 'c2') };
    expect(d.celebrants.map((c) => c.id)).toEqual(['c1', 'c3']);
    expect(new Set(draftAddCelebrant(d).celebrants?.map((c) => c.id)).size).toBe(3); // ids stay unique
  });
  it('a draft saved by the old 5-step setup (name/age/theme) is upgraded; the theme is dropped', () => {
    const old = {
      name: 'Emma',
      age: 5,
      date: '2026-11-07',
      dateText: '',
      start: '12:00',
      end: '14:00',
      kidsInvited: 12,
      theme: 'frost',
    };
    const d = normalizeDraft(old);
    expect(d.celebrants).toEqual([{ id: 'c1', name: 'Emma', age: 5 }]);
    expect(d).not.toHaveProperty('theme');
    expect(d.place).toBeNull();
    // an age the app no longer plans for (1–2) is cleared, so the parent picks again
    expect(normalizeDraft({ name: 'Liv', age: 2 }).celebrants[0].age).toBeNull();
  });
});

describe('createParty', () => {
  it('builds one record with id, timestamps and schemaVersion', () => {
    const p = createParty(draft, { id: 'abc', now: '2026-10-19T08:00:00.000Z', today: '2026-10-19' });
    expect(p).toMatchObject({
      id: 'abc',
      schemaVersion: 3,
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-19T08:00:00.000Z',
      plannedFrom: '2026-10-19',
      celebrants: [{ id: 'c1', name: 'Emma', age: 5 }],
      // no theme until the parent picks one on Planen
      theme: null,
      home: { type: 'hus', garden: null },
      kidsInvited: 12,
      hostAdults: 2,
      // nothing the parent hasn't chosen: no piñata, skattejakt or muffins yet
      programme: { includePinata: false, includeSkattejakt: false },
      cake: { mode: 'bake', muffins: false },
      // no menu until the parent picks one on the Mat screen (not even a seasonal guess)
      menu: null,
      diets: [],
      foodCounts: null,
    });
  });
  it('a fresh party assumes no activity or menu the parent has not chosen', () => {
    const p = createParty(draft, { id: 'abc', now: '2026-10-19T08:00:00.000Z', today: '2026-10-19' });
    const s = summarize(p, '2026-10-19');
    expect(s.menuLine).toBe('Mat for 13 barn og 4 voksne'); // 12 invited + Emma
    expect(s.cakeLine).toBe('Bursdagskake');
    expect(s.cakeIdea).toBe('Bursdagskake i langpanne med strøssel og lys');
    expect(s.programmeLine).toBe('Program 12–14');
    const text = JSON.stringify(s) + JSON.stringify(homeItemsFor(p));
    expect(text).not.toMatch(/piñata|skattejakt|fiskedam|fiskestang|muffins/i);
    // and no theme: nothing themed in the summary, the to-dos or the invitation
    const all = text + JSON.stringify(buildTasks(p)) + JSON.stringify(invitationCard(p));
    for (const t of THEMES) expect(all).not.toContain(t.name);
    expect(invitationCard(p).headline).toBe('Bli med på bursdagsfest!');
  });
  it('choosing a theme later (Planen) changes the words, not the plan', () => {
    const p = createParty(draft, { id: 'abc', now: '2026-10-19T08:00:00.000Z', today: '2026-10-19' });
    const frost = withTheme(p, 'frost');
    expect(summarize(frost, '2026-10-19').cakeIdea).toBe('Lyseblå og hvit kake med snøkrystaller');
    expect(invitationCard(frost).headline).toBe('Bli med på Frost-fest med snø og glitter!');
    expect(buildTasks(frost).tasks.map((t) => t.id)).toEqual(buildTasks(p).tasks.map((t) => t.id));
    expect(withTheme(frost, null).theme).toBeNull();
  });
  it('changing the date re-plans from today', () => {
    const p = withDate(emma(), '2026-11-14', '2026-10-25');
    expect(p.plannedFrom).toBe('2026-10-25');
  });
});

describe('summary for «Festen er klar» and Planen (spec §10.2)', () => {
  it('Emma on Monday 19 October', () => {
    const s = summarize(emma(), '2026-10-19');
    expect(s).toMatchObject({
      daysLeft: 19,
      countdownLabel: '19 dager igjen',
      kidsComing: 13,
      adultsEating: 4,
      menuLine: 'Grillpølser for 13 barn og 4 voksne',
      cakeLine: 'Enhjørningkake og muffins',
      cakeIdea: 'Rosa og hvit kake med regnbuedryss og muffins',
      programmeLine: 'Program 12–14 med skattejakt',
      tasksThisWeek: 3,
      progressLine: '1 av 16 gjøremål er gjort. Godt i rute.',
    });
  });
  it('countdown words for tomorrow and today', () => {
    expect(summarize(emma(), '2026-11-06').countdownLabel).toBe('I morgen!');
    expect(summarize(emma(), '2026-11-07').countdownLabel).toBe('I dag!');
  });
  it('home items follow the menu', () => {
    expect(homeItemsFor(emma())).toContain('grill');
    expect(homeItemsFor(emma())).not.toContain('stor-kjele');
    expect(homeItemsFor(emma({ menu: { kind: 'wienerpolser' } }))).toContain('stor-kjele');
  });
});

describe('texts (no AI: templates only)', () => {
  it('invitation card for Emma', () => {
    expect(invitationCard(emma())).toEqual({
      headline: 'Bli med på en magisk enhjørningfest!',
      name: 'Emma',
      line: 'fyller 5',
      when: 'Lørdag 7. november kl. 12–14',
      rsvp: 'Svar innen 31. oktober',
    });
  });
  it('renderer: slots, sections and tidy spaces', () => {
    expect(
      render('Hei {barn}!{#ute} Kle dere etter været.{/ute}{^ute} Vi er inne .{/ute}', { barn: 'Emma', ute: false }),
    ).toBe('Hei Emma! Vi er inne.');
    expect(() => render('{mangler}', {})).toThrow('missing slot');
  });
  it('joint birthday: names and ages joined the Norwegian way', () => {
    const two = emma({
      celebrants: [
        { id: 'c1', name: 'Emma', age: 5 },
        { id: 'c2', name: 'Jonas', age: 7 },
      ],
    });
    expect(invitationCard(two)).toMatchObject({ name: 'Emma og Jonas', line: 'fyller 5 og 7' });
    expect(readyTitle(two)).toBe('Festen til Emma og Jonas er klar.');
    expect(planTitle(two)).toBe('Emma og Jonas fyller 5 og 7');
    expect(readyTitle(emma())).toBe('Emmas fest er klar.');
    expect(planTitle(emma())).toBe('Emmas 5-årsdag');
    const twins = emma({
      celebrants: [
        { id: 'c1', name: 'Emma', age: 5 },
        { id: 'c2', name: 'Jonas', age: 5 },
        { id: 'c3', name: 'Ali', age: 5 },
      ],
    });
    expect(planTitle(twins)).toBe('Emma, Jonas og Ali fyller 5');
    // the parent message template reads the same slots
    const msg = render(TEMPLATES.texts.gift.modes.maks.standard, { belop: '100 kr', flere: true });
    expect(msg).toBe('Vil dere gi gave, holder det godt med noe til rundt 100 kr, en gave til hver.');
    expect(render(TEMPLATES.texts.gift.modes.maks.standard, { belop: '100 kr' })).toBe(
      'Vil dere gi gave, holder det godt med noe til rundt 100 kr.',
    );
  });
  it('genitive', () => {
    expect(genitive('Emma')).toBe('Emmas');
    expect(genitive('Hans')).toBe("Hans'");
  });
  it('every theme, including Pokémon, Paw Patrol and Frost, has texts', () => {
    expect(THEMES.map((t) => t.id)).toEqual(expect.arrayContaining(['pokemon', 'paw-patrol', 'frost']));
    expect(THEMES).toHaveLength(9);
    for (const t of THEMES) {
      const tt = themeTexts(t.id);
      expect(tt.navn, t.id).toBe(t.name);
      expect(tt.fest).toBe(t.fest);
      expect(tt.apning.store.length).toBeGreaterThan(0);
    }
  });
});

describe('PartyRepository (one record per party)', () => {
  it('saves, lists, reloads and sets updatedAt', async () => {
    const store = memoryStore();
    const repo = createPartyRepository(store, () => '2026-10-19T09:00:00.000Z');
    const saved = await repo.save(emma());
    expect(saved.updatedAt).toBe('2026-10-19T09:00:00.000Z');
    await repo.setActiveId(saved.id);

    // a fresh repository on the same store = a page reload
    const again = createPartyRepository(store);
    expect(await again.getActiveId()).toBe(saved.id);
    expect(await again.get(saved.id)).toEqual(saved);
    expect((await again.list()).map((p) => p.id)).toEqual([saved.id]);
    expect(Object.keys(store.dump())).toEqual(
      expect.arrayContaining(['bursdagsklar:index', `bursdagsklar:party:${saved.id}`]),
    );
  });
  it('removes a party and clears the active id', async () => {
    const repo = createPartyRepository(memoryStore());
    const p = await repo.save(emma());
    await repo.setActiveId(p.id);
    await repo.remove(p.id);
    expect(await repo.get(p.id)).toBeNull();
    expect(await repo.getActiveId()).toBeNull();
  });
  it('keeps the unfinished setup as a draft', async () => {
    const repo = createPartyRepository(memoryStore());
    await repo.saveDraft(draft);
    expect(await repo.loadDraft()).toEqual(draft);
    await repo.saveDraft(null);
    expect(await repo.loadDraft()).toBeNull();
  });
  it('upgrades a v1 party (one child) to v3 (celebrants), keeping its theme', async () => {
    const { celebrants, diets: _d, foodCounts: _f, ...rest } = emma();
    const v1 = {
      ...rest,
      menuChosen: true,
      schemaVersion: 1,
      child: { name: celebrants[0].name, age: celebrants[0].age },
    };
    const p = migrate(v1)!;
    expect(p.schemaVersion).toBe(3);
    expect(p.celebrants).toEqual([{ id: 'c1', name: 'Emma', age: 5 }]);
    expect(p).not.toHaveProperty('child');
    expect(p.theme).toBe('enhjorning');
    expect(p).toEqual(emma());
    // a saved 1- or 2-year-old is kept inside the 3–10 the app plans for
    expect(migrate({ ...v1, child: { name: 'Liv', age: 1 } })!.celebrants[0].age).toBe(3);
    // and through the repository (what a reload does)
    const store = memoryStore();
    await store.setItem(`bursdagsklar:party:${v1.id}`, JSON.stringify(v1));
    expect((await createPartyRepository(store).get(v1.id))?.celebrants[0].name).toBe('Emma');
  });
  it('upgrades a v2 party: a pre-filled menu the parent never picked becomes «not chosen»', async () => {
    const { diets: _d, foodCounts: _f, ...rest } = emma();
    const v2 = { ...rest, schemaVersion: 2, menu: { kind: 'wienerpolser' }, menuChosen: false };
    const p = migrate(v2)!;
    expect(p).toMatchObject({ schemaVersion: 3, menu: null, diets: [], foodCounts: null });
    expect(p).not.toHaveProperty('menuChosen');
    // a menu the parent did pick survives
    expect(migrate({ ...v2, menu: { kind: 'taco' }, menuChosen: true })!.menu).toEqual({ kind: 'taco' });
    // and an old party opens fine through the repository, with no menu chosen
    const store = memoryStore();
    await store.setItem(`bursdagsklar:party:${v2.id}`, JSON.stringify(v2));
    const loaded = await createPartyRepository(store).get(v2.id);
    expect(loaded?.menu).toBeNull();
    expect(summarize(loaded!, '2026-10-19').menuLine).toBe('Mat for 13 barn og 4 voksne');
  });
  it('ignores unknown schema versions and junk', () => {
    expect(migrate({ ...emma(), schemaVersion: 99 })).toBeNull();
    expect(migrate('x')).toBeNull();
    expect(migrate(emma())).not.toBeNull();
  });
});
