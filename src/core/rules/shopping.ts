/**
 * Handleliste: everything to buy for the party, generated from the party every time (pure,
 * deterministic, fixed Norwegian templates, no AI). Only the ticks and her own items are stored
 * (party.shopping), keyed by stable item ids, so a menu change, a deselected food line or a new
 * children count updates the list while the ticks stay.
 *
 * Sources:
 * - the food: every included line of the Mat screen (rules/menu.ts), the same amounts and pack sizes;
 *   a line she deselected on Mat is left out. Not on the list: her own dish («Noe annet»), the oven time,
 *   the trays of homemade pizza (the ingredients are listed), tap water and the Mat screen's cake line (the
 *   cake's own lines come from the Kake screen, below);
 * - the cake (rules/cake.ts, «Til kaken»): the Toro packs, glaze and butter, the muffin packs, or the
 *   ingredients of the from-scratch recipe; nothing for a ready-made cake;
 * - drinks and fruit (also when no main dish is chosen yet: they do not depend on it);
 * - the dietary extras ticked on Mat («1 pk kyllingpølser»);
 * - the activities picked on Program (rules/programme.ts, «Til lekene»): the piñata and candy to fill it,
 *   the fiskedam's sheet, rod and small prizes, eggs or potatoes, muffin decorations; nothing twice;
 * - party things: goodie bags, candles (one set per birthday child), plates/cups/napkins, balloons
 *   and the birthday crown, unless «Har dere dette hjemme?» says they are at home;
 * - the goodie bags (optional, rules/goodieBags.ts): the bags and what she picked on the Godteposer screen
 *   (none by default), one per child, candy ca. 100 g per bag; nothing when she chose «Vi dropper godteposer»;
 * - her own free-text items («Legg til vare»).
 */
import type { CustomShoppingItem, GoodieBagItemId, Party } from '../model';
import { DIET_TAGS, GOODIE_BAG_ITEMS } from '../model';
import {
  dietGroup,
  foodPlan,
  isMainSection,
  partyFoodPlan,
  type DietGroup,
  type FoodLine,
  type FoodPlan,
} from './menu';
import { menuDishes } from './dishes';
import { cakeShopLines } from './cake';
import { programmeShopLines } from './programme';
import { goodieShopLines } from './goodieBags';
import { headCount } from './people';
import { celebrantNames, oldestAge } from './celebrants';
import { genitive } from '../texts/render';
import { formatDayMonthShort } from './dates';
import { liveRecord, t } from '../../i18n/i18n';
import { forPeople, packsWord, pcs, sets } from './units';

export type ShopGroupId =
  'kjott' | 'brod' | 'frukt' | 'drikke' | 'torrvarer' | 'frys' | 'kake' | 'leker' | 'fest' | 'godteposer' | 'egne';

/** Store sections, in the order the list shows them. Empty sections are not shown. */
const SHOP_GROUP_IDS: readonly ShopGroupId[] = [
  'kjott',
  'brod',
  'frukt',
  'drikke',
  'torrvarer',
  'frys',
  'kake',
  'leker',
  'fest',
  'godteposer',
  'egne',
];
/** The section titles in the active language (read each time). */
const SHOP_GROUP_TITLES = liveRecord(SHOP_GROUP_IDS, (id) => `rules.shop.groups.${id}`);
export const SHOP_GROUPS: readonly { readonly id: ShopGroupId; readonly title: string }[] = SHOP_GROUP_IDS.map(
  (id) => ({
    id,
    get title() {
      return SHOP_GROUP_TITLES[id];
    },
  }),
);

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
  // homemade pizza (PR #5): fresh dough and ready-baked bases by the bread, toppings where they are
  pizzadeig: 'brod',
  pizzabunner: 'brod',
  pizzamiks: 'torrvarer',
  hvetemel: 'torrvarer',
  gjaer: 'kjott',
  pizzasaus: 'torrvarer',
  pepperoni: 'kjott',
  kebab: 'kjott',
  paprika: 'frukt',
  sopp: 'torrvarer',
  ananas: 'torrvarer',
  mais: 'torrvarer',
  rommedressing: 'torrvarer',
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

/**
 * «5 pk grillpølser», «2 flasker saft», «Ketchup og sennep: 1 av hver», «2 poser sprøstekt løk».
 * `style`: 'each' for «1 av hver» amounts, 'for' for «til 17» (plates, cups and napkins).
 */
function phrase(qty: string, name: string, style?: 'each' | 'for'): string {
  if (!qty) return name;
  if (style === 'each') return t('rules.shop.phraseEach', { name, qty });
  if (style === 'for') return t('rules.shop.phraseFor', { name, qty });
  return t('rules.shop.phrase', { qty, name: lowerFirst(name) });
}

/** Lines whose amount is «N av hver» (ketchup and sennep, the taco and pasta sides). */
const EACH_LINES = new Set(['ketchup', 'tacotilbehor', 'isberg', 'pastagront']);

/** One included Mat line as a list item, or null when it is not something to buy here. */
function fromFoodLine(l: FoodLine): Omit<ShopItem, 'ticked'> | null {
  if (NOT_BOUGHT.has(l.id) || !l.included) return null;
  const group = LINE_GROUP[l.id] ?? 'torrvarer';
  if (l.id === 'saft') {
    // «2 flasker saft» → «Saft» · «2 flasker»
    const bottles = Number(/\d+/.exec(l.amount)?.[0] ?? 0);
    const qty = t('units.bottles', { count: bottles });
    return {
      id: l.id,
      group,
      name: t('rules.shop.saft'),
      qty,
      detail: t('rules.shop.saftDetail'),
      text: phrase(qty, t('rules.shop.saftLower')),
    };
  }
  if (l.packCount !== undefined && l.packSize !== undefined) {
    const qty = packsWord(l.packCount);
    return {
      id: l.id,
      group,
      name: l.name,
      qty,
      detail: t('rules.shop.packDetail', { size: l.packSize, total: l.amount }),
      text: phrase(qty, l.name),
    };
  }
  return {
    id: l.id,
    group,
    name: l.name,
    qty: l.amount,
    text: phrase(l.amount, l.name, EACH_LINES.has(l.id) ? 'each' : undefined),
  };
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
    if (!menuChosen && isMainSection(s.id)) continue;
    if (s.id === 'hensyn') {
      const first = menuDishes(p.menu)[0];
      if (!first) continue;
      for (const l of s.lines) {
        // `diet-glutenfri` belongs to the first dish; with several, `diet-glutenfri-pizza-hjemmelaget` names its dish
        const rest = l.id.replace(/^diet-/, '');
        const tag = DIET_TAGS.find((t) => rest === t || rest.startsWith(`${t}-`)) ?? rest;
        const g = rest.length > tag.length ? (rest.slice(tag.length + 1) as DietGroup) : dietGroup(first);
        const group = dietShopGroup(tag, g);
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

/**
 * The cake's lines («Til kaken»), from the choice on the Kake screen. Their ids start with «kake-», so
 * nothing is added twice; flour that the homemade pizza also needs says so in its detail.
 */
function cakeItems(p: Party, food: Omit<ShopItem, 'ticked'>[]): Omit<ShopItem, 'ticked'>[] {
  const pizzaFlour = food.some((i) => i.id === 'hvetemel');
  return cakeShopLines(p).map((l) => ({
    ...l,
    group: 'kake' as const,
    detail: l.id === 'kake-hvetemel' && pizzaFlour ? t('rules.cake.shop.flourAlso') : l.detail,
  }));
}

/** Program («Til lekene»): only what the picked activities need (rules/programme.ts). */
function programmeItems(p: Party): Omit<ShopItem, 'ticked'>[] {
  return programmeShopLines(p).map((l) => ({ ...l, group: 'leker' as const }));
}

/** Goodie bags, candy, candles, tableware, balloons and the crown. */
function partyThings(p: Party): Omit<ShopItem, 'ticked'>[] {
  const hc = headCount(p);
  const home = new Set(p.haveAtHome);
  const out: Omit<ShopItem, 'ticked'>[] = [];
  const sets_ = p.celebrants.length;
  if (!home.has('kakelys'))
    out.push({
      id: 'kakelys',
      group: 'fest',
      name: t('rules.shop.candles'),
      qty: sets(sets_),
      detail:
        sets_ > 1
          ? t('rules.shop.candlesJoint', {
              list: p.celebrants.map((c) => `${c.name} ${t('rules.shop.candlesFor', { n: c.age + 1 })}`).join(', '),
            })
          : t('rules.shop.candlesOne', { n: p.celebrants[0].age + 1, name: p.celebrants[0].name }),
      text: t('rules.shop.candlesText', { count: sets_ }),
    });
  if (!home.has('pappkrus-og-fat')) {
    const people = hc.kidsComing + hc.adultsEating;
    out.push({
      id: 'pappkrus-og-fat',
      group: 'fest',
      name: t('rules.shop.tableware'),
      qty: forPeople(people),
      detail: t('rules.shop.tablewareDetail'),
      text: phrase(forPeople(people), t('rules.shop.tableware'), 'for'),
    });
  }
  if (!home.has('ballonger'))
    out.push({
      id: 'ballonger',
      group: 'fest',
      name: t('rules.shop.balloons'),
      qty: packsWord(1),
      text: t('rules.shop.balloonsText'),
    });
  if (!home.has('bursdagskrone'))
    out.push({
      id: 'bursdagskrone',
      group: 'fest',
      name: t(sets_ > 1 ? 'rules.shop.crowns' : 'rules.shop.crown'),
      qty: pcs(sets_),
      text: t('rules.shop.crownText', { count: sets_ }),
    });
  // the goodie bags and what she picked for them (rules/goodieBags.ts); nothing when she drops them
  out.push(...goodieShopLines(p).map((l) => ({ ...l, group: 'godteposer' as const })));
  return out;
}

/** «Emmas bursdag 15. nov», «Emma og Jonas' bursdag 15. nov» */
export function shoppingTitle(p: Pick<Party, 'celebrants' | 'date'>): string {
  // «15. nov» (no dot after the month here) / «15 Nov»
  const date = formatDayMonthShort(p.date).replace(/\.$/, '');
  return t('rules.shop.title', { gen: genitive(celebrantNames(p.celebrants)), date });
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
  const all: ShopItem[] = [
    ...food.items,
    ...cakeItems(p, food.items),
    ...programmeItems(p),
    ...partyThings(p),
    ...custom,
  ].map((i) => ({
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
  return [list.title, ...(blocks.length ? blocks : [t('rules.shop.allBought')])].join('\n\n');
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

/** A «Forslag til innhold» chip on the Godteposer screen: tap to put it on the list, tap again to take it off. */
export function withGoodieBagItem(p: Party, id: GoodieBagItemId, picked: boolean): Party {
  const rest = p.goodieBags.contents.filter((x) => x !== id);
  const contents = picked ? GOODIE_BAG_ITEMS.filter((x) => x === id || rest.includes(x)) : rest;
  // taken off: its tick goes too, so it comes back unticked
  const ticked = picked ? p.shopping.ticked : p.shopping.ticked.filter((x) => x !== `pose-${id}`);
  return { ...p, goodieBags: { ...p.goodieBags, contents }, shopping: { ...p.shopping, ticked } };
}

/** The Handleliste card on Planen: «12 varer», «12 varer · 3 kjøpt», «Alt er handlet». */
export function shoppingCardLine(list: Pick<Handleliste, 'count' | 'tickedCount'>): string {
  const items = t('rules.shop.items', { count: list.count });
  if (list.count > 0 && list.tickedCount >= list.count) return t('rules.shop.cardAllBought', { items });
  return list.tickedCount > 0 ? t('rules.shop.cardTicked', { items, count: list.tickedCount }) : items;
}
