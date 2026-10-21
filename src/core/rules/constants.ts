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
export const DEFAULT_KIDS_INVITED = 10;
export const MIN_KIDS = 1;
export const MAX_KIDS = 40;

// ---- sausages (§6.4) ----
export const SAUSAGE_PER_CHILD: Record<Band, number> = { A: 1.5, B: 2, C: 2.5, D: 3 };
export const SAUSAGE_PER_ADULT = 2; // (I)
export const SAUSAGE_BUFFER = { grillpolser: 0.35, wienerpolser: 0.25 }; // (I)
export const SAUSAGE_PACK = { grillpolser: 10, wienerpolser: 8 }; // (I) grill pack count unconfirmed
export const LOMPER_PACK = 10;
export const POLSEBROD_PACK = 8;
export const CONDIMENT_PER_EATERS = 20; // 1 ketchup/sennep/løk per started 20 eaters (I)

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
export const JUICE_DL_CHILD = 5; // juice instead of saft: the same volume as ready-mixed saft
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
 * Candy per child. NOT used by the food (Mat screen, shopping list): candy belongs to the goodie bags
 * (godteposer), included by default with opt-out, which come in a later PR (docs/ARCHITECTURE.md).
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
