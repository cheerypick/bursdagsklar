# Release

## Web: GitHub Pages

1. Once: **Settings → Pages → Build and deployment → Source: «GitHub Actions»**.
2. Every push to `main` runs `.github/workflows/deploy-web.yml`: install, tests, `expo export` with base `/bursdagsklar`, deploy.
3. The app is then at `https://cheerypick.github.io/bursdagsklar/`.

A custom domain (e.g. bursdagsklar.no) later: add it under Settings → Pages, and change `EXPO_BASE_URL` in the workflow to an empty value.

## Native apps: iOS and Android with EAS

Accounts you need:

| Account                 | Cost            | For                                                                                                                        |
| ----------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Expo (expo.dev)         | free to start   | EAS Build (cloud builds), later EAS Submit/Update. The free plan has a monthly build quota.                                |
| Apple Developer Program | 99 USD per year | Signing, TestFlight, App Store. Enrol as an organisation (needs a D-U-N-S number) if the app should show the company name. |
| Google Play Console     | 25 USD once     | Internal testing, Play Store. New personal accounts must run a closed test with testers before production.                 |

One-time setup (on a computer, in the repo):

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # creates the Expo project and prints its projectId
```

Then:

1. Set the projectId: either commit the value `eas init` writes, or add it as the repository variable/secret `EAS_PROJECT_ID` (read in `app.config.ts`).
2. Confirm the app identifiers in `app.config.ts`: `ios.bundleIdentifier` and `android.package` are placeholders (`no.bursdagsklar.app`). They can't change after the first store upload.
3. Create an access token at expo.dev → Account settings → Access tokens, and add it to GitHub: **Settings → Secrets and variables → Actions → New repository secret → `EXPO_TOKEN`**.
4. First build per platform interactively, so EAS can create the signing credentials: `npx eas-cli build --profile preview --platform android` (and `ios`, which asks for the Apple login).

After that, `.github/workflows/eas-build.yml` builds from GitHub: run it manually (Actions → EAS Build → Run workflow, choose profile and platform), or push a tag `v0.1.0`. Without `EXPO_TOKEN` the workflow skips cleanly.

Build profiles (`eas.json`):

- `development`: a dev client for testing on your own phone.
- `preview`: internal distribution (Android APK, iOS ad-hoc) for friends and family.
- `production`: store builds, version number auto-incremented.

Submitting to the stores (EAS Submit) comes later; it needs an App Store Connect API key and a Google Play service account JSON as further secrets.

## Secrets summary

| Secret                                                 | Where                                                   | Needed for      |
| ------------------------------------------------------ | ------------------------------------------------------- | --------------- |
| `EXPO_TOKEN`                                           | GitHub Actions secret                                   | `eas-build.yml` |
| `EAS_PROJECT_ID`                                       | GitHub Actions secret/variable (or committed in config) | EAS builds      |
| App Store Connect API key, Google Play service account | later                                                   | EAS Submit      |

Nothing else: the app has no API keys, no backend and no AI.
