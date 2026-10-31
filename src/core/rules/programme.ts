/**
 * Program (Oct 2026): activity IDEAS for the party, not a plan she has to follow (Ekaterina, 27 Oct: «you can
 * have these or these or these»). Pure and deterministic, no AI. The catalog, the rules of each activity and
 * the photo-hunt list live in ./activities.ts; this file decides:
 * - the three suggestions for THIS party (`suggestActivities`): by the youngest birthday child, the place
 *   (outdoors or a house with a garden), the theme, the cake and the month, always at least one free idea;
 * - «Flere ideer», grouped (`moreIdeas`);
 * - what a picked activity adds to Handleliste (`programmeShopLines`; the to-dos are in rules/todos.ts);
 * - a soft suggested order for the party day (`programmeTimeline`), clearly a suggestion.
 * Nothing is picked by default and nothing is required.
 */
import type { Party, ProgrammeChoice } from '../model';
import {
  ACTIVITIES,
  activityById,
  activityName,
  activityShopLines,
  isActivityId,
  type ActivityGroup,
  type ActivityId,
  type ActivityMeta,
} from './activities';
import { youngestAge } from './celebrants';
import { cakePlan } from './cake';
import { goodieBagsOn } from './goodieBags';
import { formatClock, fromMinutes, minutesOf, parts } from './dates';
import { headCount } from './people';
import { themeById } from '../themes';
import { t } from '../../i18n/i18n';
import { pcs } from './units';

/**
 * The picked activities, in the order she picked them. A party saved before the Program screen has only the
 * two old switches: `includeSkattejakt` → 'skattejakt', `includePinata` → 'pinata' (in that order).
 */
export function pickedActivities(p: Pick<Party, 'programme'>): ActivityId[] {
  const pr = (p.programme ?? {}) as ProgrammeChoice;
  if (Array.isArray(pr.activities)) {
    const out: ActivityId[] = [];
    for (const id of pr.activities) if (isActivityId(id) && !out.includes(id)) out.push(id);
    return out;
  }
  const legacy: ActivityId[] = [];
  if (pr.includeSkattejakt === true) legacy.push('skattejakt');
  if (pr.includePinata === true) legacy.push('pinata');
  return legacy;
}

/** Storage: any stored programme (the old switches, unknown ids, missing) → `{ activities }`. No schema bump. */
export function sanitizeProgramme(raw: unknown): { activities: ActivityId[] } {
  const programme = (raw && typeof raw === 'object' ? raw : {}) as ProgrammeChoice;
  return { activities: pickedActivities({ programme }) };
}

export const isPicked = (p: Pick<Party, 'programme'>, id: ActivityId) => pickedActivities(p).includes(id);

/** Pick or unpick one idea. Writes the new shape only (the old switches are dropped). */
export function withActivity(p: Party, id: ActivityId, on: boolean): Party {
  const now = pickedActivities(p);
  const activities = on ? (now.includes(id) ? now : [...now, id]) : now.filter((x) => x !== id);
  return { ...p, programme: { activities } };
}

/**
 * Outdoor games are shown when the party can go outside: outdoors, or a house (a garden is likely and the
 * setup does not ask; `garden: false` hides them). Always «hvis været tillater», with an indoor backup.
 */
export function outdoorPossible(p: Pick<Party, 'home'>): boolean {
  if (p.home.type === 'ute') return true;
  if (p.home.type === 'hus') return p.home.garden !== false;
  return p.home.garden === true;
}

/** April–September: an outdoor game can be one of the three suggestions. */
export function outdoorSeason(p: Pick<Party, 'date'>): boolean {
  const m = parts(p.date).m;
  return m >= 4 && m <= 9;
}

/** The age range fits the party: judged by the youngest birthday child, like the rest of the app. */
export function fitsParty(a: ActivityMeta, p: Pick<Party, 'celebrants'>): boolean {
  const y = youngestAge(p.celebrants);
  return a.minAge <= y && a.maxAge >= y;
}

/** There are muffins to decorate: Kake = muffins, or a pack of muffins beside the langpanne. */
export function hasMuffins(p: Party): boolean {
  const c = cakePlan(p);
  return c.kind === 'muffins' || c.muffinPacks > 0;
}

/**
 * Three ideas for this party, always at least one free (Ekaterina's skattejakt with a drawn map, or for 7+ the
 * photo hunt that «was a success»):
 * 1. the hunt (free): fotojakt when the youngest is 7 or older, else skattejakt;
 * 2. the highlight: «Pynt egne muffins» when the cake is muffins, else the piñata (its theme version when a
 *    theme is chosen), else (3-year-olds) the fiskedam;
 * 3. a game to move about: an outdoor game in April–September when they can be outside (the fotball theme:
 *    stafett), else an indoor game for the age (in a flat something calm).
 * Deterministic; a pick that does not fit the age is replaced by the next free idea that does.
 */
export function suggestActivities(p: Party): ActivityId[] {
  const y = youngestAge(p.celebrants);
  const out: ActivityId[] = [];
  const add = (id: ActivityId) => {
    if (out.length < 3 && !out.includes(id) && fitsParty(activityById(id), p)) out.push(id);
  };
  add(y >= 7 ? 'fotojakt' : 'skattejakt');
  if (hasMuffins(p)) add('pyntmuffins');
  else if (y >= 4) add('pinata');
  else add('fiskedam');
  if (outdoorPossible(p) && outdoorSeason(p)) {
    add(
      p.theme === 'fotball' && y >= 5
        ? 'stafett'
        : y >= 7
          ? 'boksengaar'
          : y >= 5
            ? 'stafett'
            : y === 4
              ? 'eggeskje'
              : 'sangleker',
    );
  } else if (p.home.type === 'leilighet') {
    add(y <= 5 ? 'stoppdans' : 'kimslek');
  } else {
    add(y <= 3 ? 'sangleker' : y <= 5 ? 'stoppdans' : y <= 8 ? 'stivheks' : 'kimslek');
  }
  for (const a of ACTIVITIES) if (a.free && !a.outdoor) add(a.id);
  return out;
}

/**
 * «Flere ideer»: every idea that is not among the three, grouped (Gratis / Litt å kjøpe / Ute, hvis været
 * tillater). Ute only when they can be outside; «Pynt egne muffins» only when there are muffins. Within a
 * group the ideas that fit the age come first; the rest stay visible with their ages (suggest, never
 * restrict). A picked idea is always listed somewhere.
 */
export function moreIdeas(p: Party): { id: ActivityGroup; activities: ActivityId[] }[] {
  const suggested = new Set(suggestActivities(p));
  const picked = pickedActivities(p);
  const outdoor = outdoorPossible(p);
  const muffins = hasMuffins(p);
  const shown = (a: ActivityMeta) => picked.includes(a.id) || ((outdoor || !a.outdoor) && (muffins || !a.needsMuffins));
  const groups: ActivityGroup[] = ['gratis', 'kjope', 'ute'];
  return groups
    .map((g) => {
      const list = ACTIVITIES.filter((a) => a.group === g && !suggested.has(a.id) && shown(a));
      const fit = list.filter((a) => fitsParty(a, p)).map((a) => a.id);
      const rest = list.filter((a) => !fitsParty(a, p)).map((a) => a.id);
      return { id: g, activities: [...fit, ...rest] };
    })
    .filter((g) => g.activities.length > 0);
}

/** The name in the party's words: the piñata becomes the theme's («enhjørning-piñata») when a theme is set. */
export function partyActivityName(id: ActivityId, p: Pick<Party, 'theme'>): string {
  if (id === 'pinata' && p.theme) {
    const name = themeById(p.theme).pinata;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return activityName(id);
}

export interface ProgrammeShopLine {
  /** Stable: `program-pinata` …, or `laken-fiskedam` / `fiskestang` (also in «Har dere dette hjemme?»). */
  id: string;
  name: string;
  qty: string;
  detail?: string;
  /** One plain line for sharing. */
  text: string;
}

/**
 * Handleliste («Til lekene»): only what the picked activities need, each once, never what the list already
 * has (balloons, goodie bags and candy for the bags are there already; skattejakt, fotojakt and the games
 * need nothing). The fiskedam's sheet and rod are left out when «Har dere dette hjemme?» says so.
 */
export function programmeShopLines(p: Party): ProgrammeShopLine[] {
  const picked = pickedActivities(p);
  const kids = headCount(p).kidsComing;
  const out: ProgrammeShopLine[] = activityShopLines(picked, kids).map((l) => {
    const name = l.id === 'pinata' ? partyActivityName('pinata', p) : l.name;
    // the piñata lines say where to get it and what the candy is for; the rest say which game they are for
    const detail =
      l.id === 'pinata'
        ? t('rules.programme.shop.pinataDetail')
        : l.id === 'pinataGodteri'
          ? t('rules.programme.shop.candyDetail')
          : l.why;
    return { id: `program-${l.id}`, name, qty: l.amount, detail, text: phrase(l.amount, name) };
  });
  if (picked.includes('fiskedam')) {
    const home = new Set(p.haveAtHome);
    for (const id of ['laken-fiskedam', 'fiskestang'] as const) {
      if (home.has(id)) continue;
      const name = t(`rules.programme.shop.${id === 'fiskestang' ? 'rod' : 'sheet'}`);
      out.push({
        id,
        name,
        qty: pcs(1),
        detail: t('rules.programme.shop.homeHint'),
        text: phrase(pcs(1), name),
      });
    }
  }
  return out;
}

export interface TimelineBlock {
  /** 'arrive' | 'food' | 'cake' | 'play' | 'home' or an activity id */
  id: string;
  /** «12.15» / «12:15» */
  time: string;
  title: string;
  /** ca. minutes (0 for the goodbye) */
  minutes: number;
  activity?: ActivityId;
}

/** «1 stk enhjørning-piñata», «ca. 700 g godteri til piñataen» (the list's own phrase, as in rules/shopping.ts). */
const phrase = (qty: string, name: string) =>
  t('rules.shop.phrase', { qty, name: name.charAt(0).toLowerCase() + name.slice(1) });

const round5 = (m: number) => Math.round(m / 5) * 5;

/**
 * A soft suggested order for the day in the party's own time window, in the shape of templates.json
 * «programme» (arrival and free play → food → activities → cake → piñata → goodie bags and home). The
 * activities use their own «ca.» minutes; when they do not fit they are shortened in proportion (to 5 min,
 * at least 5); time left over becomes free play. Only a suggestion: the screen says so.
 */
export function programmeTimeline(p: Party): TimelineBlock[] {
  const start = minutesOf(p.start);
  let span = minutesOf(p.end) - start;
  if (span <= 0) span += 24 * 60;
  span = Math.max(60, span);
  const arrive = span >= 120 ? 15 : 10;
  const food = span >= 120 ? 25 : 20;
  const cake = 15;
  const home = 10;
  const picked = pickedActivities(p);
  const slot = Math.max(0, span - arrive - food - cake - home);
  const wanted = picked.map((id) => activityById(id).minutes);
  const total = wanted.reduce((a, b) => a + b, 0);
  const scale = total > slot && total > 0 ? slot / total : 1;
  const mins = new Map<ActivityId, number>(
    picked.map((id, i) => [id, scale < 1 ? Math.max(5, round5(wanted[i] * scale)) : wanted[i]]),
  );
  const used = [...mins.values()].reduce((a, b) => a + b, 0);
  const play = Math.max(0, slot - used);
  const act = (id: ActivityId) => ({
    id,
    activity: id,
    title: t('program.timeline.activity', { name: partyActivityName(id, p) }),
    minutes: mins.get(id) ?? 15,
  });
  const blocks: Omit<TimelineBlock, 'time'>[] = [
    { id: 'arrive', title: t('program.timeline.arrive'), minutes: arrive },
    { id: 'food', title: t('program.timeline.food'), minutes: food },
    ...picked.filter((id) => id !== 'pinata').map(act),
  ];
  if (!picked.length) blocks.push({ id: 'play', title: t('rules.programme.timelinePlay'), minutes: play });
  blocks.push({ id: 'cake', title: t('program.timeline.cake'), minutes: cake });
  // the piñata after the cake, as at most parties: it ends in candy
  if (picked.includes('pinata')) blocks.push(act('pinata'));
  if (picked.length && play >= 10) blocks.push({ id: 'play', title: t('rules.programme.timelineFree'), minutes: play });
  const out: TimelineBlock[] = [];
  let at = start;
  for (const b of blocks) {
    out.push({ ...b, time: formatClock(fromMinutes(round5(at) % (24 * 60))) });
    at += b.minutes;
  }
  out.push({
    id: 'home',
    // «Godteposer og hjem», or just «Takk for i dag» when she drops the goodie bags
    title: t(goodieBagsOn(p) ? 'program.timeline.home' : 'program.timeline.homeNoBags'),
    minutes: 0,
    time: formatClock(fromMinutes((start + span - home) % (24 * 60))),
  });
  return out;
}

/** «Skattejakt og piñata»: the picked ideas in a few words (Planen card, Festen er klar); '' when none. */
export function programmeChoiceLine(p: Party): string {
  // a plain comma list: the names keep their own capitals in both languages («Kims lek», «Simon says»)
  return pickedActivities(p)
    .map((id) => partyActivityName(id, p))
    .join(', ');
}
