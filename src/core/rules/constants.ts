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
 * Context: en ekte fest med 15 barn (Ekaterina's, KIWI 26.08.2026) kjøpte 60 grillpølser og hadde ~20 til
 * overs; the bread was lomper and pølsebrød. On 21 Oct 2026 she chose the more generous amounts (Emma: 50
 * grillpølser, ca. 30 lomper and 30 pølsebrød) over a tighter rule that gave 40 / 20 / 24.
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
 * Sausages to buy per person (Ekaterina, 21 Oct 2026): 3 per child, every age 3–10, and 2 per grown-up, then up to
 * whole packs. No extra percentage: rounding up to packs is the margin. Emma (13 barn, 4 voksne):
 * 13 × 3 + 4 × 2 = 47 → 5 pk à 10 = 50 grillpølser (wienerpølser: 6 pk à 8 = 48).
 * Kept per age band so a band can differ later; today they are all 3.
 */
export const SAUSAGE_PER_CHILD: Record<Band, number> = { A: 3, B: 3, C: 3, D: 3 };
export const SAUSAGE_PER_ADULT = 2;
export const SAUSAGE_PACK = {
  grillpolser: SAUSAGE_PRODUCT.grillpolser.count,
  wienerpolser: SAUSAGE_PRODUCT.wienerpolser.count,
};
export const LOMPER_PACK = LOMPER_PRODUCT.count;
export const POLSEBROD_PACK = POLSEBROD_PRODUCT.count;
/**
 * Lomper and pølsebrød both on: each covers about 60 % of the sausages, up to whole packs, so together there is
 * some bread to spare (people mix, and nobody knows in advance who wants which). Emma: 60 % of 50 = 30 →
 * lomper 3 pk à 10 = 30, pølsebrød 4 pk à 8 = 32. One left out: the other covers every sausage.
 */
export const BREAD_SHARE_WHEN_BOTH = 0.6;
/**
 * One bottle of ketchup (ca. 500 g), and one of sennep, for ca. 25 people: ca. 2 pølser each, and not all
 * children take both (I).
 */
export const CONDIMENT_PER_EATERS = 25;
/** Sprøstekt løk, 100 g bags: ca. 5 g per pølse, ca. 2 pølser per person → one bag per ca. 10 people (I). */
export const CRISPY_ONION_PER_EATERS = 10;

// ---- pizza (§6.5, reworked 21 Oct 2026) ----
/**
 * Pølser AND pizza at the same party (each covering half the portions) is switched off for the MVP
 * (Ekaterina, 21 Oct 2026): the two cards work like a radio, picking one unpicks the other. The halving
 * code (rules/dishes.ts `dishShare`, the «halvparten» reason lines) stays; set this to true to bring it
 * back. «Noe annet» can always be added on top of either, it never halved anything.
 */
export const ALLOW_POLSER_AND_PIZZA = false;
/**
 * Ekaterina's rule (21 Oct 2026): 1 langpanne = 12 biter; 2 biter per barn, 3 per voksen. For 7–10 år we use
 * 3 per barn, following the OLDEST birthday child like every other portion. No extra percentage on top:
 * the rounding up to whole langpanner is the margin. Emma (13 barn, 4 voksne, 5 år): 26 + 12 = 38 biter
 * → 4 langpanner (48 biter).
 */
export const PIZZA_SLICES_PER_CHILD: Record<Band, number> = { A: 2, B: 2, C: 3, D: 3 };
export const PIZZA_SLICES_PER_ADULT = 3;
export const PIZZA_SLICES_PER_LANGPANNE = 12;
/** Frozen and takeaway pizza: pieces per pizza (I). Homemade uses PIZZA_SLICES_PER_LANGPANNE. */
export const PIZZA_UNITS_PER = { frossen: 8, bestilt30: 8, bestilt40: 14 }; // (I)

/**
 * Homemade pizza: products and pack sizes read on Oda (oda.com) on 21 Oct 2026 (public product pages,
 * no prices; /home/user/tab/files/oda-pizza-sortiment.md at the time). Every «per langpanne» amount is
 * an ASSUMPTION (ANTAGELSE) of ours; Oda's pages say nothing about how far a pack goes, except Peppes
 * «Familie 3–4 personer» and Toro's «melmiks til en langpannepizza» (toro.no).
 *
 * Dough («Bunn»), default first:
 * - Ferdig pizzadeig (DEFAULT): Peppes Pizza Pizzabunn original 550 g, «Familie 3–4 personer»
 *   https://oda.com/no/products/4633-peppes-pizza-pizzabunn-original-familie-3-4-person/ , or
 *   REMA 1000 Fersk stor pizzabunn 550 g https://oda.com/no/products/69115-r-fersk-stor-pizzabunn/ .
 *   Fresh rolled dough. ASSUMPTION: 1 pk = 1 langpanne (= 12 biter).
 * - Ferdigstekte bunner: Staur Fjellbakeri Pizzabunn hvete ca. 29 cm 2 stk (360 g)
 *   https://oda.com/no/products/36162-staur-fjellbakeri-pizzabunn-hvete-ca-29cm-2stk/ , Villa Paradiso Pronto
 *   italienske pizzabunner 2 stk (500 g) https://oda.com/no/products/63698-villa-paradiso-pronto-italienske-pizzabunner-2stk/ .
 *   Counted per person (KIDS_PER_ROUND_BASE below), not per biter. ASSUMPTION: 2 round bases of ca. 29 cm
 *   (ca. 2 × 660 cm²) ≈ one langpanne (ca. 30 × 40 cm), used for saus, ost and fyll.
 * - Pizzamiks: Toro Pizzabunn Familiepakke 370 g https://oda.com/no/products/6307-toro-pizzabunn-familiepakke/ ,
 *   just add water. toro.no: «melmiks til en langpannepizza» → 1 pk = 1 langpanne.
 * - Lag deigen selv: Norgesmøllene siktet hvetemel 1 kg https://oda.com/no/products/35-norgesmollene-siktet-hvetemel/ +
 *   Idun fersk gjær 50 g https://oda.com/no/products/41-idun-mh-fersk-gjaer-original/ (ca. 8 dl mel and 25 g gjær per
 *   langpanne, ASSUMPTION).
 * - Glutenfri (the glutenfri chip): Brisk Glutenfri pizzabunn lettstekt 300 g
 *   https://oda.com/no/products/15945-brisk-glutenfri-pizzabunn-lettstekt/ , or Norgesmøllene Pizzabunn glutenfri
 *   300 g (mix) https://oda.com/no/products/26684-norgesmollene-pizzabunn-glutenfri/ .
 *
 * Always on: Mutti Pizzasaus klassisk 400 g https://oda.com/no/products/37097-mutti-pizzasaus-klassisk/ , ca. ½ glass per
 * langpanne (ASSUMPTION); TINE Norvegia revet 400 g https://oda.com/no/products/64931-tine-norvegia-revet/ , ca. 200 g
 * per langpanne (ASSUMPTION).
 *
 * Topping chips (default ON: skinke only). All amounts per langpanne are ASSUMPTIONS:
 * - Skinke: Gilde Smårettskinke strimlet 200 g https://oda.com/no/products/2536-gilde-smarettskinke-strimlet/ , ½ pk
 * - Pepperoni: Grilstad Pepperoni 100 g https://oda.com/no/products/16999-grilstad-pepperoni/ , 1 pk
 * - Sopp: REMA 1000 Sjampinjong skivet 184 g (boks) https://oda.com/no/products/28216-r-sjampinjong-skivet/ , 1 boks
 * - Ananas: REMA 1000 Ananas i biter 3 × 227 g https://oda.com/no/products/13363-r-ananas-i-biter-3pk/ , 1 boks (227 g)
 * - Mais: REMA 1000 Maiskorn 340 g (boks) https://oda.com/no/products/8792-r-maiskorn/ , ½ boks
 * - Paprika: Stor paprika rød, 2 stk per pose https://oda.com/no/products/27626-stor-paprika-rod-2-3-stk-nederland-spania/ , 1 paprika
 * - Kebab: Kanda Kebab av storfekjøtt 300 g https://oda.com/no/products/32384-kanda-kebab-av-storfekjott-til-2-personer/ , ½ pk (1 pk per 2 langpanner)
 * - Rømmedressing: Idun Rømmedressing 435 g https://oda.com/no/products/6562-idun-rommedressing/ , 1 flaske per
 *   ca. 15 personer who eat pizza (not per langpanne)
 */
export const PIZZA_DOUGH_PRODUCT = {
  ferdigdeig: { examples: 'Peppes Pizzabunn original 550 g eller REMA 1000 Fersk stor pizzabunn 550 g' },
  ferdigstekt: { examples: 'Staur Fjellbakeri 2 stk (ca. 29 cm) eller Villa Paradiso Pronto 2 stk', perPack: 2 },
  miks: { examples: 'Toro Pizzabunn Familiepakke 370 g' },
} as const;
/** Ferdigstekte bunner: round bases per langpanne's worth (12 biter). ASSUMPTION. */
export const PIZZA_ROUND_BASES_PER_LANGPANNE = 2;
/**
 * Ferdigstekte (ready-baked, round ca. 29 cm) bunner, counted per person instead of per biter
 * (Ekaterina, 21 Oct 2026): 1 bunn per 4 small children (3–6 år) and 1 per 3 older children (7–10 år),
 * following the OLDEST birthday child like every other portion. Adults: 1 bunn per 2 voksne is an
 * ASSUMPTION of ours. Children and adults are each rounded up to whole bunner, then whole packs
 * (Staur / Villa Paradiso, 2 per pk). Emma (13 barn, 4 voksne, 5 år): ceil(13/4) + ceil(4/2) = 4 + 2
 * = 6 bunner → 3 pk.
 */
export const KIDS_PER_ROUND_BASE: Record<Band, number> = { A: 4, B: 4, C: 3, D: 3 };
export const ADULTS_PER_ROUND_BASE = 2; // ASSUMPTION
/**
 * Saus, ost and fyll on ready-baked bunner: 1 bunn ≈ ½ langpanne (ASSUMPTION), so the «per langpanne»
 * amounts above are scaled per bunn (6 bunner = toppings for 3 langpanner).
 */
export const LANGPANNE_PER_ROUND_BASE = 0.5;
/** Lag deigen selv, per langpanne (ASSUMPTION). */
export const PIZZA_SELF_FLOUR_DL = 8;
export const PIZZA_SELF_FLOUR_G = 480;
export const PIZZA_SELF_YEAST_G = 25;
export const PIZZA_GLUTENFRI = 'Brisk Glutenfri pizzabunn 300 g';
export const PIZZA_GLUTENFRI_ALT = 'Norgesmøllene Pizzabunn glutenfri 300 g (mix)';
/** Pizzasaus: Mutti 400 g, half a jar per langpanne (ASSUMPTION). */
export const PIZZA_SAUCE = { name: 'Mutti Pizzasaus 400 g', perLangpanne: 0.5 } as const;
/** Revet ost: TINE Norvegia revet 400 g, 200 g per langpanne (ASSUMPTION). */
export const PIZZA_CHEESE = { name: 'TINE Norvegia revet 400 g', bagG: 400, gPerLangpanne: 200 } as const;
/**
 * Topping packs and how many packs per langpanne (all ASSUMPTIONS, see the Oda list above).
 * `perEaters` instead of `perLangpanne`: one pack per that many people eating pizza (rømmedressing).
 */
export const PIZZA_TOPPING_PRODUCT = {
  skinke: { name: 'Skinke', product: 'Gilde Smårettskinke strimlet 200 g', unit: 'pk', perLangpanne: 0.5 },
  pepperoni: { name: 'Pepperoni', product: 'Grilstad Pepperoni 100 g', unit: 'pk', perLangpanne: 1 },
  sopp: { name: 'Sopp', product: 'REMA 1000 Sjampinjong skivet, boks 184 g', unit: 'boks', perLangpanne: 1 },
  ananas: { name: 'Ananas', product: 'REMA 1000 Ananas i biter, boks 227 g (3-pk)', unit: 'boks', perLangpanne: 1 },
  mais: { name: 'Mais', product: 'REMA 1000 Maiskorn, boks 340 g', unit: 'boks', perLangpanne: 0.5 },
  paprika: { name: 'Paprika', product: 'Rød paprika (selges 2 i posen)', unit: 'stk', perLangpanne: 1 },
  kebab: { name: 'Kebab', product: 'Kanda Kebab av storfekjøtt 300 g', unit: 'pk', perLangpanne: 0.5 },
  rommedressing: { name: 'Rømmedressing', product: 'Idun Rømmedressing 435 g', unit: 'flaske', perEaters: 15 },
} as const;
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
/** @deprecated Oct 2026: the cake pieces follow rules/cake.ts `cakePieces` (1,5 per child + 1 per adult). */
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
export function programmeDefaults(_age: number): { activities: string[] } {
  return { activities: [] };
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
