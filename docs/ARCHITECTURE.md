# Architecture

Bursdagsklar is one Expo (React Native) app that runs on iOS, Android and the web. Milestone 1 has no backend, no database, no login and no AI.

## Layers

```
src/app        screens (Expo Router routes)          ← uses ui, theme, i18n, state, core
src/ui         reusable components                   ← uses theme
src/theme      tokens, breakpoints, images
src/i18n       all text: nb.ts (bokmål, source of truth) + en.ts, i18next
src/state      React context: the active party + setup draft, saved through PartyRepository
src/core       pure TypeScript: model, rules, texts, storage interface   ← no React, no React Native
```

The rule that keeps this maintainable: **screens never calculate anything**. Every number, date and text comes from `src/core`, which is tested on its own in plain Node (`npm test`).

### src/core

| File                         | Spec     | What                                                                                                                                                           |
| ---------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model.ts`                   | §4       | `Party`, `Guest`, `Task`, `MenuChoice`, `ShoppingItem`, …                                                                                                      |
| `rules/dates.ts`             | §6.3     | Date picker bounds, nb-NO formatting, weekday/weekend, Oslo «today». No day is preferred over another.                                                         |
| `rules/partyTime.ts`         | §6.2     | Default time: Mon–Fri 17.00–19.00; Sat–Sun 12.00–14.00 (3–6 år) or 14.00–16.00 (7–10 år), youngest child; soft tips; follows the date until edited.            |
| `rules/celebrants.ts`        | —        | Joint birthdays (1–3 children): «Emma, Jonas og Ali», «fyller 5 og 7»; ages 3–10. Portions use the OLDEST child's band, the time reason and cake the YOUNGEST. |
| `rules/calendar.ts`          | —        | Our own month calendar: Monday-first grid, leap years, past days disabled, a year ahead, keyboard moves.                                                       |
| `rules/people.ts`            | §4.1     | Head-count (children coming, adults eating).                                                                                                                   |
| `rules/todos.ts`             | §6.1     | Generates and dates every to-do relative to the party date, groups them, progress and next task.                                                               |
| `rules/food.ts`              | §6.4–6.8 | Amounts for grillpølser, wienerpølser, pizza, taco, pasta, egen meny, extras and the allergy additions; the shopping list.                                     |
| `rules/menu.ts`              | —        | The Mat screen: one main dish → each line's amount, pack rounding and a short reason; drinks, fruit, «Til kaken», the diet chips, item toggles; the Mat card.  |
| `rules/constants.ts`         | §5–6     | Every number in one place; values marked (I) in the spec are our defaults.                                                                                     |
| `texts/`                     | §7       | The pre-written template library (`templates.json`) and its renderer. No AI.                                                                                   |
| `party.ts`                   |          | Creating a party from the setup, updates, and the summary numbers screens show.                                                                                |
| `storage/PartyRepository.ts` | §9       | The storage interface and its key-value implementation.                                                                                                        |

Emma's worked example from the spec is the test fixture (`src/core/__fixtures__/emma.ts`); the tests assert the spec's numbers and dates exactly (test vectors A–D, all food amounts).

## Data and storage

Each party is **one self-contained record**:

```ts
{ id: '7d0c…', schemaVersion: 5, createdAt, updatedAt, plannedFrom, celebrants: [{ id, name, age }], date, start, end, theme | null, home, children, hostAdults, menu | null, diets, foodItems: { polsebrod: { included: false } }, …, taskState, haveAtHome }
```

- `id` is a uuid (`crypto.randomUUID`), stable forever.
- To-dos are not stored: they are computed from the party every time. Only the parent's ticks (`taskState`) and «har dette hjemme» (`haveAtHome`) are stored.
- Storage is behind `PartyRepository` (`list/get/save/remove`, active id, setup draft). Today it writes one key per party to a key-value store:
  - iOS/Android: AsyncStorage
  - Web: AsyncStorage's web implementation, which is `localStorage`

  Keys: `bursdagsklar:index`, `bursdagsklar:party:<id>`, `bursdagsklar:draft`.

- `schemaVersion` + `migrate()` handle changes to the record. v3 (the Mat screen): `menu` is null until the parent picks one (v2's pre-filled menu with `menuChosen: false` opens as «not chosen»), plus `diets`. v4: `foodCounts` (v3's separate child/adult counts on the Mat screen) is dropped and `foodItems` is added (see below). v5: one children number. `children` is the total number of children at the party, birthday children included; it replaces v4's `kidsInvited` (invited children, birthday children not counted) and the unused `siblingsAttending`. A stored v4 party with `kidsInvited: N` becomes `children: N + celebrants (+ siblings)`, the same real head-count, so its food amounts do not change. Old setup drafts are upgraded the same way (`normalizeDraft`).
- **One children number.** `children` is the total number of children at the party, birthday children included. Setup asks «Hvor mange barn blir det?» with the helper «Med Emma» (default 12), and Planen's header, Festen er klar, the Mat screen («For 12 barn og 4 voksne»), «Endre», the to-dos (gjestelisten, godteposer) and the shopping list all show that number as is. No rule or screen adds or subtracts the birthday children. The one place they are left out is internal: the not-yet-answered estimate of staying adults counts the guests' families (`children − celebrants`, `rules/people.ts`). The invitation-card to-do has no count («Skriv ut invitasjonskortene»). Bounds: at least the birthday children + 1, at most 40 (`minChildren`, `MAX_CHILDREN`).
- **One source of truth for the guest count.** The party's own numbers (`children`, `hostAdults`, plus the RSVPs in `guests`) give the head-count (`rules/people.ts`), and Planen, the food, the to-dos and the shopping list all read it. The Mat screen shows «For 12 barn og 4 voksne» with «Endre», an inline editor that writes to the party (`withGuestCounts` in `party.ts`): children as the one children number, adults («Voksne som spiser») as the adults eating, applied through `hostAdults` (the RSVP'd and expected parents are the floor).
- **Food item toggles.** Every quantity line on the Mat screen (main dish, drinks, fruit) has a tap toggle. `foodItems[lineId] = { included: false }` keeps a deselected line visible (greyed, struck through) and leaves it out of the Mat card on Planen, Handleliste (`handleliste`) and the «Handle tørrvarer» to-do. Missing entry = included. The Mat lines and shopping items share ids (`polsebrod`, `saft`, `pizzaost` …), and a test checks that. Not toggleable: «Til kaken» (a pointer to Kake), the diet lines (their chip is the toggle), «Din egen» and the frozen pizza's oven time. Swipe-to-remove on iOS/Android is a possible later nicety; the tap toggle works everywhere.

### Sausages: real packs, her amounts (21 Oct 2026)

The sausage amounts follow a per-person rule Ekaterina chose and are rounded to real packs. All numbers live in `rules/constants.ts` (the same facts are in a comment there). No prices are stored or shown anywhere.

**Context:** en ekte fest med 15 barn (Ekaterina's, KIWI 26.08.2026) kjøpte 60 grillpølser (2 × Gilde storpakning 3 × 10) og hadde ~20 til overs; the bread was lomper and pølsebrød. A tighter rule (40 grillpølser, 20 lomper, 24 pølsebrød for Emma) was tried first in this PR; she preferred the generous amounts: «I think I liked 50 more and something like 30 lomper 30 pølsebrød». The rule below gives her real party 60, what she bought.

**The rule:**

- Per person: 3 per child (every age 3–10) and 2 per grown-up, then up to whole packs. No extra percentage: rounding up to packs is the margin. Emma: 13 × 3 + 4 × 2 = 47 → 5 pk à 10 = 50. Wienerpølser use the same rule with packs of 8 (47 → 6 pk = 48).
- Lomper and pølsebrød both on: each covers about 60 % of the sausages, up to whole packs, so together there is some bread to spare (people mix). Emma: 60 % of 50 = 30 → lomper 3 pk à 10 = 30, pølsebrød 4 pk à 8 = 32; the reason reads «Ca. 30 av hver – noen vil ha lompe, noen brød». One left out: the other covers every sausage. A greyed-out bread line shows what it comes back as.
- Ketchup and sennep (one line, «1 av hver»): one bottle each (ca. 500 g) per ca. 25 people. Sprøstekt løk (its own line, id `lok`): ca. 5 g per pølse, so one 100 g bag per ca. 10 people.
- The grillpølse reason shows the sum and the pack: «13 barn × 3 + 4 voksne × 2 = 47. 5 pk Gilde Grillpølser à 10 = 50», and from 3 packs up the storpakning («eller 1 storpakning (3 × 10) og 2 pk»).

**Packs read on Oda, 21 Oct 2026** ([Wienerpølser](https://oda.com/no/categories/26-kylling-og-kjott/29-polser/3044-wienerpolser/), [Grillpølser](https://oda.com/no/categories/26-kylling-og-kjott/29-polser/3004-grillpolser/), Oda search):

| Product                        | Count / weight     | Used for                | Link                                                                     |
| ------------------------------ | ------------------ | ----------------------- | ------------------------------------------------------------------------ |
| Gilde Grillpølser              | 10 stk / 600 g (¹) | grillpølser, pack of 10 | https://oda.com/no/products/957-gilde-grillpolser/                       |
| Gilde Wienerpølse              | 8 stk / 520 g      | wienerpølser, pack of 8 | https://oda.com/no/products/956-gilde-wienerpolse-8-stk/                 |
| Buer Lomper Original           | 10 stk / 290 g     | lomper, pack of 10      | https://oda.com/no/products/69345-buer-lomper-original-10-stk/           |
| Hatting Høvding fine pølsebrød | 10 × 50 g / 500 g  | (not used, see ²)       | https://oda.com/no/products/67045-hatting-hovding-fine-polsebrod-10x50g/ |
| Hatting Grove pølsebrød        | 10 stk / 440 g     | (not used, see ²)       | https://oda.com/no/products/4204-hatting-grove-polsebrod-10stk/          |
| Prima Lavpris Pølsebrød        | 12 stk / 396 g     | (not used, see ²)       | https://oda.com/no/products/8342-prima-lavpris-polsebrod-12-stk/         |

Also on Oda that day: Gilde Favorittwiener 24 stk (ca. 1,56 kg), Strøm-Larsen Wienerpølser 8 stk 520 g, Leiv Vidar Wienerpølser 14 stk 770 g, Gilde Ostegrill 6 stk 480 g, Strøm-Larsen Grillpølser 400 g and 1 kg, Mesterbakeren Brioche pølsebrød 4 stk, Ola Lompa Store lomper 290 g, Buer/Ola Lompa Store speltlomper 8 stk, frosne lomper 10 stk.

¹ Oda lists Gilde Grillpølser as «600 g» without a count; 10 stk is printed on the pack. The 3 × 600 g storpakning (in stores, e.g. KIWI) is not on Oda.
² Pølsebrød are counted in packs of 8 (Bakehuset pølsebrød 8 stk, what she buys; not sold on Oda).

**Before → after, Emma (13 barn, 4 voksne, 5 år):** grillpølser 50 (5 pk) → 50 (5 pk), now from 3 per child + 2 per adult instead of a percentage; wienerpølser 48 (6 pk à 8) → 48 (6 pk à 8); lomper 50 (5 pk) → 30 (3 pk à 10); pølsebrød 24 (3 pk à 8) → 32 (4 pk à 8); «Ketchup, sennep og sprøstekt løk: 1 av hver» → «Ketchup og sennep: 1 av hver» + «Sprøstekt løk: 2 poser». On Handleliste: «5 pk grillpølser», «3 pk lomper», «4 pk pølsebrød», «Ketchup og sennep: 1 av hver», «2 poser sprøstekt løk» (Tørrvarer), saft «Eller jus».

### Menu: Pølser or Pizza, plus Noe annet (21 Oct 2026)

- **Cards:** the Mat screen shows **Pølser, Pizza and Noe annet**. Taco and pasta are hidden for now
  (`HIDDEN_MENU_CARDS` in `src/core/rules/dishes.ts`); their rules, texts and tests stay, so they can come back
  (e.g. for older children) by removing the id there. A saved party with taco or pasta opens with that dish
  unpicked (`withoutHiddenDishes`, run in `PartyRepository.migrate`), never a crash.
- **Pølser OR pizza (MVP, Ekaterina 21 Oct 2026):** Pølser and Pizza exclude each other: picking one unpicks the
  other (`EXCLUSIVE_MENU_CARDS`, `withDishOn`). «Noe annet» can be added on top of either. `Party.menu` is still
  one `MenuChoice`: one dish is stored as before, two (e.g. pizza + noe annet) as `{ kind: 'flere', dishes }`
  (`menuFromDishes`), so no schema bump. Old saved data with both pølser and pizza opens with pølser (plus any
  noe annet), via `withoutHiddenDishes` → `withExclusiveDishes` in `PartyRepository.migrate`.
- **Both at once, kept for later:** `ALLOW_POLSER_AND_PIZZA = false` in `constants.ts`. Set to true and pølser and
  pizza can be picked together again; each then covers **half** of the portions (`dishShare`), and the reason
  lines and a note say «Halvparten pølser, halvparten pizza». Hidden in the MVP.
- **Sections:** one main section per dish: `main-polser`, `main-pizza`, `main-annet` (`isMainSection`).

### Pizza: homemade in a langpanne, ready-made dough by default (21 Oct 2026)

Ekaterina's rule: **1 langpanne = 12 biter; 2 biter per barn (3 for 7–10 år, the oldest birthday child decides),
3 per voksen**, rounded up to whole langpanner, no extra percentage. Emma (13 barn, 4 voksne, 5 år):
13 × 2 + 4 × 3 = 38 biter → 4 langpanner. The reason line says exactly that.

**Ferdigstekte (round) bunner** are counted per person instead (Ekaterina, 21 Oct 2026): **1 bunn per 4 children
3–6 år, 1 per 3 children 7–10 år** (the oldest birthday child decides), and **1 per 2 adults** (our assumption).
Children and adults are each rounded up to whole bunner, then whole packs of 2 (`roundBases` in `food.ts`). Emma:
13 ÷ 4 → 4 + 4 ÷ 2 → 2 = 6 bunner → 3 pk; the reason reads «13 barn ÷ 4 + 4 voksne ÷ 2 = 6 bunner, rundet opp.
3 pk à 2». Saus, ost and fyll then follow the bunner, 1 bunn ≈ ½ langpanne (assumption,
`LANGPANNE_PER_ROUND_BASE`): Emma's 6 bunner get 2 glass saus, 2 poser ost and 2 pk skinke.

Products read on Oda (oda.com) on 21 Oct 2026, public pages, no prices. Every «per langpanne» amount is an
**assumption** (Oda says nothing about how far a pack goes, except Peppes «Familie 3–4 personer» and Toro's
«melmiks til en langpannepizza» on toro.no). Constants: `src/core/rules/constants.ts` (pizza section).

| Line id             | What                                                  | Product (Oda)                                                                                                                                                                                                                                           | Amount per langpanne                                          |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `langpanner`        | Pizza i langpanne (or «Pizza på ferdigstekte bunner») | –                                                                                                                                                                                                                                                       | 12 biter                                                      |
| `pizzadeig`         | Ferdig pizzadeig (**default**)                        | Peppes Pizzabunn original 550 g ([oda](https://oda.com/no/products/4633-peppes-pizza-pizzabunn-original-familie-3-4-person/)), REMA 1000 Fersk stor pizzabunn 550 g ([oda](https://oda.com/no/products/69115-r-fersk-stor-pizzabunn/))                  | 1 pk (assumption)                                             |
| `pizzabunner`       | Ferdigstekte bunner                                   | Staur Fjellbakeri 2 stk ca. 29 cm ([oda](https://oda.com/no/products/36162-staur-fjellbakeri-pizzabunn-hvete-ca-29cm-2stk/)), Villa Paradiso Pronto 2 stk ([oda](https://oda.com/no/products/63698-villa-paradiso-pronto-italienske-pizzabunner-2stk/)) | 1 bunn per 4 small / 3 older children, 1 per 2 adults; pk à 2 |
| `pizzamiks`         | Pizzamiks                                             | Toro Pizzabunn Familiepakke 370 g ([oda](https://oda.com/no/products/6307-toro-pizzabunn-familiepakke/))                                                                                                                                                | 1 pk (toro.no)                                                |
| `hvetemel`, `gjaer` | Lag deigen selv (last, small option)                  | siktet hvetemel 1 kg, fersk gjær 50 g                                                                                                                                                                                                                   | 8 dl mel, 25 g gjær                                           |
| `pizzasaus`         | Pizzasaus (always)                                    | Mutti Pizzasaus klassisk 400 g ([oda](https://oda.com/no/products/37097-mutti-pizzasaus-klassisk/))                                                                                                                                                     | ½ glass                                                       |
| `pizzaost`          | Revet ost (always)                                    | TINE Norvegia revet 400 g ([oda](https://oda.com/no/products/64931-tine-norvegia-revet/))                                                                                                                                                               | 200 g                                                         |
| `pizzaskinke`       | Skinke (chip, **on by default**)                      | Gilde Smårettskinke strimlet 200 g ([oda](https://oda.com/no/products/2536-gilde-smarettskinke-strimlet/))                                                                                                                                              | ½ pk                                                          |
| `pepperoni`         | Pepperoni (chip)                                      | Grilstad Pepperoni 100 g ([oda](https://oda.com/no/products/16999-grilstad-pepperoni/))                                                                                                                                                                 | 1 pk                                                          |
| `sopp`              | Sopp (chip)                                           | REMA 1000 Sjampinjong skivet 184 g ([oda](https://oda.com/no/products/28216-r-sjampinjong-skivet/))                                                                                                                                                     | 1 boks                                                        |
| `ananas`            | Ananas (chip)                                         | REMA 1000 Ananas i biter 3 × 227 g ([oda](https://oda.com/no/products/13363-r-ananas-i-biter-3pk/))                                                                                                                                                     | 1 boks                                                        |
| `mais`              | Mais (chip)                                           | REMA 1000 Maiskorn 340 g ([oda](https://oda.com/no/products/8792-r-maiskorn/))                                                                                                                                                                          | ½ boks                                                        |
| `paprika`           | Paprika (chip)                                        | Stor paprika rød, 2 stk ([oda](https://oda.com/no/products/27626-stor-paprika-rod-2-3-stk-nederland-spania/))                                                                                                                                           | 1 stk                                                         |
| `kebab`             | Kebab (chip)                                          | Kanda Kebab av storfekjøtt 300 g ([oda](https://oda.com/no/products/32384-kanda-kebab-av-storfekjott-til-2-personer/))                                                                                                                                  | ½ pk                                                          |
| `rommedressing`     | Rømmedressing (chip)                                  | Idun Rømmedressing 435 g ([oda](https://oda.com/no/products/6562-idun-rommedressing/))                                                                                                                                                                  | 1 flaske per ca. 15 personer                                  |
| `diet-glutenfri`    | Glutenfri chip                                        | Brisk Glutenfri pizzabunn 300 g ([oda](https://oda.com/no/products/15945-brisk-glutenfri-pizzabunn-lettstekt/)) or Norgesmøllene Pizzabunn glutenfri 300 g ([oda](https://oda.com/no/products/26684-norgesmollene-pizzabunn-glutenfri/))                | 1 extra                                                       |

Frozen pizza stays as the second choice under Pizza (`frossenpizza`, 8 biter per pizza). The dough to-do
(«Lag pizzadeigen») only appears when she picks «Lag deigen selv».

### Later: godteposer (goodie bags)

### Handleliste (shopping list)

`rules/shopping.ts` builds the list from the party every time (`handleliste(party)`), so a new menu, a line deselected on Mat or a new children count updates it. Only two things are stored on the party (schema v6):

- `shopping.ticked`: the ids of the items she has ticked off, and `shopping.custom`: her own free-text items («Legg til vare», ids `egen-1`, `egen-2` …). Ticks are keyed by stable item ids (`grillpolser`, `saft`, `kakelys`, `pose-popcorn`, `egen-1`), so they survive a change in the amounts. «Nullstill avkrysninger» clears the ticks; «Start på nytt» clears everything.
- `goodieBags.contents`: what she picked for the goodie bags.

What is on the list, grouped by store section (Kjøtt og pålegg, Brød, Frukt og grønt, Drikke, Tørrvarer, Frysedisk, Fest og pynt, Godteposer, Egne varer; empty sections are hidden):

- every **included** Mat line, with the same amounts and pack sizes («5 pk», «à 10, 50 stk i alt»). Left out: lines deselected on Mat, her own dish («Noe annet»), the oven time, the trays of homemade pizza (the ingredients are listed), tap water and the cake (Kake comes later);
- drinks and fruit, also before a main dish is chosen (they don't depend on it; the list says to pick a main dish for the rest);
- the dietary extras ticked on Mat («1 pk kyllingpølser»), in the right section; diet notes that are not something to buy are skipped;
- party things: goodie bags (one per child, the one children number), candles (one set per birthday child), plates/cups/napkins for everyone eating, balloons and the birthday crown, unless «Har dere dette hjemme?» says they are at home.

**Godteposer.** Candy is **not food**: it is not on the Mat screen or in `extras()`. Everyone fills the goodie bags with what they want (Ekaterina, 21 Oct 2026), so nothing inside them is on the list by default. Under the bags, «Forslag til innhold» shows chips, none pre-selected: Godteri, Popcorn, Rosiner, Klistremerker, Såpebobler, Viskelær/blyant, Fruktstang. A tap puts it on the list as a normal tickable item, about one per child (candy ca. 100 g per bag, `CANDY_G_CHILD`, nut-free when an RSVP says nøtter/peanøtt); a second tap takes it off. A small line says «Sunnere alternativer: rosiner, fruktstang og småleker.»

**Del listen** (`shareText`) is plain Norwegian: «Handleliste – Emmas bursdag 15. nov», then each section with «☐ 5 pk grillpølser» lines, only what is not ticked yet. Native: the system share sheet (React Native `Share`). Web: the Web Share API where the browser has it (Safari on iPhone), otherwise the clipboard and a «Kopiert» toast. No backend: she sends it to whoever shops by message.

The older `shoppingList()` in `rules/food.ts` (by trip, tørrvarer/ferskvarer) is no longer shown on any screen; it is kept for its tests and can be removed later.

**Adding a server later** (yearly reminder email, two parents on one party, RSVP links): add a `RemotePartyRepository` (or a sync layer) that PUTs/GETs the same JSON by `id` and resolves conflicts on `updatedAt`. Screens and rules don't change. Keep children's data in Norway/EU and delete parties some time after the date.

## Språk (i18n): bokmål and English

- **One i18next instance** (`src/i18n/i18n.ts`, plain i18next, no React) holds `nb` (default, source of
  truth) and `en`. Screens use `useTranslation()` from react-i18next (provided in `app/_layout.tsx`);
  the rules in `src/core` call `t()` on the same instance, so core still returns ready text and its unit
  tests assert real Norwegian. Switching language changes words only, never numbers or logic.
- **Files**: `src/i18n/nb.ts` and `src/i18n/en.ts`, one object each, sections by screen/feature
  (`welcome`, `who`/`date`/`kids`/`place`, `plan`, `food`, `shopping`, `theme`, `rules.time`,
  `rules.menu`, `rules.shop`, `rules.todos`, `themes.<id>` …). `{{name}}` is filled in; plurals are
  `key_one` / `key_other` with `count`. Keys are typed (`src/i18n/types.d.ts`), `en` must have nb's exact
  shape (TypeScript), and `src/i18n/__tests__/keys.test.ts` checks the key sets and placeholders.
- **Adding a string**: add it to `nb.ts` in the right section, the same key in `en.ts`, use `t('…')`.
- **Numbers and dates** follow the language: `formatNumber()` (nb «1,5», en «1.5»); weekday and month
  names come from `Intl` in the active locale (nb keeps its own names, identical to Intl's, without the
  dots Intl adds to short forms). en uses en-GB order and the 24-hour clock: «Saturday 7 November, 17:00».
- **Units** (`src/core/rules/units.ts`): «5 pk à 10» / «5 packs of 10», «2 flasker» / «2 bottles».
- **Themes**: the words live in `themes.<id>.*`; `THEMES` reads them through getters, so a switch shows
  at once. The trademark line is `themeNote.disclaimer`.
- **Language choice**: device language if English, else nb; the picker («Språk / Language», front page
  and the foot of Planen) stores it as `bursdagsklar:language` in the same store as the parties.
  «Start på nytt» keeps it (a device setting, not part of a plan). On web the stored choice is read
  synchronously, so a reload in English never shows Norwegian first; `<html lang>` follows.
- **Left in Norwegian on purpose**: product names on the Norwegian shelf (Gilde Grillpølser, TINE
  Norvegia …), the long invitation templates in `src/core/texts/templates.json` (the Invitasjon screen is
  still «Kommer snart»; the card on «Festen er klar» is translated), and the legacy `shoppingList()` in
  `rules/food.ts` (not shown in the app).

## Design system

- Tokens in `src/theme/tokens.ts` come from the approved prototype's CSS (spec §11): cream background, deep green primary, blush/butter/sage/lilac surfaces, radii 28/20/14, Bricolage Grotesque for headings and Figtree for body text (loaded with `expo-font` from `@expo-google-fonts`).
- Screens are built only from `src/ui`: `Screen`, `Text` (type scale), `Button`/`Pill`, `PhotoCard`, `Surface`, `ThemeTile`, `TaskRow`/`HomeToggle`, `Stepper`, `Calendar` (our own date picker, the same on iOS, Android and web), `TopBar`, `NavBar`, `Grid`, `Toast`.
- Accessibility: touch targets ≥ 48 px, `accessibilityLabel`/roles on every control, headings marked as headings, safe areas respected.
- Responsive: `useLayout()` (`src/theme/useLayout.ts`). Under 768 px: one column, full-width buttons, bottom tabs. From 768 px: centred column up to 1100 px, 2–3 column grids, a top navigation bar, buttons sized to their label.
- Themes: the six original themes plus Pokémon, Paw Patrol and Frost, all in **one list**, `src/core/themes.ts`. Each entry carries a palette (primary, hover, text on primary, accent, background tint, card tint, soft fill, invitation tint/ink), a motif emoji, and our own Norwegian copy (Planen greeting, invitation headline, cake idea, invitation texts). `ThemeProvider` (`src/theme/ThemeProvider.tsx`) applies the chosen theme app-wide — buttons, tabs, progress ring, cards, the «Festen er klar» screen and invitation card, the Planen hero, the page background — and the neutral brand palette (and neutral words: «Bli med på bursdagsfest!») is used when no theme is picked. The theme is **optional** and chosen after setup, from the «Velg tema (valgfritt)» card on Planen (`/tema`); no rule or to-do depends on it — a themed extra (e.g. «Bestill snøkrystall-piñata») only appears when a theme is chosen and that activity is on. Components read colours with `useColors()` / `themedStyles()`, never the static brand `colors`. Unit tests check that every palette is complete and that every text/background pair reaches WCAG AA (4.5:1); an e2e test checks the neutral look without a theme, then picks Frost from the Planen card and checks its colour on Planen and «Festen er klar» in WebKit and Chromium. **Adding a theme** = its id in `ThemeId` (model.ts), one entry in `themes.ts`, and its picture in `themeImages` (`src/theme/images.ts`); TypeScript and the tests catch anything missing.
- Licensed names: the three licensed brands appear **only as words**; their tiles are our own watercolour mood illustrations (lightning and stars; a toy fire truck and paw prints; snowflakes and a tiara). No characters, logos, official art or brand fonts, and all copy is our own (no quotes or catchphrases). Wherever a licensed name appears (the theme picker, and «Festen er klar»/Planen for a licensed theme) a small line says «Bursdagsklar er ikke tilknyttet Disney, Spin Master eller The Pokémon Company.»

## Routes

`/` (welcome, or straight to the plan if a party exists) · `/ny/hvem` `/ny/dato` `/ny/barn` `/ny/hvor` (4 steps: who · when · how many · where) · `/klar` · `/plan` · `/tema` (optional theme, opened from Planen) · `/gjoremal` · `/mat` (main dish, amounts, guest editor, item toggles) · `/festdagen` · placeholders for later milestones: `/invitasjon` `/kake` `/program`.

## Web vs native: what differs

|            | Web (GitHub Pages)                                                                                                                                                                                                  | iOS / Android                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Storage    | `localStorage` in that browser. Clearing site data or switching browser/phone loses the party. Safari may clear storage for sites not visited in 7 days (ITP).                                                      | AsyncStorage in the app sandbox; survives until the app is deleted.                      |
| Deep links | Pages has no SPA fallback, so the build copies `index.html` to `404.html`. Deep links work, but the first response for e.g. `https://bursdagsklar.no/plan` has HTTP status 404 (fine for users; not ideal for SEO). | Native routing, `bursdagsklar://` scheme.                                                |
| Base path  | Served at the root of `https://bursdagsklar.no/` (`EXPO_BASE_URL` empty). A sub-path needs `EXPO_BASE_URL` set to it at export.                                                                                     | n/a                                                                                      |
| Date input | Text field (accepts many formats).                                                                                                                                                                                  | Same text field; a native date picker is a later improvement.                            |
| Fonts      | Downloaded with the page.                                                                                                                                                                                           | Bundled in the app.                                                                      |
| Updates    | Every push to `main` deploys.                                                                                                                                                                                       | New binary through EAS Build + store review (EAS Update can ship JS-only changes later). |

## Avhengigheter (dependencies)

`package.json` cannot hold comments, so the reasons for its special entries live here.

- **`overrides.xcode.uuid = ^11.1.1`** (21 Oct 2026). `expo-splash-screen` → `@expo/config-plugins` → `xcode@3.0.1` asks for `uuid@^7`, which npm flags as deprecated on every install. `xcode` only calls `uuid.v4()`, which uuid 11 still exports for CommonJS, so the override is safe. uuid 12+ is ESM-only and would break `require('uuid')` in `xcode` on Node 20, so stay on 11. Remove the override once `@expo/config-plugins` ships an `xcode` that no longer needs it (check with `npm ls uuid`).
- **ESLint stays on 9** (21 Oct 2026). ESLint 10 was tried: `eslint-plugin-react@7.37.5` (pulled in by `eslint-config-expo@58`) crashes on load with `contextOrFilename.getFilename is not a function`, because ESLint 10 removed that API, and `eslint-plugin-import` does not list ESLint 10 as supported either. npm therefore keeps warning that `eslint@9.39.5` is deprecated. Move to ESLint 10 when `eslint-config-expo` and `eslint-plugin-react` support it.

## Invitasjon

- Teksten lages i `src/core/rules/invitation.ts` (`buildInvitation`): navn og alder (felles bursdag: «Emma og Jonas fyller 5 og 7 år»), ukedag + dato, tid, adresse (feltet på Invitasjon-skjermen; tomt hjemme → «hjemme hos oss»), temaets egen åpningslinje når et tema er valgt (ellers nøytral tekst). Ingen AI, samme fest gir samme tekst.
- Valgene lagres på festen som `invitation` (valgfritt felt, ingen ny schemaVersion): adresse, telefon, «noen foreldre blir og hjelper til» (forhåndskrysset når yngste bursdagsbarn er 3–4), søsken (av), svarfrist (standard dagen før festen), svarmåte («Gi beskjed hvis dere ikke kommer» / «Gi beskjed om dere kommer») og egen redigert tekst («Lag teksten på nytt» fjerner den).
- Svar håndterer vertene selv; appen samler ingen svar.
- Språk: alle tekstene ligger i `src/i18n/nb.ts` og `en.ts` (`invitation.*` for skjermen, `invite.text.*` og `invite.card.*` for selve invitasjonen) og leses med `t()` som de andre reglene. Teksten lages i språket som er valgt; en egen redigert tekst blir stående som den er skrevet.
- Foreldre som hjelper til regnes med i maten: 1 per 4 gjestebarn, rundet opp (gjestebarn = barn totalt minus bursdagsbarna). De er en del av de voksne som blir, så `headCount` bruker det største av hjelpere og det vanlige anslaget, ikke summen.
- «Kopier tekst»: utklippstavlen på web. På iOS/Android åpner den delingsarket (som har «Kopier»), fordi appen ikke har en utklippsmodul ennå (`expo-clipboard`).
- Etter MVP (ikke bygget): foreldre laster opp sitt eget bilde til invitasjonen. Trenger bildehosting (f.eks. Cloudinary).
