# bursdagsklar

**Norsk:** Bursdagsklar er en enkel planlegger for barnebursdag hjemme. Fortell hvem som har bursdag, hvor gammel barnet blir og når festen er, så får du en ferdig plan med datoer, gjøremål og alt du trenger – uten innlogging og uten AI. Alt lagres lokalt på telefonen eller i nettleseren.

**English:** Bursdagsklar is a simple planner for kids' birthday parties at home. Enter who is having a birthday, their age and the date, and get a finished plan with dated to-dos and everything you need – no login and no AI. Everything is stored locally on the phone or in the browser.

## Run it

Needs Node 20 or newer.

```bash
npm install
npm run web        # open in the browser (http://localhost:8081)
npm start          # Expo dev server: press i / a, or scan the QR code with Expo Go
npm test           # unit tests (src/core)
npm run ci         # everything CI runs: typecheck, lint, prettier, tests, web export
```

## Stack

Expo (React Native) + TypeScript + Expo Router: one codebase for iOS, Android and web. No backend, no database, no AI. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/RELEASE.md](docs/RELEASE.md).

| Folder              | What                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/core`          | Pure TypeScript, no React: data model, all rules (dates, to-dos, weekend check, food amounts), text templates, storage interface. Fully unit-tested with Emma's example. |
| `src/theme`         | Design tokens from the approved prototype (colours, type, spacing, radii), breakpoints, images.                                                                          |
| `src/ui`            | The reusable components every screen is built from.                                                                                                                      |
| `src/i18n`          | All Norwegian strings.                                                                                                                                                   |
| `src/app`           | Screens (Expo Router: one file per route).                                                                                                                               |
| `.github/workflows` | CI, GitHub Pages deploy, EAS native builds.                                                                                                                              |
