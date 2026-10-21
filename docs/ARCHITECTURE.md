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
| `rules/menu.ts`              | —        | The Mat screen: one main dish → each line's amount, pack rounding and a short reason; drinks, snacks, «Til kaken», the diet chips; the Mat card on Planen.     |
| `rules/constants.ts`         | §5–6     | Every number in one place; values marked (I) in the spec are our defaults.                                                                                     |
| `texts/`                     | §7       | The pre-written template library (`templates.json`) and its renderer. No AI.                                                                                   |
| `party.ts`                   |          | Creating a party from the setup, updates, and the summary numbers screens show.                                                                                |
| `storage/PartyRepository.ts` | §9       | The storage interface and its key-value implementation.                                                                                                        |

Emma's worked example from the spec is the test fixture (`src/core/__fixtures__/emma.ts`); the tests assert the spec's numbers and dates exactly (test vectors A–D, all food amounts).

## Data and storage

Each party is **one self-contained record**:

```ts
{ id: '7d0c…', schemaVersion: 3, createdAt, updatedAt, plannedFrom, celebrants: [{ id, name, age }], date, start, end, theme | null, home, kidsInvited, menu | null, diets, foodCounts | null, …, taskState, haveAtHome }
```

- `id` is a uuid (`crypto.randomUUID`), stable forever.
- To-dos are not stored: they are computed from the party every time. Only the parent's ticks (`taskState`) and «har dette hjemme» (`haveAtHome`) are stored.
- Storage is behind `PartyRepository` (`list/get/save/remove`, active id, setup draft). Today it writes one key per party to a key-value store:
  - iOS/Android: AsyncStorage
  - Web: AsyncStorage's web implementation, which is `localStorage`

  Keys: `bursdagsklar:index`, `bursdagsklar:party:<id>`, `bursdagsklar:draft`.

- `schemaVersion` + `migrate()` handle changes to the record. v3 (the Mat screen): `menu` is null until the parent picks one (v2's pre-filled menu with `menuChosen: false` opens as «not chosen»), plus `diets` and `foodCounts` (the Mat screen's own child/adult counts; null follows the party).

**Adding a server later** (yearly reminder email, two parents on one party, RSVP links): add a `RemotePartyRepository` (or a sync layer) that PUTs/GETs the same JSON by `id` and resolves conflicts on `updatedAt`. Screens and rules don't change. Keep children's data in Norway/EU and delete parties some time after the date.

## Design system

- Tokens in `src/theme/tokens.ts` come from the approved prototype's CSS (spec §11): cream background, deep green primary, blush/butter/sage/lilac surfaces, radii 28/20/14, Bricolage Grotesque for headings and Figtree for body text (loaded with `expo-font` from `@expo-google-fonts`).
- Screens are built only from `src/ui`: `Screen`, `Text` (type scale), `Button`/`Pill`, `PhotoCard`, `Surface`, `ThemeTile`, `TaskRow`/`HomeToggle`, `Stepper`, `Calendar` (our own date picker, the same on iOS, Android and web), `TopBar`, `NavBar`, `Grid`, `Toast`.
- Accessibility: touch targets ≥ 48 px, `accessibilityLabel`/roles on every control, headings marked as headings, safe areas respected.
- Responsive: `useLayout()` (`src/theme/useLayout.ts`). Under 768 px: one column, full-width buttons, bottom tabs. From 768 px: centred column up to 1100 px, 2–3 column grids, a top navigation bar, buttons sized to their label.
- Themes: the six original themes plus Pokémon, Paw Patrol and Frost, all in **one list**, `src/core/themes.ts`. Each entry carries a palette (primary, hover, text on primary, accent, background tint, card tint, soft fill, invitation tint/ink), a motif emoji, and our own Norwegian copy (Planen greeting, invitation headline, cake idea, invitation texts). `ThemeProvider` (`src/theme/ThemeProvider.tsx`) applies the chosen theme app-wide — buttons, tabs, progress ring, cards, the «Festen er klar» screen and invitation card, the Planen hero, the page background — and the neutral brand palette (and neutral words: «Bli med på bursdagsfest!») is used when no theme is picked. The theme is **optional** and chosen after setup, from the «Velg tema (valgfritt)» card on Planen (`/tema`); no rule or to-do depends on it — a themed extra (e.g. «Bestill snøkrystall-piñata») only appears when a theme is chosen and that activity is on. Components read colours with `useColors()` / `themedStyles()`, never the static brand `colors`. Unit tests check that every palette is complete and that every text/background pair reaches WCAG AA (4.5:1); an e2e test checks the neutral look without a theme, then picks Frost from the Planen card and checks its colour on Planen and «Festen er klar» in WebKit and Chromium. **Adding a theme** = its id in `ThemeId` (model.ts), one entry in `themes.ts`, and its picture in `themeImages` (`src/theme/images.ts`); TypeScript and the tests catch anything missing.
- Licensed names: the three licensed brands appear **only as words**; their tiles are our own watercolour mood illustrations (lightning and stars; a toy fire truck and paw prints; snowflakes and a tiara). No characters, logos, official art or brand fonts, and all copy is our own (no quotes or catchphrases). Wherever a licensed name appears (the theme picker, and «Festen er klar»/Planen for a licensed theme) a small line says «Bursdagsklar er ikke tilknyttet Disney, Spin Master eller The Pokémon Company.»

## Routes

`/` (welcome, or straight to the plan if a party exists) · `/ny/hvem` `/ny/dato` `/ny/barn` `/ny/hvor` (4 steps: who · when · how many · where) · `/klar` · `/plan` · `/tema` (optional theme, opened from Planen) · `/gjoremal` · `/festdagen` · placeholders for later milestones: `/invitasjon` `/mat` `/kake` `/program`.

## Web vs native: what differs

|            | Web (GitHub Pages)                                                                                                                                                                                        | iOS / Android                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Storage    | `localStorage` in that browser. Clearing site data or switching browser/phone loses the party. Safari may clear storage for sites not visited in 7 days (ITP).                                            | AsyncStorage in the app sandbox; survives until the app is deleted.                      |
| Deep links | Pages has no SPA fallback, so the build copies `index.html` to `404.html`. Deep links work, but the first response for e.g. `/bursdagsklar/plan` has HTTP status 404 (fine for users; not ideal for SEO). | Native routing, `bursdagsklar://` scheme.                                                |
| Base path  | Served under `/bursdagsklar/` (`EXPO_BASE_URL`). A custom domain later means building with an empty base.                                                                                                 | n/a                                                                                      |
| Date input | Text field (accepts many formats).                                                                                                                                                                        | Same text field; a native date picker is a later improvement.                            |
| Fonts      | Downloaded with the page.                                                                                                                                                                                 | Bundled in the app.                                                                      |
| Updates    | Every push to `main` deploys.                                                                                                                                                                             | New binary through EAS Build + store review (EAS Update can ship JS-only changes later). |
