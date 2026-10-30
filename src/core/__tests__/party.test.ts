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
import { BRAND_PALETTE, paletteFor, THEMES } from '../themes';
import { buildTasks } from '../rules/todos';
import { foodCounts } from '../rules/menu';
import { headCount } from '../rules/people';

/** Emma's party as schemaVersion 4 stored it: 12 INVITED children, Emma not counted. */
function emmaV4() {
  const { children: _c, ...rest } = emma();
  void _c;
  return { ...rest, schemaVersion: 4, kidsInvited: 12, siblingsAttending: 0 };
}

const draft = {
  ...EMPTY_DRAFT,
  celebrants: [{ id: 'c1', name: ' Emma ', age: 5 }],
  date: '2026-11-07',
  dateText: '7. november',
  start: '12:00',
  end: '14:00',
  children: 13,
  place: 'hus' as const,
};

describe('default time follows the date until the parent edits it', () => {
  const base = { ...EMPTY_DRAFT, celebrants: [{ id: 'c1', name: 'Emma', age: 5 }] };
  it('a Wednesday gets 17.00–19.00, with no weekend hint anywhere', () => {
    expect(draftWithDate(base, '2026-11-11')).toEqual({
      date: '2026-11-11',
      dateText: '2026-11-11',
      start: '17:00',
      end: '19:00',
    });
  });
  it('switching to a Saturday moves the default to 12.00–14.00, and back again', () => {
    const wed = { ...base, ...draftWithDate(base, '2026-11-11') };
    const sat = { ...wed, ...draftWithDate(wed, '2026-11-14') };
    expect([sat.start, sat.end]).toEqual(['12:00', '14:00']);
    const fri = { ...sat, ...draftWithDate(sat, '2026-11-13') };
    expect([fri.start, fri.end]).toEqual(['17:00', '19:00']);
  });
  it('a Saturday for an 8-year-old is 14.00–16.00', () => {
    const eight = { ...EMPTY_DRAFT, celebrants: [{ id: 'c1', name: 'Jonas', age: 8 }] };
    expect(draftWithDate(eight, '2026-11-14')).toMatchObject({ start: '14:00', end: '16:00' });
  });
  it('a joint party (4 and 8) follows the YOUNGEST: Saturday 12.00–14.00', () => {
    const joint = {
      ...EMPTY_DRAFT,
      celebrants: [
        { id: 'c1', name: 'Jonas', age: 8 },
        { id: 'c2', name: 'Emma', age: 4 },
      ],
    };
    expect(draftWithDate(joint, '2026-11-14')).toMatchObject({ start: '12:00', end: '14:00' });
    // when the youngest becomes 9, the default moves to the older children's weekend time
    const sat = { ...joint, ...draftWithDate(joint, '2026-11-14') };
    expect(draftWithCelebrant(sat, 'c2', { age: 9 })).toMatchObject({ start: '14:00', end: '16:00' });
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
  it('one children number: the total, birthday children included (default 12)', () => {
    expect(EMPTY_DRAFT.children).toBe(12);
    // an old draft counted the invited children without the birthday children: 12 + Emma = 13
    expect(normalizeDraft({ name: 'Emma', age: 5, kidsInvited: 12 }).children).toBe(13);
    const joint = {
      celebrants: [
        { id: 'c1', name: 'Emma', age: 5 },
        { id: 'c2', name: 'Jonas', age: 7 },
      ],
      kidsInvited: 10,
    };
    expect(normalizeDraft(joint).children).toBe(12);
    // a current draft keeps its number as is
    expect(normalizeDraft({ ...joint, children: 9 }).children).toBe(9);
  });
  it('the party keeps the setup number as is: 12 children means 12 everywhere', () => {
    const p = createParty(
      { ...draft, children: 12 },
      { id: 'x', now: '2026-10-19T08:00:00.000Z', today: '2026-10-19' },
    );
    expect(p.children).toBe(12);
    expect(headCount(p).kidsComing).toBe(12);
    expect(summarize(p, '2026-10-19').menuLine).toBe('Mat for 12 barn og 4 voksne');
    expect(buildTasks(p).tasks.find((t) => t.id === 'guestList')?.detail).toBe('12 barn');
    // never fewer than the birthday children plus one guest
    expect(
      createParty({ ...draft, children: 1 }, { id: 'y', now: '2026-10-19T08:00:00.000Z', today: '2026-10-19' })
        .children,
    ).toBe(2);
  });
});

describe('createParty', () => {
  it('builds one record with id, timestamps and schemaVersion', () => {
    const p = createParty(draft, { id: 'abc', now: '2026-10-19T08:00:00.000Z', today: '2026-10-19' });
    expect(p).toMatchObject({
      id: 'abc',
      schemaVersion: 6,
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-19T08:00:00.000Z',
      plannedFrom: '2026-10-19',
      celebrants: [{ id: 'c1', name: 'Emma', age: 5 }],
      // no theme until the parent picks one on Planen
      theme: null,
      home: { type: 'hus', garden: null },
      children: 13,
      hostAdults: 2,
      // nothing the parent hasn't chosen: no piñata, skattejakt or muffins yet
      programme: { activities: [] },
      cake: { mode: 'bake', muffins: false },
      // Handleliste: nothing ticked, no own items, nothing picked for the goodie bags
      goodieBags: { contents: [] },
      shopping: { ticked: [], custom: [] },
      // no menu until the parent picks one on the Mat screen (not even a seasonal guess)
      menu: null,
      diets: [],
      // every food line starts included
      foodItems: {},
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
      programmeLine: 'Program 12–14: Skattejakt, Enhjørning-piñata',
      programmeChoice: 'Skattejakt, Enhjørning-piñata',
      programmeCount: 2,
      tasksThisWeek: 2,
      progressLine: '1 av 19 gjøremål er gjort. Godt i rute.',
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
      // Invitasjon: svarfrist defaults to the day before; reply mode «Gi beskjed hvis dere ikke kommer»
      rsvp: 'Kan dere ikke komme? Si fra innen 6.\u00a0november',
      where: '',
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
    expect(THEMES).toHaveLength(8);
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
  it('upgrades a v1 party (one child) to the current version (celebrants), keeping its theme', async () => {
    const { celebrants, diets: _d, foodItems: _f, ...rest } = emmaV4();
    const v1 = {
      ...rest,
      menuChosen: true,
      schemaVersion: 1,
      child: { name: celebrants[0].name, age: celebrants[0].age },
    };
    const p = migrate(v1)!;
    expect(p.schemaVersion).toBe(6);
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
    const { diets: _d, foodItems: _f, ...rest } = emmaV4();
    const v2 = { ...rest, schemaVersion: 2, menu: { kind: 'wienerpolser' }, menuChosen: false };
    const p = migrate(v2)!;
    expect(p).toMatchObject({ schemaVersion: 6, menu: null, diets: [], foodItems: {}, children: 13 });
    expect(p).not.toHaveProperty('foodCounts');
    expect(p).not.toHaveProperty('menuChosen');
    // a menu the parent did pick survives
    expect(migrate({ ...v2, menu: { kind: 'grillpolser' }, menuChosen: true })!.menu).toEqual({ kind: 'grillpolser' });
    // … unless it is a dish that is hidden for now (taco, pasta): then it opens with nothing picked
    expect(migrate({ ...v2, menu: { kind: 'taco' }, menuChosen: true })!.menu).toBeNull();
    // and an old party opens fine through the repository, with no menu chosen
    const store = memoryStore();
    await store.setItem(`bursdagsklar:party:${v2.id}`, JSON.stringify(v2));
    const loaded = await createPartyRepository(store).get(v2.id);
    expect(loaded?.menu).toBeNull();
    expect(summarize(loaded!, '2026-10-19').menuLine).toBe('Mat for 13 barn og 4 voksne');
  });
  it("upgrades a v3 party: the Mat screen's own counts are dropped, every food line is included", async () => {
    const { foodItems: _f, ...rest } = emmaV4();
    const v3 = { ...rest, schemaVersion: 3, menu: { kind: 'grillpolser' }, foodCounts: { kids: 20, adults: 9 } };
    const p = migrate(v3)!;
    expect(p).toMatchObject({ schemaVersion: 6, menu: { kind: 'grillpolser' }, foodItems: {}, children: 13 });
    expect(p).not.toHaveProperty('foodCounts');
    // one source of truth: the food follows the party's own numbers again
    expect(foodCounts(p)).toEqual({ kids: 13, adults: 4 });
    const store = memoryStore();
    await store.setItem(`bursdagsklar:party:${v3.id}`, JSON.stringify(v3));
    expect((await createPartyRepository(store).get(v3.id))?.foodItems).toEqual({});
  });
  it('upgrades a v4 party: the invited count N becomes N + the birthday children, same food', async () => {
    const v4 = { ...emmaV4(), menu: { kind: 'grillpolser' }, foodItems: { polsebrod: { included: false } } };
    const p = migrate(v4)!;
    expect(p.schemaVersion).toBe(6);
    expect(p.children).toBe(13);
    expect(p).not.toHaveProperty('kidsInvited');
    expect(p).not.toHaveProperty('siblingsAttending');
    expect(p.foodItems).toEqual({ polsebrod: { included: false } });
    // the same real head-count as before: 13 children eat, 4 adults
    expect(headCount(p)).toMatchObject({ kidsComing: 13, adultsEating: 4 });
    expect(p).toEqual(emma({ foodItems: { polsebrod: { included: false } } }));
    // a joint party: 10 invited + Emma + Jonas = 12
    const jointV4 = {
      ...emmaV4(),
      kidsInvited: 10,
      celebrants: [
        { id: 'c1', name: 'Emma', age: 5 },
        { id: 'c2', name: 'Jonas', age: 7 },
      ],
    };
    expect(migrate(jointV4)!.children).toBe(12);
    // through the repository (what a reload does)
    const store = memoryStore();
    await store.setItem(`bursdagsklar:party:${v4.id}`, JSON.stringify(v4));
    const loaded = await createPartyRepository(store).get(v4.id);
    expect(loaded?.children).toBe(13);
    expect(summarize(loaded!, '2026-10-19').menuLine).toBe('Grillpølser for 13 barn og 4 voksne');
  });
  it('ignores unknown schema versions and junk', () => {
    expect(migrate({ ...emma(), schemaVersion: 99 })).toBeNull();
    expect(migrate('x')).toBeNull();
    expect(migrate(emma())).not.toBeNull();
  });
  it('opens a party saved with the removed Havfruer theme as «Uten tema», old and new versions alike', async () => {
    const saved = { ...emma(), theme: 'havfruer' };
    const p = migrate(saved)!;
    expect(p.theme).toBeNull();
    expect(summarize(p, '2026-10-19')).toBeTruthy();
    expect(paletteFor(p.theme)).toEqual(BRAND_PALETTE);
    const { celebrants, diets: _d, foodItems: _f, ...rest } = emmaV4();
    const v1 = { ...rest, theme: 'havfruer', schemaVersion: 1, child: { name: celebrants[0].name, age: 5 } };
    expect(migrate(v1)!.theme).toBeNull();
    // and through the repository (a reload)
    const store = memoryStore();
    await store.setItem(`bursdagsklar:party:${saved.id}`, JSON.stringify(saved));
    const loaded = await createPartyRepository(store).get(saved.id);
    expect(loaded?.theme).toBeNull();
    expect(loaded?.celebrants[0].name).toBe('Emma');
    // a theme still offered is kept
    expect(migrate({ ...emma(), theme: 'frost' })!.theme).toBe('frost');
  });
});
