import { describe, expect, it } from 'vitest';
import { createParty, draftComplete, EMPTY_DRAFT, summarize, withDate, homeItemsFor } from '../party';
import { createPartyRepository, memoryStore, migrate } from '../storage/PartyRepository';
import { emma } from '../__fixtures__/emma';
import { invitationCard, render, genitive, TEMPLATES } from '../texts/render';
import { THEMES } from '../themes';

const draft = {
  ...EMPTY_DRAFT,
  name: ' Emma ',
  age: 5,
  date: '2026-11-07',
  dateText: '7. november',
  start: '12:00',
  end: '14:00',
  kidsInvited: 12,
  theme: 'enhjorning' as const,
};

describe('createParty', () => {
  it('needs a complete setup', () => {
    expect(draftComplete(EMPTY_DRAFT)).toBe(false);
    expect(draftComplete(draft)).toBe(true);
  });
  it('builds one record with id, timestamps and schemaVersion', () => {
    const p = createParty(draft, { id: 'abc', now: '2026-10-19T08:00:00.000Z', today: '2026-10-19' });
    expect(p).toMatchObject({
      id: 'abc',
      schemaVersion: 1,
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-19T08:00:00.000Z',
      plannedFrom: '2026-10-19',
      child: { name: 'Emma', age: 5 },
      kidsInvited: 12,
      hostAdults: 2,
      // nothing the parent hasn't chosen: no piñata, skattejakt or muffins yet
      programme: { includePinata: false, includeSkattejakt: false },
      cake: { mode: 'bake', muffins: false },
      menuChosen: false,
    });
    // November → wienerpølser by default until the parent picks (Mat is milestone 2)
    expect(p.menu.kind).toBe('wienerpolser');
  });
  it('a fresh party assumes no activity or menu the parent has not chosen', () => {
    const p = createParty(draft, { id: 'abc', now: '2026-10-19T08:00:00.000Z', today: '2026-10-19' });
    const s = summarize(p, '2026-10-19');
    expect(s.menuLine).toBe('Mat for 13 barn og 4 voksne'); // 12 invited + Emma
    expect(s.cakeLine).toBe('Enhjørningkake');
    expect(s.programmeLine).toBe('Program 12–14');
    const text = JSON.stringify(s) + JSON.stringify(homeItemsFor(p));
    expect(text).not.toMatch(/piñata|skattejakt|fiskedam|fiskestang|muffins/i);
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
      menuLine: 'Grillmeny for 13 barn og 4 voksne',
      cakeLine: 'Enhjørningkake og muffins',
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
      headline: 'Bli med på enhjørningfest!',
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
  it('genitive', () => {
    expect(genitive('Emma')).toBe('Emmas');
    expect(genitive('Hans')).toBe("Hans'");
  });
  it('every theme, including Pokémon, Paw Patrol and Frost, has texts', () => {
    expect(THEMES.map((t) => t.id)).toEqual(expect.arrayContaining(['pokemon', 'paw-patrol', 'frost']));
    expect(THEMES).toHaveLength(9);
    for (const t of THEMES) {
      const tt = (TEMPLATES.themes as Record<string, { fest: string }>)[t.id];
      expect(tt, t.id).toBeTruthy();
      expect(tt.fest).toBe(t.fest);
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
  it('ignores unknown schema versions and junk', () => {
    expect(migrate({ ...emma(), schemaVersion: 99 })).toBeNull();
    expect(migrate('x')).toBeNull();
    expect(migrate(emma())).not.toBeNull();
  });
});
