/**
 * Handleliste: everything to buy for the party, generated from the party every time (pure,
 * deterministic, fixed Norwegian templates, no AI). Only the ticks and her own items are stored
 * (party.shopping), keyed by stable item ids, so a menu change, a deselected food line or a new
 * children count updates the list while the ticks stay.
 *
 * Sources:
 * - the food: every included line of the Mat screen (rules/menu.ts), the same amounts and pack sizes;
 *   a line she deselected on Mat is left out. Not on the list: her own dish («Noe annet»), the oven time,
 *   the trays of homemade pizza (the ingredients are listed), tap water and the cake (Kake comes later);
 * - drinks and fruit (also when no main dish is chosen yet: they do not depend on it);
 * - the dietary extras ticked on Mat («1 pk kyllingpølser»);
 * - party things: goodie bags, candles (one set per birthday child), plates/cups/napkins, balloons
 *   and the birthday crown, unless «Har dere dette hjemme?» says they are at home;
 * - what she picked for the goodie bags from «Forslag til innhold» (none by default), about one per
 *   child where that makes sense, candy ca. 100 g per bag;
 * - her own free-text items («Legg til vare»).
 */
import type { CustomShoppingItem, GoodieBagItemId, Party } from '../model';
import { GOODIE_BAG_ITEMS } from '../model';
import * as C from './constants';
import { formatGrams } from './food';
import { dietGroup, foodPlan, partyFoodPlan, type DietGroup, type FoodLine, type FoodPlan } from './menu';
import { headCount } from './people';
import { celebrantNames, oldestAge } from './celebrants';
import { genitive } from '../texts/render';
import { MONTHS_SHORT, parts } from './dates';

export type ShopGroupId = 'kjott' | 'brod' | 'frukt' | 'drikke' | 'torrvarer' | 'frys' | 'fest' | 'godteposer' | 'egne';

/** Store sections, in the order the list shows them. Empty sections are not shown. */
export const SHOP_GROUPS: readonly { id: ShopGroupId; title: string }[] = [
  { id: 'kjott', title: 'Kjøtt og pålegg' },
  { id: 'brod', title: 'Brød' },
  { id: 'frukt', title: 'Frukt og grønt' },
  { id: 'drikke', title: 'Drikke' },
  { id: 'torrvarer', title: 'Tørrvarer' },
  { id: 'frys', title: 'Frysedisk' },
  { id: 'fest', title: 'Fest og pynt' },
  { id: 'godteposer', title: 'Godteposer' },
  { id: 'egne', title: 'Egne varer' },
];

export interface ShopItem {
  /** Stable: the Mat line id (`grillpolser`), a party item (`kakelys`, `godteri`) or `egen-1`. */
  id: string;
  group: ShopGroupId;
  name: string;
  /** The amount to buy, short («5 pk», «2 flasker», «ca. 2,3 kg»). Empty for her own items. */
  qty: string;
  /** A second line («à 10, 50 stk i alt»). */
  detail?: string;
  /** One plain line for sharing: «5 pk grillpølser». */
  text: string;
  ticked: boolean;
  /** Her own item («Legg til vare»): can be deleted. */
  custom?: boolean;
}

export interface ShopGroup {
  id: ShopGroupId;
  title: string;
  /** Not-ticked items first (in list order), ticked items at the bottom. */
  items: ShopItem[];
}

export interface Handleliste {
  /** «Handleliste – Emmas bursdag 15. nov» */
  title: string;
  groups: ShopGroup[];
  /** All items on the list, ticked or not. */
  count: number;
  tickedCount: number;
  /** The goodie-bag suggestions, in chip order, and whether she picked each. */
  goodieBagSuggestions: { id: GoodieBagItemId; label: string; picked: boolean }[];
  /** false while no main dish is chosen: only drinks, fruit and party things are on the list. */
  menuChosen: boolean;
}

/** The Mat lines that are not something to buy here. */
const NOT_BOUGHT = new Set(['egen', 'ovnstid', 'langpanner', 'vann']);

const LINE_GROUP: Record<string, ShopGroupId> = {
  grillpolser: 'kjott',
  wienerpolser: 'kjott',
  kjottdeig: 'kjott',
  pizzaskinke: 'kjott',
  pastaskinke: 'kjott',
  pizzaost: 'kjott',
  tacoost: 'kjott',
  pastaost: 'kjott',
  lomper: 'brod',
  polsebrod: 'brod',
  tortillas: 'brod',
  frukt: 'frukt',
  isberg: 'frukt',
  pastagront: 'frukt',
  saft: 'drikke',
  ketchup: 'torrvarer',
  lok: 'torrvarer',
  frossenpizza: 'frys',
};

/** Where a dietary extra is in the shop; null = not something to buy (e.g. «Ingen ekstra trengs»). */
function dietShopGroup(tag: string, g: DietGroup): ShopGroupId | null {
  if (g === 'pizza-frossen') return 'frys';
  switch (tag) {
    case 'glutenfri':
      return g === 'polser' || g === 'taco' ? 'brod' : 'torrvarer';
    case 'laktosefri':
      return g === 'polser'
        ? 'brod'
        : g === 'pizza-hjemmelaget' || g === 'pasta-varm' || g === 'taco'
          ? 'kjott'
          : 'torrvarer';
    case 'vegetar':
      if (g === 'pizza-hjemmelaget') return null; // «1 langpanne uten skinke»: a way to bake, not an item
      return g === 'polser' || g === 'taco' ? 'kjott' : 'torrvarer';
    case 'ingen-svin':
      if (g === 'pasta-varm') return null; // «Ingen ekstra trengs»
      return g === 'annet' ? 'torrvarer' : 'kjott';
    default:
      return 'torrvarer';
  }
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** «5 pk grillpølser», «2 flasker saft», «Ketchup og sennep: 1 av hver», «2 poser sprøstekt løk». */
function phrase(qty: string, name: string): string {
  if (!qty) return name;
  if (/av hver$/.test(qty) || /^til /.test(qty)) return /^til /.test(qty) ? `${name} ${qty}` : `${name}: ${qty}`;
  return `${qty} ${lowerFirst(name)}`;
}

/** One included Mat line as a list item, or null when it is not something to buy here. */
function fromFoodLine(l: FoodLine): Omit<ShopItem, 'ticked'> | null {
  if (NOT_BOUGHT.has(l.id) || !l.included) return null;
  const group = LINE_GROUP[l.id] ?? 'torrvarer';
  if (l.id === 'saft') {
    // «2 flasker saft» → «Saft» · «2 flasker»
    const qty = l.amount.replace(/ saft$/, '');
    return { id: l.id, group, name: 'Saft', qty, detail: 'Eller jus. Se Mat for mengden', text: phrase(qty, 'saft') };
  }
  const m = l.packs ? /^(\d+ pk) à (.+)$/.exec(l.packs) : null;
  if (m) {
    const qty = m[1];
    return { id: l.id, group, name: l.name, qty, detail: `à ${m[2]}, ${l.amount} i alt`, text: phrase(qty, l.name) };
  }
  return { id: l.id, group, name: l.name, qty: l.amount, text: phrase(l.amount, l.name) };
}

/** The food part of the list. Without a chosen main dish: drinks and fruit only. */
function foodItems(p: Party): { items: Omit<ShopItem, 'ticked'>[]; menuChosen: boolean } {
  const plan: FoodPlan | null = partyFoodPlan(p);
  const menuChosen = !!plan;
  const counts = headCount(p);
  const base =
    plan ??
    // no menu yet: the same rules with no main dish, for the drinks and fruit (they do not depend on it)
    foodPlan({
      menu: { kind: 'annet', text: '' },
      counts: { kids: counts.kidsComing, adults: counts.adultsEating },
      age: oldestAge(p.celebrants),
      diets: [],
      celebrants: p.celebrants.length,
      items: p.foodItems,
    });
  const out: Omit<ShopItem, 'ticked'>[] = [];
  for (const s of base.sections) {
    if (s.id === 'kake') continue;
    if (!menuChosen && s.id === 'main') continue;
    if (s.id === 'hensyn') {
      if (!p.menu) continue;
      const g = dietGroup(p.menu);
      for (const l of s.lines) {
        const group = dietShopGroup(l.id.replace(/^diet-/, ''), g);
        if (!group) continue;
        out.push({ id: l.id, group, name: l.amount, qty: '', detail: `${l.name}. ${l.why}`, text: l.amount });
      }
      continue;
    }
    for (const l of s.lines) {
      const it = fromFoodLine(l);
      if (it) out.push(it);
    }
  }
  return { items: out, menuChosen };
}

/** Goodie bags, candy, candles, tableware, balloons and the crown. */
function partyThings(p: Party): Omit<ShopItem, 'ticked'>[] {
  const hc = headCount(p);
  const bags = Math.max(0, hc.kidsComing);
  const home = new Set(p.haveAtHome);
  const out: Omit<ShopItem, 'ticked'>[] = [];
  const sets = p.celebrants.length;
  if (!home.has('kakelys'))
    out.push({
      id: 'kakelys',
      group: 'fest',
      name: 'Kakelys',
      qty: `${sets} sett`,
      detail:
        sets > 1
          ? `Ett sett per bursdagsbarn: ${p.celebrants.map((c) => `${c.name} ${c.age + 1} lys`).join(', ')}`
          : `${p.celebrants[0].age + 1} lys til ${p.celebrants[0].name}`,
      text: `${sets} sett kakelys`,
    });
  if (!home.has('pappkrus-og-fat')) {
    const people = hc.kidsComing + hc.adultsEating;
    out.push({
      id: 'pappkrus-og-fat',
      group: 'fest',
      name: 'Tallerkener, kopper og servietter',
      qty: `til ${people}`,
      detail: 'Til alle som spiser, barn og voksne',
      text: phrase(`til ${people}`, 'Tallerkener, kopper og servietter'),
    });
  }
  if (!home.has('ballonger'))
    out.push({ id: 'ballonger', group: 'fest', name: 'Ballonger', qty: '1 pk', text: '1 pk ballonger' });
  if (!home.has('bursdagskrone'))
    out.push({
      id: 'bursdagskrone',
      group: 'fest',
      name: sets > 1 ? 'Bursdagskroner' : 'Bursdagskrone',
      qty: `${sets} stk`,
      text: sets > 1 ? `${sets} bursdagskroner` : '1 bursdagskrone',
    });
  out.push({
    id: 'godteposer',
    group: 'godteposer',
    name: 'Godteposer',
    qty: `${bags} stk`,
    detail: 'Én til hvert barn',
    text: `${bags} godteposer`,
  });
  for (const id of GOODIE_BAG_ITEMS) {
    if (p.goodieBags.contents.includes(id)) out.push(goodieBagLine(id, bags, p));
  }
  return out;
}

/** The chip label for each goodie-bag suggestion («Forslag til innhold»). */
export const GOODIE_BAG_LABELS: Record<GoodieBagItemId, string> = {
  godteri: 'Godteri',
  popcorn: 'Popcorn',
  rosiner: 'Rosiner',
  klistremerker: 'Klistremerker',
  sapebobler: 'Såpebobler',
  viskelaer: 'Viskelær/blyant',
  fruktstang: 'Fruktstang',
};

/** One goodie-bag suggestion as a list line: about one per child (candy ca. 100 g per bag). */
function goodieBagLine(id: GoodieBagItemId, bags: number, p: Party): Omit<ShopItem, 'ticked'> {
  const base = { id: `pose-${id}`, group: 'godteposer' as const };
  const one = 'Én til hver pose';
  switch (id) {
    case 'godteri': {
      const qty = formatGrams(bags * C.CANDY_G_CHILD);
      const nuts = p.guests.some(
        (g) => g.status !== 'no' && (g.allergies.includes('notter') || g.allergies.includes('peanott')),
      );
      return {
        ...base,
        name: 'Godteri',
        qty,
        detail: `ca. ${C.CANDY_G_CHILD} g per pose${nuts ? '. Velg nøttefritt: noen har nøtteallergi' : ''}`,
        text: `${qty} godteri til godteposene`,
      };
    }
    case 'popcorn':
      return {
        ...base,
        name: 'Popcorn, små poser',
        qty: `${bags} stk`,
        detail: one,
        text: `${bags} små poser popcorn`,
      };
    case 'rosiner':
      return {
        ...base,
        name: 'Rosiner, små esker',
        qty: `${bags} stk`,
        detail: one,
        text: `${bags} små esker rosiner`,
      };
    case 'klistremerker':
      return {
        ...base,
        name: 'Klistremerker',
        qty: `${bags} ark`,
        detail: 'Ett ark til hver pose',
        text: `${bags} ark klistremerker`,
      };
    case 'sapebobler':
      return { ...base, name: 'Såpebobler', qty: `${bags} stk`, detail: one, text: `${bags} såpebobler` };
    case 'viskelaer':
      return {
        ...base,
        name: 'Viskelær eller blyant',
        qty: `${bags} stk`,
        detail: one,
        text: `${bags} viskelær eller blyanter`,
      };
    case 'fruktstang':
      return { ...base, name: 'Fruktstenger', qty: `${bags} stk`, detail: one, text: `${bags} fruktstenger` };
  }
}

/** «Emmas bursdag 15. nov», «Emma og Jonas' bursdag 15. nov» */
export function shoppingTitle(p: Pick<Party, 'celebrants' | 'date'>): string {
  const { m, d } = parts(p.date);
  return `Handleliste – ${genitive(celebrantNames(p.celebrants))} bursdag ${d}. ${MONTHS_SHORT[m - 1]}`;
}

/** The whole list for a party: grouped by store section, ticked items at the bottom of each group. */
export function handleliste(p: Party): Handleliste {
  const food = foodItems(p);
  const ticked = new Set(p.shopping.ticked);
  const custom: Omit<ShopItem, 'ticked'>[] = p.shopping.custom.map((c) => ({
    id: c.id,
    group: 'egne',
    name: c.text,
    qty: '',
    text: c.text,
    custom: true,
  }));
  const all: ShopItem[] = [...food.items, ...partyThings(p), ...custom].map((i) => ({
    ...i,
    ticked: ticked.has(i.id),
  }));
  const groups: ShopGroup[] = SHOP_GROUPS.map((g) => {
    const items = all.filter((i) => i.group === g.id);
    return { ...g, items: [...items.filter((i) => !i.ticked), ...items.filter((i) => i.ticked)] };
  }).filter((g) => g.items.length > 0);
  return {
    title: shoppingTitle(p),
    groups,
    count: all.length,
    tickedCount: all.filter((i) => i.ticked).length,
    goodieBagSuggestions: GOODIE_BAG_ITEMS.map((id) => ({
      id,
      label: GOODIE_BAG_LABELS[id],
      picked: p.goodieBags.contents.includes(id),
    })),
    menuChosen: food.menuChosen,
  };
}

/**
 * The text «Del listen» shares (to Maxim, by message): plain Norwegian, the groups, one «☐ …» line per
 * item that is NOT ticked yet. No links, no app needed on the other end.
 */
export function shareText(list: Handleliste): string {
  const blocks = list.groups
    .map((g) => ({ title: g.title, items: g.items.filter((i) => !i.ticked) }))
    .filter((g) => g.items.length > 0)
    .map((g) => [g.title, ...g.items.map((i) => `☐ ${i.text}`)].join('\n'));
  return [list.title, ...(blocks.length ? blocks : ['Alt er handlet.'])].join('\n\n');
}

// ---------------- changes (pure; the provider saves them) ----------------

/** Tick or untick one item by its stable id. */
export function withTick(p: Party, id: string, ticked: boolean): Party {
  const rest = p.shopping.ticked.filter((x) => x !== id);
  return { ...p, shopping: { ...p.shopping, ticked: ticked ? [...rest, id] : rest } };
}

/** «Nullstill avkrysninger»: nothing ticked; her own items stay. */
export function withTicksCleared(p: Party): Party {
  return { ...p, shopping: { ...p.shopping, ticked: [] } };
}

/** The longest own item we keep (a line on a phone, not an essay). */
export const CUSTOM_ITEM_MAX = 80;

/** The next free id for her own item: `egen-1`, `egen-2` … (never reuses a number still in the list). */
export function nextCustomId(custom: readonly CustomShoppingItem[]): string {
  const max = custom.reduce((n, c) => Math.max(n, Number(/^egen-(\d+)$/.exec(c.id)?.[1] ?? 0)), 0);
  return `egen-${max + 1}`;
}

/** «Legg til vare»: her own free-text item at the bottom of «Egne varer». Blank text changes nothing. */
export function withCustomItem(p: Party, text: string): Party {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, CUSTOM_ITEM_MAX);
  if (!t) return p;
  const item = { id: nextCustomId(p.shopping.custom), text: t };
  return { ...p, shopping: { ...p.shopping, custom: [...p.shopping.custom, item] } };
}

/** Deletes her own item (and its tick). */
export function withoutCustomItem(p: Party, id: string): Party {
  return {
    ...p,
    shopping: {
      ticked: p.shopping.ticked.filter((x) => x !== id),
      custom: p.shopping.custom.filter((c) => c.id !== id),
    },
  };
}

/** A «Forslag til innhold» chip: tap to put it on the list, tap again to take it off. */
export function withGoodieBagItem(p: Party, id: GoodieBagItemId, picked: boolean): Party {
  const rest = p.goodieBags.contents.filter((x) => x !== id);
  const contents = picked ? GOODIE_BAG_ITEMS.filter((x) => x === id || rest.includes(x)) : rest;
  // taken off: its tick goes too, so it comes back unticked
  const ticked = picked ? p.shopping.ticked : p.shopping.ticked.filter((x) => x !== `pose-${id}`);
  return { ...p, goodieBags: { ...p.goodieBags, contents }, shopping: { ...p.shopping, ticked } };
}

/** The Handleliste card on Planen: «12 varer», «12 varer · 3 kjøpt», «Alt er handlet». */
export function shoppingCardLine(list: Pick<Handleliste, 'count' | 'tickedCount'>): string {
  const varer = `${list.count} ${list.count === 1 ? 'vare' : 'varer'}`;
  if (list.count > 0 && list.tickedCount >= list.count) return `Alt er handlet · ${varer}`;
  return list.tickedCount > 0 ? `${varer} · ${list.tickedCount} kjøpt` : varer;
}
