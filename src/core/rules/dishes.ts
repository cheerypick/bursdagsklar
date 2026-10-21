/**
 * The menu as a list of dishes. A party can have one main dish or several at once (Pølser and Pizza, plus
 * «Noe annet»); `MenuChoice` stores several as `{ kind: 'flere', dishes }`. Pure, no UI.
 */
import type { Dish, MenuChoice } from '../model';
import { ALLOW_POLSER_AND_PIZZA } from './constants';

/** The Mat cards. Taco and pasta keep their rules but are hidden for now (see HIDDEN_MENU_CARDS). */
export type MenuCardId = 'polser' | 'pizza' | 'taco' | 'pasta' | 'annet';
/** Every card the rules know, in order. */
export const MENU_CARDS: readonly MenuCardId[] = ['polser', 'pizza', 'taco', 'pasta', 'annet'];
/**
 * Hidden from the Mat screen (Ekaterina, 21 Oct 2026: nobody serves taco or pasta to 15 four-year-olds).
 * Their rules, texts and tests stay, so they can come back later, e.g. for older children: remove an id
 * here and the card shows again. A saved party with a hidden dish opens with that dish unpicked
 * (`withoutHiddenDishes`, run when a party is loaded).
 */
export const HIDDEN_MENU_CARDS: readonly MenuCardId[] = ['taco', 'pasta'];
/**
 * The cards the Mat screen shows: Pølser, Pizza, Noe annet. Pølser and Pizza exclude each other while
 * ALLOW_POLSER_AND_PIZZA is false (EXCLUSIVE_MENU_CARDS); «Noe annet» goes with either.
 */
export const VISIBLE_MENU_CARDS: readonly MenuCardId[] = MENU_CARDS.filter((c) => !HIDDEN_MENU_CARDS.includes(c));

export function dishCard(d: Dish): MenuCardId {
  switch (d.kind) {
    case 'grillpolser':
    case 'wienerpolser':
      return 'polser';
    case 'pizza':
      return 'pizza';
    case 'taco':
      return 'taco';
    case 'pasta':
      return 'pasta';
    case 'annet':
    case 'egen':
      return 'annet';
  }
}

/** The dishes of a menu, in card order (Pølser, Pizza, …, Noe annet). null → []. */
export function menuDishes(menu: MenuChoice | null | undefined): Dish[] {
  if (!menu) return [];
  const list = menu.kind === 'flere' ? (Array.isArray(menu.dishes) ? menu.dishes : []) : [menu];
  return [...list].sort((a, b) => MENU_CARDS.indexOf(dishCard(a)) - MENU_CARDS.indexOf(dishCard(b)));
}

/** The menu for a list of dishes: none → null, one → that dish, more → `{ kind: 'flere' }`. One per card. */
export function menuFromDishes(dishes: readonly Dish[]): MenuChoice | null {
  const byCard = new Map<MenuCardId, Dish>();
  for (const d of dishes) byCard.set(dishCard(d), d);
  const list = MENU_CARDS.filter((c) => byCard.has(c)).map((c) => byCard.get(c)!);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  return { kind: 'flere', dishes: list };
}

/** The dish picked on one card, if any. */
export function dishOn(menu: MenuChoice | null | undefined, card: MenuCardId): Dish | undefined {
  return menuDishes(menu).find((d) => dishCard(d) === card);
}

/**
 * Cards that cannot be picked together (one main dish that is calculated): Pølser and Pizza, while
 * ALLOW_POLSER_AND_PIZZA is false (MVP, Ekaterina 21 Oct 2026). Empty when it is true.
 */
export const EXCLUSIVE_MENU_CARDS: readonly MenuCardId[] = ALLOW_POLSER_AND_PIZZA ? [] : ['polser', 'pizza'];

/** The cards picking `card` unpicks (Pizza unpicks Pølser and the other way round). */
export function cardsExcludedBy(card: MenuCardId): MenuCardId[] {
  return EXCLUSIVE_MENU_CARDS.includes(card) ? EXCLUSIVE_MENU_CARDS.filter((c) => c !== card) : [];
}

/** The menu with one card's dish replaced (or removed with `null`). Picking Pizza unpicks Pølser (and vice versa). */
export function withDishOn(menu: MenuChoice | null, card: MenuCardId, dish: Dish | null): MenuChoice | null {
  const drop = new Set<MenuCardId>([card, ...(dish ? cardsExcludedBy(card) : [])]);
  const rest = menuDishes(menu).filter((d) => !drop.has(dishCard(d)));
  return menuFromDishes(dish ? [...rest, dish] : rest);
}

/**
 * Only one of the exclusive cards kept: the first in card order (Pølser before Pizza), plus everything
 * else (Noe annet). Old saved data with both pølser and pizza opens with pølser (+ noe annet).
 */
export function withExclusiveDishes(dishes: readonly Dish[]): Dish[] {
  const sorted = [...dishes].sort((a, b) => MENU_CARDS.indexOf(dishCard(a)) - MENU_CARDS.indexOf(dishCard(b)));
  let taken = false;
  return sorted.filter((d) => {
    if (!EXCLUSIVE_MENU_CARDS.includes(dishCard(d))) return true;
    if (taken) return false;
    taken = true;
    return true;
  });
}

/** Dishes whose amounts are calculated (everything but «Noe annet»): they share the portions. */
export function countedDishes(menu: MenuChoice | null | undefined): Dish[] {
  return menuDishes(menu).filter((d) => d.kind !== 'annet' && d.kind !== 'egen');
}

/**
 * The part of the portions each calculated dish covers: 1 for one dish, ½ each for pølser + pizza.
 * «Noe annet» comes on top (the parent decides its amount), so it does not halve anything.
 */
export function dishShare(menu: MenuChoice | null | undefined): number {
  const n = countedDishes(menu).length;
  return n <= 1 ? 1 : 1 / n;
}

/**
 * A saved menu without the hidden dishes (taco, pasta): they are dropped, and a menu that was only a
 * hidden dish becomes «not chosen» (null). Anything malformed also becomes null instead of crashing.
 * Pølser + pizza saved together (before 21 Oct 2026) keep only pølser, while ALLOW_POLSER_AND_PIZZA is false.
 */
export function withoutHiddenDishes(menu: unknown): MenuChoice | null {
  if (!menu || typeof menu !== 'object' || typeof (menu as { kind?: unknown }).kind !== 'string') return null;
  const m = menu as MenuChoice;
  const known = (d: unknown): d is Dish =>
    !!d && typeof d === 'object' && typeof (d as Dish).kind === 'string' && (d as Dish).kind !== ('flere' as string);
  const list = m.kind === 'flere' ? (Array.isArray(m.dishes) ? m.dishes.filter(known) : []) : [m];
  const kept = list.filter((d) => {
    try {
      return MENU_CARDS.includes(dishCard(d)) && !HIDDEN_MENU_CARDS.includes(dishCard(d));
    } catch {
      return false;
    }
  });
  return menuFromDishes(withExclusiveDishes(kept));
}
