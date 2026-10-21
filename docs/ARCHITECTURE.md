# Architecture

Bursdagsklar is one Expo (React Native) app that runs on iOS, Android and the web. Milestone 1 has no backend, no database, no login and no AI.

## Layers

```
src/app        screens (Expo Router routes)          ← uses ui, theme, i18n, state, core
src/ui         reusable components                   ← uses theme
src/theme      tokens, breakpoints, images
src/i18n       Norwegian strings (one file)
src/state      React context: the active party + setup draft, saved through PartyRepository
src/core       pure TypeScript: model, rules, texts, storage interface   ← no React, no React Native
```

The rule that keeps this maintainable: **screens never calculate anything**. Every number, date and text comes from `src/core`, which is tested on its own in plain Node (`npm test`).

### src/core

| File                         | Spec     | What                                                                                                                                                           |
| ---------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model.ts`                   | §4       | `Party`, `Guest`, `Task`, `MenuChoice`, `ShoppingItem`, …                                                                                                      |
| `rules/dates.ts`             | §6.3     | Date picker bounds, nb-NO formatting, weekday/weekend, Oslo «today». No day is preferred over another.                                                         |
| `rules/partyTime.ts`         | §6.2     | Default time: Mon–Fri 16.30–18.30, Sat–Sun 12.00–14.00; follows the date until edited.                                                                         |
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

### Sausages: real packs, one real-party sanity check (21 Oct 2026)

The sausage amounts follow a per-person rule (our own reasoning) and are rounded to real packs. All numbers live in `rules/constants.ts` (the same facts are in a comment there). No prices are stored or shown anywhere.

**Sanity check, not the source of the rule:** en ekte fest med 15 barn (Ekaterina's, KIWI 26.08.2026) kjøpte 60 grillpølser (2 × Gilde storpakning 3 × 10) og hadde ~20 til overs, so ~40 were eaten by 15 children and the parents who stayed. The bread was lomper and pølsebrød, about half each. In her words it was just an example. The rule below gives that party 40.

**The rule:**

- Per person (what is eaten): 3–4 år 1,5 · 5–6 år 2 · 7–10 år 2,5 · a grown-up 1,5. Portions follow the oldest birthday child. Then 2 extra, then up to whole packs. The sanity check: 15 × 2 + 5 × 1,5 = 37,5 → 38 + 2 = 40 → 4 pk à 10.
- Lomper and pølsebrød both on: together they cover the sausages, about half each, each up to whole packs. One left out: the other covers every sausage. A greyed-out bread line shows what it comes back as.
- Ketchup and sennep (one line, «1 av hver»): one bottle each (ca. 500 g) per ca. 25 people. Sprøstekt løk (its own line, id `lok`): ca. 5 g per pølse, so one 100 g bag per ca. 10 people.
- The grillpølse line names the pack («4 pk Gilde Grillpølser (10 stk) = 40») and, from 3 packs up, the storpakning («eller 1 storpakning (3 × 10) og 1 pk»).

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

**Before → after, Emma (13 barn, 4 voksne, 5 år):** grillpølser 50 (5 pk) → 40 (4 pk); wienerpølser 48 (6 pk à 8) → 40 (5 pk); lomper 50 (5 pk) → 20 (2 pk); pølsebrød 24 (3 pk à 8) → 24 (3 pk à 8); «Ketchup, sennep og sprøstekt løk: 1 av hver» → «Ketchup og sennep: 1 av hver» + «Sprøstekt løk: 2 poser».

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

|            | Web (GitHub Pages)                                                                                                                                                                                        | iOS / Android                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Storage    | `localStorage` in that browser. Clearing site data or switching browser/phone loses the party. Safari may clear storage for sites not visited in 7 days (ITP).                                            | AsyncStorage in the app sandbox; survives until the app is deleted.                      |
| Deep links | Pages has no SPA fallback, so the build copies `index.html` to `404.html`. Deep links work, but the first response for e.g. `/bursdagsklar/plan` has HTTP status 404 (fine for users; not ideal for SEO). | Native routing, `bursdagsklar://` scheme.                                                |
| Base path  | Served under `/bursdagsklar/` (`EXPO_BASE_URL`). A custom domain later means building with an empty base.                                                                                                 | n/a                                                                                      |
| Date input | Text field (accepts many formats).                                                                                                                                                                        | Same text field; a native date picker is a later improvement.                            |
| Fonts      | Downloaded with the page.                                                                                                                                                                                 | Bundled in the app.                                                                      |
| Updates    | Every push to `main` deploys.                                                                                                                                                                             | New binary through EAS Build + store review (EAS Update can ship JS-only changes later). |
