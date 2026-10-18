# Android dev (biz-mobile)

`apps/biz-mobile` is a Tauri v2 app: a Vite frontend on `:1430` plus a Rust shell in
`apps/biz-mobile/src-tauri/`. The Android project is committed at
`src-tauri/gen/android`, so no `tauri android init` is needed.

## Prerequisites

- Android SDK (`ANDROID_HOME`) with NDK 26.x (`NDK_HOME`), and the JDK bundled with
  Android Studio (`~/.local/share/android-studio/jbr`).
- Rust Android targets:
  `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
- A device or emulator: `adb devices` (USB debugging enabled, authorization prompt accepted).

## First run in a fresh worktree

Turbo's `dev` task does not build dependencies, and the apps import the workspace
packages from their built `dist/` output. Run `pnpm build` once before the first dev
command, otherwise Vite fails with `Failed to resolve import "@excited-live/i18n"` and the
API fails with `ERR_MODULE_NOT_FOUND ... packages/*/dist/index.mjs`.

## Run on a device

```bash
pnpm --filter @excited-live/biz-mobile android:dev <serial>
```

`<serial>` is the first column of `adb devices` (e.g. `00052141U002461`), passed as a
positional argument. This starts Vite on `:1430`, builds the Rust app, installs it, and
hot-reloads the frontend. The first run is slow (Gradle + Rust compile).

With one device already connected you can omit the serial; the CLI picks it.

## Emulator caveat

With no device running, `tauri android dev` boots an Android emulator itself
(`Info Starting emulator <name>`). That emulator wants ~2.5 GB of RAM and can freeze a
desktop on low-memory machines. Prefer a physical device, or boot the emulator yourself
first so the CLI attaches to it instead:

```bash
emulator -avd Pixel_API_34   # separate terminal
pnpm --filter @excited-live/biz-mobile android:dev
```

## API + mobile with both logs in one terminal

```bash
pnpm turbo run dev --filter=@excited-live/api --filter=@excited-live/biz-mobile
```

Turbo prefixes every line with the package name, and Ctrl+C stops both.

## APK build

```bash
pnpm --filter @excited-live/biz-mobile android:build
```

Output lands under `src-tauri/gen/android/app/build/outputs/apk/`.

## Troubleshooting

- If `adb` drops the device with a USB `Protocol error (errno 71)`, replug it directly
  into the machine (avoid USB hubs) or swap the cable, then re-run `adb devices`.
