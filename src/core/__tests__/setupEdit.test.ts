import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { i18n } from '../../i18n/i18n';
import type { Party } from '../model';
import {
  draftFromParty,
  editDateBounds,
  invitationChangeHint,
  sanitizeInvitationChanges,
  setupEditChanges,
  setupEditValid,
  withoutInvitationChanges,
  withSetupEdit,
} from '../rules/setupEdit';
import { draftAddCelebrant, draftRemoveCelebrant, draftWithCelebrant, draftWithDate, type SetupDraft } from '../party';
import { toggleTask, withTheme } from '../party';
import { buildInvitation, resolveInvitation, withInvitation } from '../rules/invitation';
import { cakePlan } from '../rules/cake';
import { goodieBagCount } from '../rules/goodieBags';
import { handleliste, withTick } from '../rules/shopping';
import { buildTasks } from '../rules/todos';
import { guestHint, withGuestAdded, withGuestStatus } from '../rules/guests';
import { headCount } from '../rules/people';
import { withActivity } from '../rules/programme';
import { migrate } from '../storage/PartyRepository';

/** «Endre festen» (Ekaterina, 30 Oct 2026): change the setup answers later without losing anything. */
afterEach(() => void i18n.changeLanguage('nb'));

const TODAY = '2026-10-30';
const edit = (p: Party, patch: Partial<SetupDraft>, today = TODAY) =>
  withSetupEdit(p, { ...draftFromParty(p), ...patch }, today);
const items = (p: Party) => handleliste(p).groups.flatMap((g) => g.items);

describe('the edit draft', () => {
  it('starts from the party, the time counts as hers (a new day keeps it)', () => {
    const p = emma();
    const d = draftFromParty(p);
    expect(d).toMatchObject({
      celebrants: [{ id: 'c1', name: 'Emma', age: 5 }],
      date: '2026-11-07',
      start: '12:00',
      end: '14:00',
      children: 13,
      place: 'hus',
      timeEdited: true,
    });
    // Saturday 12–14 → a Tuesday keeps 12–14 (setup would move a default time to 17–19)
    expect(draftWithDate(d, '2026-11-10')).toMatchObject({ date: '2026-11-10' });
    expect(draftWithDate(d, '2026-11-10')).not.toHaveProperty('start');
  });

  it('validates like setup: every child needs a name and an age', () => {
    const d = draftFromParty(emma());
    expect(setupEditValid(d)).toBe(true);
    expect(setupEditValid({ ...d, ...draftWithCelebrant(d, 'c1', { name: '  ' }) })).toBe(false);
    const two = { ...d, ...draftAddCelebrant(d) };
    expect(setupEditValid(two)).toBe(false);
    expect(() => withSetupEdit(emma(), two, TODAY)).toThrow();
  });

  it('nothing changed → the same party (no new updatedAt-worthy change)', () => {
    const p = emma();
    expect(setupEditChanges(p, draftFromParty(p)).any).toBe(false);
    expect(withSetupEdit(p, draftFromParty(p), TODAY)).toBe(p);
  });

  it('the calendar reaches some days back (soft note only) and always the party day', () => {
    expect(editDateBounds(TODAY, '2026-11-07')).toEqual({ min: '2026-08-31', max: expect.any(String) });
    expect(editDateBounds(TODAY, '2026-05-01').min).toBe('2026-05-01');
  });
});

describe('save recomputes everything derived', () => {
  it('date + children + a second birthday child: Planen, Mat, cake, goodie bags, to-dos follow', () => {
    const before = emma();
    const d0 = draftFromParty(before);
    const d1 = { ...d0, ...draftAddCelebrant(d0) };
    const d2 = { ...d1, ...draftWithCelebrant(d1, 'c2', { name: 'Jonas', age: 7 }) };
    const after = withSetupEdit(before, { ...d2, date: '2026-11-21', children: 20 }, TODAY);

    expect(after.celebrants).toEqual([
      { id: 'c1', name: 'Emma', age: 5 },
      { id: 'c2', name: 'Jonas', age: 7 },
    ]);
    expect(after.date).toBe('2026-11-21');
    expect(after.children).toBe(20);
    // a new date re-plans the to-dos from today
    expect(after.plannedFrom).toBe(TODAY);
    expect(headCount(after).kidsComing).toBe(20);
    expect(cakePlan(after).pieces).toBeGreaterThan(cakePlan(before).pieces);
    expect(goodieBagCount(after)).toBeGreaterThan(goodieBagCount(before));
    const sendInvite = (p: Party) => buildTasks(p).tasks.find((x) => x.id === 'sendInvite');
    expect(sendInvite(after)?.date).not.toBe(sendInvite(before)?.date);
    // the sausages on the shopping list follow the children number
    const polser = (p: Party) => items(p).find((i) => i.id === 'grillpolser')?.qty;
    expect(polser(after)).not.toBe(polser(before));
    // the generated invitation names both children and the new day
    expect(buildInvitation(after, TODAY).text).toContain('Emma og Jonas');
    expect(buildInvitation(after, TODAY).text).toContain('21. november');
  });

  it('children stay the ONE total and never drop below the birthday children + 1', () => {
    const p = emma({ children: 2 });
    const d = draftFromParty(p);
    const three = { ...d, ...draftAddCelebrant(d) };
    const named = { ...three, ...draftWithCelebrant(three, 'c2', { name: 'Jonas', age: 7 }) };
    expect(withSetupEdit(p, named, TODAY).children).toBe(3);
  });

  it('removing a birthday child keeps the first one and the others’ ids', () => {
    const p = emma({
      celebrants: [
        { id: 'c1', name: 'Emma', age: 5 },
        { id: 'c2', name: 'Jonas', age: 7 },
        { id: 'c3', name: 'Mia', age: 4 },
      ],
    });
    const d = draftFromParty(p);
    const after = withSetupEdit(p, { ...d, ...draftRemoveCelebrant(d, 'c2') }, TODAY);
    expect(after.celebrants.map((c) => `${c.id}:${c.name}`)).toEqual(['c1:Emma', 'c3:Mia']);
    expect(draftRemoveCelebrant(draftFromParty(emma()), 'c1')).toEqual({});
  });

  it('a new place changes the place; the garden answer stays', () => {
    const after = edit(emma(), { place: 'lokale' });
    expect(after.home).toEqual({ type: 'lokale', garden: true });
  });
});

describe('her own things are kept', () => {
  it('ticked to-dos, shopping ticks, guest list, theme, menu, cake, programme and goodie bags stay', () => {
    let p = emma({ theme: 'dinosaurer', menu: { kind: 'pizza', style: 'frossen' } as Party['menu'] });
    p = toggleTask(p, 'sendInvite', true, '2026-10-29T10:00:00.000Z');
    p = withTick(p, 'saft', true);
    p = withGuestStatus(withGuestAdded(p, 'Ola'), 'gjest-1', 'yes');
    p = withActivity(p, 'fiskedam', true);
    p = { ...p, goodieBags: { contents: ['rosiner'], style: 'uten' } as Party['goodieBags'] };
    const after = edit(p, { date: '2026-11-14', children: 18, start: '14:00', end: '16:00' });

    expect(after.taskState.sendInvite?.done).toBe(true);
    expect(buildTasks(after).tasks.some((x) => x.id === 'sendInvite')).toBe(true);
    expect(after.shopping).toEqual(p.shopping);
    expect(items(after).find((i) => i.id === 'saft')?.ticked).toBe(true);
    expect(after.guests).toEqual(p.guests);
    expect(after.theme).toBe('dinosaurer');
    expect(after.menu).toEqual(p.menu);
    expect(after.cake).toEqual(p.cake);
    expect(after.programme).toEqual(p.programme);
    expect(after.goodieBags).toEqual(p.goodieBags);
    expect(after.diets).toEqual(p.diets);
    expect(after.foodItems).toEqual(p.foodItems);
    expect(after.hostAdults).toBe(p.hostAdults);
    expect(after.id).toBe(p.id);
    expect(after.createdAt).toBe(p.createdAt);
  });

  it('a tick on an item that is gone is not counted, and comes back with the item', () => {
    const p = withTick(emma(), 'saft', true);
    const list = handleliste(p);
    expect(list.tickedCount).toBe(1);
    expect(handleliste(edit(p, { children: 25 })).tickedCount).toBe(1);
    // a stray id from an item that no longer exists never counts
    const stray = withTick(p, 'finnes-ikke', true);
    expect(handleliste(stray).tickedCount).toBe(1);
  });

  it('the theme is not part of the edit (own card on Planen)', () => {
    const p = withTheme(emma(), null);
    expect(edit(p, { children: 9 }).theme).toBeNull();
  });

  it('her svarfrist moves with the date (a week before stays a week before); one that no longer fits goes back to the default', () => {
    const p = withInvitation(emma(), { rsvpBy: '2026-10-31', phone: '90000000' });
    expect(edit(p, { date: '2026-11-14' }).invitation).toEqual({ rsvpBy: '2026-11-07', phone: '90000000' });
    // moved before today → the default (the day before the party)
    const early = edit(p, { date: '2026-11-03' });
    expect(early.invitation).toEqual({ phone: '90000000' });
    expect(resolveInvitation(early, TODAY).rsvpBy).toBe('2026-11-02');
    // no date change → untouched
    expect(edit(p, { children: 9 }).invitation).toEqual(p.invitation);
  });
});

describe('her own invitation text is never overwritten', () => {
  const own = () => withInvitation(emma(), { customText: 'Hei! Emma fyller 5 lørdag 7. november kl. 12. Velkommen!' });

  it('keeps the text and remembers what changed → the soft hint', () => {
    const after = edit(own(), { date: '2026-11-14', start: '14:00', end: '16:00' });
    expect(after.invitation?.customText).toBe(own().invitation?.customText);
    expect(buildInvitation(after, TODAY).text).toBe(own().invitation?.customText);
    expect(invitationChangeHint(after)).toEqual(['date', 'time']);
  });

  it('names/ages count; the children number does not; the place only without an address', () => {
    const d = draftFromParty(own());
    expect(invitationChangeHint(edit(own(), { ...draftWithCelebrant(d, 'c1', { age: 6 }) }))).toEqual(['celebrants']);
    expect(invitationChangeHint(edit(own(), { children: 20 }))).toBeNull();
    expect(invitationChangeHint(edit(own(), { place: 'lokale' }))).toEqual(['place']);
    const withAddress = withInvitation(own(), { address: 'Storgata 1' });
    expect(invitationChangeHint(edit(withAddress, { place: 'lokale' }))).toBeNull();
  });

  it('a second edit adds to the list (in a fixed order)', () => {
    const once = edit(own(), { start: '13:00', end: '15:00' });
    expect(invitationChangeHint(edit(once, { date: '2026-11-14' }))).toEqual(['date', 'time']);
  });

  it('without her own text there is nothing to point out (the generated text follows by itself)', () => {
    const after = edit(emma(), { date: '2026-11-14' });
    expect(after.invitationChanges).toBeUndefined();
    expect(buildInvitation(after, TODAY).text).toContain('14. november');
  });

  it('«Behold teksten min» clears the hint; going back to the generated text does too', () => {
    const after = edit(own(), { date: '2026-11-14' });
    expect(invitationChangeHint(withoutInvitationChanges(after))).toBeNull();
    expect(withoutInvitationChanges(after).invitation?.customText).toBe(own().invitation?.customText);
    // regenerated (customText cleared): the stale list alone shows nothing
    const regenerated = withInvitation(after, { customText: undefined });
    expect(invitationChangeHint(regenerated)).toBeNull();
  });

  it('the hint reads softly in nb and en', () => {
    expect(i18n.t('editParty.hint.title', { what: 'datoen' })).toBe('Du har endret datoen. Vil du oppdatere teksten?');
    void i18n.changeLanguage('en');
    expect(i18n.t('editParty.hint.title', { what: 'the date' })).toBe(
      'You changed the date. Would you like to update the text?',
    );
  });
});

describe('Gjesteliste hint with a changed children count', () => {
  it('compares the list with the NEW total', () => {
    let p = emma();
    p = withGuestAdded(withGuestAdded(withGuestAdded(p, 'Ola'), 'Sara'), 'Noah');
    expect(guestHint(p)).toMatchObject({ planned: 13, suggested: 4, kind: 'differs' });
    const after = edit(p, { children: 4 });
    expect(guestHint(after)).toMatchObject({ planned: 4, suggested: 4, kind: 'same' });
    // a second birthday child is counted in the suggestion
    const d = draftFromParty(after);
    const two = { ...d, ...draftAddCelebrant(d) };
    const named = { ...two, ...draftWithCelebrant(two, 'c2', { name: 'Jonas', age: 7 }) };
    expect(guestHint(withSetupEdit(after, named, TODAY))).toMatchObject({ planned: 4, suggested: 5 });
  });
});

describe('stored parties', () => {
  it('an old saved party (schema 5, before Handleliste) opens and can be edited', () => {
    const { shopping: _s, goodieBags: _g, ...v5 } = emma();
    const p = migrate({ ...v5, schemaVersion: 5 } as never)!;
    expect(p.invitationChanges).toBeUndefined();
    const after = edit(p, { date: '2026-11-14', children: 15 });
    expect(after).toMatchObject({ date: '2026-11-14', children: 15, schemaVersion: 6 });
  });

  it('the remembered changes survive a reload; unknown words are dropped', () => {
    const p = edit(withInvitation(emma(), { customText: 'Egen tekst' }), { date: '2026-11-14' });
    expect(migrate(JSON.parse(JSON.stringify(p)))?.invitationChanges).toEqual(['date']);
    expect(migrate({ ...emma(), invitationChanges: ['date', 'tull', 3] })?.invitationChanges).toEqual(['date']);
    expect(migrate({ ...emma(), invitationChanges: 'date' })).not.toHaveProperty('invitationChanges');
    expect(sanitizeInvitationChanges(['time', 'date'])).toEqual(['date', 'time']);
  });
});

describe('what came later on main: Påminnelser, the print cards, Festdagen', () => {
  it('the parents’ names and the chosen card stay; the svar line still uses the names', () => {
    const p = withInvitation(emma(), { hostNames: 'Kari og Per', cardId: 'dinosaurer', phone: '90000000' });
    const e = edit(p, { date: '2026-11-21', children: 9 });
    expect(e.invitation).toMatchObject({ hostNames: 'Kari og Per', cardId: 'dinosaurer' });
    expect(buildInvitation(e).text).toContain('Kari og Per');
  });

  it('the party-day jobs (Festdagen) move to the new day, and a tick on one stays', () => {
    const p0 = emma();
    const day = buildTasks(p0).tasks.filter((x) => x.date === p0.date && x.id.startsWith('day'));
    expect(day.length).toBeGreaterThan(0);
    const p = toggleTask(p0, day[0].id, true, '2026-10-30T10:00:00Z');
    const e = edit(p, { date: '2026-11-21' });
    const moved = buildTasks(e).tasks.filter((x) => x.id.startsWith('day'));
    expect(moved.map((x) => x.id)).toEqual(day.map((x) => x.id));
    for (const x of moved) expect(x.date).toBe('2026-11-21');
    expect(e.taskState[day[0].id]?.done).toBe(true);
  });
});
