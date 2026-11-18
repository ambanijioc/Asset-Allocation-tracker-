# Asset Tracker — Mobile

A production-shaped Expo / React Native client for the Asset Tracker portfolio
backend. It mirrors the web app's design language (zinc surfaces, blue accent,
8-point spacing, tabular numerals) and works in Expo Go with no custom native
code.

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Expo SDK 57 · React Native 0.86 · React 19 |
| Navigation | Expo Router (typed file-based routes) |
| Server state | TanStack Query v5 (retries, caching, foreground refetch) |
| Auth | Firebase JS SDK + AsyncStorage persistence |
| Charts | `react-native-svg` donut and stacked bars |
| Validation | Zod at the form and API boundary |
| Styling | Typed design tokens + `StyleSheet` |

## Getting started

```bash
cd mobile
npm install
npx expo start --lan --go --port 8081
```

Scan the QR code with Expo Go on the same network.

### Configuration

All configuration is optional — sensible development defaults are bundled.
Create `mobile/.env` to override:

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
# Optional Firebase overrides (public client config only)
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
# Force the offline demo dataset
EXPO_PUBLIC_FORCE_DEMO=1
```

`127.0.0.1` is correct when the Next.js server runs in Termux on the same phone
as Expo Go. Use your machine's LAN address when running the backend elsewhere.
Never put secrets in `EXPO_PUBLIC_*` variables — they are inlined into the
bundle.

## Architecture

```
app/                      routes only
  (tabs)/                 Dashboard · Insights · Allocation · Assets · Screener · Settings
  asset/new.tsx           add holding (modal)
  asset/[id]/             detail + edit (modal)
  login.tsx               email/password, Google + demo entry
src/
  components/ui/          design-system primitives
  components/charts/      SVG visualisations
  components/portfolio/   composed portfolio widgets
  components/portfolio/insights/  exposure, fund, matrix and drift panels
  features/auth/          Firebase + session provider
  features/portfolio/     types, API, queries, aggregation, form, analytics
  lib/api/                typed fetch client with timeouts
  lib/config/             Zod-validated environment
  lib/format/             paise-safe money formatting
  lib/query/              QueryClient + AppState focus wiring
  lib/theme/              tokens + persisted light/dark/system theme
```

### Data model

The backend stores prices in rupees. The client converts to **integer paise**
at the API boundary and performs all portfolio math in paise, formatting only
at render time. This avoids floating-point drift in P&L and allocation values.

### Portfolio analytics

The **Insights** tab ports the web app's look-through engine
(`src/features/portfolio/analytics.ts`) to pure functions:

- market-cap exposure split into direct holdings and fund/ETF look-through
  (≥ $10B large, ≥ $2B mid, otherwise small);
- sector allocation and sector × market-cap matrices;
- per-scheme mutual fund / ETF allocation with disclosed asset allocation,
  sector weights and underlying holdings.

The **Allocation** tab turns the same engine's target-vs-current tree into a
policy screen: drift monitor, rebalancing gaps and the full allocation tree,
using the saved ideal allocation or the default 60/20/5/5/10 policy.

Fund data cached on the user snapshot is used first. Missing schemes are fetched
lazily from `/api/holdings` and cached in TanStack Query for a day. The bundled
demo portfolio ships with sample scheme holdings so every chart renders offline.

### Auth and demo mode

Email/password authentication uses the Firebase JS SDK with AsyncStorage
persistence, so sessions survive app restarts. Demo mode is a local flag that
renders the bundled sample portfolio and disables all writes.

### Google Sign-In

Google login uses the native account picker
(`@react-native-google-signin/google-signin`) and exchanges the returned ID token
for a Firebase credential, so Google and email/password users share the same
Firebase project.

> **Expo Go cannot run Google Sign-In.** Expo Go cannot load custom native
> modules or use your app's URL scheme, so the Google button is disabled there.
> Email/password and demo mode keep working in Expo Go; use a development build
> to test Google.

1. In **Firebase Console → Authentication**, enable the **Google** provider.
2. Add an Android app with package `com.assettracker.app` and the SHA-1 of your
   signing certificate, then download `google-services.json` into `mobile/`.
   For iOS, add the bundle ID and download `GoogleService-Info.plist` into
   `mobile/`. `app.config.ts` attaches those files automatically when present.
3. Copy the **Web client ID** from **Google Cloud Console → Credentials** into
   `mobile/.env`:

   ```bash
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=....apps.googleusercontent.com
   ```

   If you use Google Cloud Console for iOS instead of a Firebase plist, also set
   `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; the config derives the required URL scheme.
4. Build and run the native app:

   ```bash
   npx expo prebuild --clean
   npx expo run:android   # local build; requires the Android SDK
   ```

   For a cloud build, run `npx eas-cli@latest build:configure` once and use an
   internal-distribution `preview` profile. A `development` profile also needs
   `npx expo install expo-dev-client`.

Never add an OAuth client secret to the app — native Google Sign-In only needs
public client IDs and the Firebase client files.

## Quality gates

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint-config-expo
npm run doctor      # expo-doctor
```

> **Backend note:** `/api/sync` currently trusts a client-supplied `uid`. Before
> distributing this app publicly, verify a Firebase ID token server-side and use
> the decoded `uid`. The mobile client is ready to send `Authorization: Bearer`
> headers through the shared API client.
