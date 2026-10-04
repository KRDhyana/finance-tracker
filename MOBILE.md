# Finance Tracker — Mobile (Capacitor)

## Prerequisites

- Node.js 20+
- pnpm (`corepack enable` then `pnpm install`)
- **Android Studio** (required to build the APK)
  - Install **Android SDK Platform 35** (or latest)
  - Install **Android SDK Build-Tools**
  - Default SDK path: `C:\Users\<you>\AppData\Local\Android\Sdk`
- Supabase project with env vars in `.env`

If Gradle reports `SDK location not found`, either:

- set `ANDROID_HOME` to your SDK folder, or
- copy `android/local.properties.example` → `android/local.properties` and set `sdk.dir`

## Environment

Copy `.env.example` values into `.env`:

```env
SUPABASE_URL=...
SUPABASE_KEY=...
BASE_URL=https://your-web-domain.com
```

For native magic-link login, add this redirect URL in **Supabase → Authentication → URL configuration**:

```
com.financetracker.app://confirm
```

## Push notifications (optional)

1. Run `supabase/device_tokens.sql` in the Supabase SQL editor.
2. Create a Firebase project and add `google-services.json` to `android/app/`.
3. Configure FCM in Firebase Console.

Until Firebase is configured, the app works normally; push registration fails silently.

## Build debug APK

```bash
cd finance-tracker
pnpm install
pnpm run build:android:debug
```

Output APK:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a device:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm run generate` | Static web build → `.output/public` |
| `pnpm run cap:sync` | Generate + sync to native projects |
| `pnpm run cap:android` | Open Android Studio |
| `pnpm run build:android:debug` | Full pipeline → debug APK |

## Release APK (Play Store)

1. Create a keystore.
2. Configure signing in `android/app/build.gradle`.
3. Run `./gradlew assembleRelease` inside `android/`.

## Web app unchanged

The browser/PWA build still works:

```bash
pnpm run generate
pnpm run preview
```
