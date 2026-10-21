/**
 * Every number the rules use, in one place (spec §5–6).
 * Values marked (I) in the spec are inferences/defaults we chose; change them here only.
 */

export type Band = 'A' | 'B' | 'C' | 'D';

/**
 * Age bands (§4.2): 3–4 A · 5–6 B · 7–9 C · 10 D (D is I). The app plans for ages 3–10.
 * A joint birthday uses the OLDEST child's band for portions (it feeds the most).
 */
export function band(age: number): Band {
  if (age <= 4) return 'A';
  if (age <= 6) return 'B';
  if (age <= 9) return 'C';
  return 'D';
}

/** Share of not-yet-answered families where one adult stays (§4.1, I). */
export function stayRate(age: number): number {
  if (age <= 3) return 0.5; // 3-year-olds: often one adult stays
  if (age <= 5) return 0.15;
  return 0;
}

export const DEFAULT_HOST_ADULTS = 2; // (I)
/** Children at the party in total, birthday children included. */
export const DEFAULT_CHILDREN = 12;
export const MAX_CHILDREN = 40;
/** The fewest children a party can have: the birthday children plus at least one guest. */
export function minChildren(celebrants: number): number {
  return Math.max(1, celebrants) + 1;
}
/** Keeps a children count inside minChildren..MAX_CHILDREN. */
export function clampChildren(n: number, celebrants: number): number {
  return Math.min(MAX_CHILDREN, Math.max(minChildren(celebrants), Math.round(n)));
}

// ---- sausages (§6.4, reworked 21 Oct 2026) ----
/**
 * Sanity check (not the source of the rule): en ekte fest med 15 barn (Ekaterina's, KIWI 26.08.2026) kjøpte
 * 60 grillpølser og hadde ~20 til overs, so ~40 were eaten by 15 children and the parents who stayed; the
 * bread was lomper and pølsebrød, about half each. Her words: just an example, use your own reasoning.
 * The rule below gives that party 40.
 *
 * Packs read on Oda (oda.com) on 21 Oct 2026, the «Wienerpølser» and «Grillpølser» categories
 * (https://oda.com/no/categories/26-kylling-og-kjott/29-polser/3044-wienerpolser/ and
 * https://oda.com/no/categories/26-kylling-og-kjott/29-polser/3004-grillpolser/) and Oda search:
 * - Gilde Grillpølser, 600 g = 10 stk. Oda lists it as «600 g»; the 10 stk is on Gilde's pack.
 *   The 3 × 600 g storpakning is not on Oda. https://oda.com/no/products/957-gilde-grillpolser/
 * - Gilde Wienerpølse, 8 stk, 520 g. https://oda.com/no/products/956-gilde-wienerpolse-8-stk/
 * - Buer Lomper Original, 10 stk, 290 g. https://oda.com/no/products/69345-buer-lomper-original-10-stk/
 * - Pølsebrød: packs of 8 (Bakehuset pølsebrød 8 stk, what she buys; not sold on Oda). On Oda: Hatting Høvding fine
 *   pølsebrød 10 × 50 g, Hatting Grove pølsebrød 10 stk 440 g, Prima Lavpris Pølsebrød 12 stk 396 g,
 *   Mesterbakeren Brioche pølsebrød 4 stk.
 * Also on Oda that day: Gilde Favorittwiener 24 stk (ca. 1,56 kg), Strøm-Larsen Wienerpølser 8 stk 520 g,
 * Leiv Vidar Wienerpølser 14 stk 770 g, Gilde Ostegrill 6 stk 480 g, Strøm-Larsen Grillpølser 400 g and
 * 1 kg; Ola Lompa Store lomper 290 g, Buer/Ola Lompa Store speltlomper 8 stk, frosne lomper 10 stk.
 */
export const SAUSAGE_PRODUCT = {
  grillpolser: { name: 'Gilde Grillpølser', count: 10, grams: 600 },
  wienerpolser: { name: 'Gilde Wienerpølse', count: 8, grams: 520 },
} as const;
/**
 * Gilde Grillpølse «storpakning»: 3 × 10 stk (3 × 600 g), sold in stores (she bought it at KIWI). Not listed on
 * Oda on 21 Oct 2026 (only the single 600 g / 10 stk pack), so the single pack is the rounding unit and the
 * grill line mentions the storpakning as an alternative from 3 packs up.
 */
export const GRILL_STORPAKNING_PACKS = 3;
export const LOMPER_PRODUCT = { name: 'lomper', count: 10 } as const;
export const POLSEBROD_PRODUCT = { name: 'pølsebrød', count: 8 } as const;

/**
 * Sausages each person eats (what is eaten, not bought): 3–4 år 1,5 · 5–6 år 2 · 7–10 år 2,5 · a grown-up 1,5.
 * Portions follow the OLDEST birthday child. The sanity check: 15 × 2 + 5 adults × 1,5 = 37,5 → 38.
 * Then 2 extra (SAUSAGE_EXTRA) and up to whole packs: 38 + 2 = 40 → 4 pk à 10. Until 21 Oct 2026 the rule was 2 per child
 * for 5–6 år plus 35 % (grill) / 25 % (wiener) and gave Emma 50 grillpølser; now 40.
 */
export const SAUSAGE_PER_CHILD: Record<Band, number> = { A: 1.5, B: 2, C: 2.5, D: 2.5 };
export const SAUSAGE_PER_ADULT = 1.5; // (I)
/** A couple of sausages on top before rounding up to whole packs, so a count that fits a pack exactly still has some to spare. */
export const SAUSAGE_EXTRA = 2;
export const SAUSAGE_PACK = {
  grillpolser: SAUSAGE_PRODUCT.grillpolser.count,
  wienerpolser: SAUSAGE_PRODUCT.wienerpolser.count,
};
export const LOMPER_PACK = LOMPER_PRODUCT.count;
export const POLSEBROD_PACK = POLSEBROD_PRODUCT.count;
/** Lomper and pølsebrød both on: each covers about half the sausages. One left out: the other covers all. */
export const BREAD_SHARE_WHEN_BOTH = 0.5;
/**
 * One bottle of ketchup (ca. 500 g), and one of sennep, for ca. 25 people: ca. 2 pølser each, and not all
 * children take both (I).
 */
export const CONDIMENT_PER_EATERS = 25;
/** Sprøstekt løk, 100 g bags: ca. 5 g per pølse, ca. 2 pølser per person → one bag per ca. 10 people (I). */
export const CRISPY_ONION_PER_EATERS = 10;

// ---- pizza (§6.5) ----
export const PIZZA_SLICES_PER_CHILD: Record<Band, number> = { A: 1.5, B: 2, C: 2.5, D: 3 };
export const PIZZA_SLICES_PER_ADULT = 2.5;
export const PIZZA_BUFFER = 0.25; // (I)
export const PIZZA_UNITS_PER = { frossen: 8, bestilt30: 8, bestilt40: 14, langpanne: 16 }; // (I)
export const FROZEN_PIZZAS_PER_ROUND = 2;
export const FROZEN_ROUND_MIN = 15;

// ---- taco (§6.6) ----
export const TACO_MEAT_G: Record<Band, number> = { A: 70, B: 90, C: 110, D: 130 };
export const TACO_MEAT_G_ADULT = 130;
export const TACO_TORTILLA: Record<Band, number> = { A: 1.5, B: 2, C: 2.5, D: 3 };
export const TACO_TORTILLA_ADULT = 2.5;
export const TACO_CHEESE_G: Record<Band, number> = { A: 20, B: 30, C: 40, D: 50 };
export const TACO_CHEESE_G_ADULT = 40;
export const TACO_BUFFER = 0.25;
export const TACO_MEAT_PACK_G = 400;
export const TACO_TORTILLA_PACK = 8; // (I)
export const TACO_CHEESE_PACK_G = 350; // (I)
export const TACO_SIDES_PER_EATERS = 8; // (I)

// ---- pasta / pastasalat (Mat screen, Oct 2026; all I) ----
export const PASTA_DRY_G: Record<Band, number> = { A: 50, B: 60, C: 70, D: 80 };
export const PASTA_DRY_G_ADULT = 90;
export const PASTA_BUFFER = 0.2;
export const PASTA_PACK_G = 500;
export const PASTA_HAM_G: Record<Band, number> = { A: 15, B: 20, C: 25, D: 30 };
export const PASTA_HAM_G_ADULT = 40;
export const PASTA_HAM_PACK_G = 150;
export const PASTA_VEG_PER_EATERS = 8; // 1 boks mais, 1 beger cherrytomater, 1 agurk per started 8
export const PASTA_DRESSING_PER_EATERS = 12; // 1 flaske
export const PASTA_SAUCE_PER_PORTIONS = 6; // 1 glass ≈ 6 barneporsjoner; an adult is 1,5
export const PASTA_CHEESE_PER_EATERS = 15; // 1 pose revet ost

// ---- drinks on the Mat screen (I) ----
export const JUICE_DL_CHILD = 5; // jus (juice) instead of saft: the same volume as ready-mixed saft
export const WATER_DL_PER_PERSON = 2;

// ---- extras (§6.7) ----
export const SAFT_DL_CHILD = 5;
export const SAFT_DL_ADULT = 6;
export const SAFT_LITRES_PER_BOTTLE = 5; // 1 l concentrate + 4 l water (I)
export const FRUIT_G_CHILD = 130;
export const FRUIT_G_ADULT = 140;
export const CAKE_PIECES_FACTOR = 1.1; // (I)
export const CAKE_PIECES_PER_LANGPANNE = 24;
export const MUFFINS_PER_CHILD = 0.75; // (I)
/**
 * Candy per goodie bag (one bag per child). NOT part of the food (Mat screen): candy belongs to the
 * goodie bags (godteposer): «Godteri» is one of the suggestions on Handleliste, not pre-selected
 * (party.goodieBags.contents, rules/shopping.ts).
 */
export const CANDY_G_CHILD = 100;
export const GOODY_BAG_PACK = 10; // (I)
export const PLATES_FACTOR = 1.2;
export const PARTY_PACK = 20; // plates, napkins, cups (I)

// ---- to-dos (§6.1) ----
export const RSVP_DAYS_DEFAULT = 7;
export const RSVP_FULL_PLAN_MIN_AVAIL = 14;
export const SHORT_NOTICE_DAYS = 7;

/**
 * Piñata and skattejakt start OFF: nothing in the plan, summary or to-dos assumes an
 * activity the parent hasn't chosen. The Program step (milestone 3) turns them on;
 * PROGRAMME_SUGGESTED_AGES is when it should suggest them (§4).
 */
export function programmeDefaults(_age: number) {
  return { includePinata: false, includeSkattejakt: false };
}
export const PROGRAMME_SUGGESTED_AGES = { min: 3, max: 9 } as const;

/** Muffins on by default for ages 3–8 (I). */
export function muffinsDefault(age: number): boolean {
  return age >= 3 && age <= 8;
}

/** Float-safe ceiling (§5): (13×2 + 4×2) × 1.35 = 45.9 → 46, and 45.000000001 → 45. */
export function ceilSafe(x: number): number {
  return Math.ceil(x - 1e-9);
}
