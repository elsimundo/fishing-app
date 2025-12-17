---
description: Capacitor mobile workflow (iOS + Android)
---

This workflow standardizes how to develop, test, and ship the Catchi web app as a native Capacitor app.

## 0) One-time prerequisites

- macOS + Xcode installed (for iOS)
- Android Studio installed (for Android)
- iPhone: Developer Mode ON (iOS 16+)
- iPhone: Trust developer cert after first install (Settings → General → VPN & Device Management)

## 1) Daily dev loop (build/sync/run)

1. Run the web app locally (optional) for fast iteration:
   - `pnpm dev`

2. When you want the native app updated:
   - `pnpm cap:sync`

3. Run on device/simulator:
   - iOS: open Xcode via `pnpm cap:ios` then `Cmd+R`
   - Android: open Android Studio via `pnpm cap:android` then Run

Notes:
- `cap sync` is required whenever web assets change.
- Avoid changing files inside `ios/` and `android/` unless needed; prefer Capacitor config + plugins.

## 2) Safe area + status bar polish

Goals:
- Header background fills the iOS status bar area.
- Content uses `viewport-fit=cover`.
- Status bar overlays the webview and uses correct style.

Checklist:
- `index.html` has `viewport-fit=cover`.
- Use `env(safe-area-inset-top)` where needed.
- StatusBar plugin configured:
  - `StatusBar.setOverlaysWebView({ overlay: true })`
  - `StatusBar.setStyle({ style: Style.Dark })`

## 3) App icon + splash screen

iOS:
- Replace app icon set in:
  - `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Android:
- Replace launcher icons under:
  - `android/app/src/main/res/mipmap-*`

Optional tooling:
- Use a single 1024x1024 source icon + generator (we can add one if desired).

Splash:
- Confirm SplashScreen settings in `capacitor.config.ts`.
- Add branded splash assets later if desired.

## 4) Camera for catch photos

Goals:
- Use native camera/gallery picker.

Steps:
- Install `@capacitor/camera`
- Add platform permissions (iOS/Android)
- Implement a small helper:
  - `pickPhoto()` returns a file/blob/url for upload

## 5) Push notifications

Goals:
- Register device tokens.
- Send push notifications for key events.

Steps:
- Install `@capacitor/push-notifications`
- iOS:
  - Enable Push capability in Xcode
  - Set up APNs key in Apple Developer portal (requires paid account for distribution)
- Backend:
  - Store device tokens in Supabase
  - Create an edge function or server to send notifications

## 6) Deep links

Goals:
- Open app via `catchi://...` URLs.

Steps:
- Install `@capacitor/app`
- Configure URL scheme:
  - iOS: Info.plist URL Types
  - Android: intent filters
- Handle incoming URLs and route inside React Router

## 7) Release checklist

iOS:
- Upgrade to paid Apple Developer Program
- Create App Store Connect app
- Set version/build
- TestFlight internal → external

Android:
- Create Play Console app
- Generate signed release keystore
- Build AAB and upload

## Quick reference

- Sync: `pnpm cap:sync`
- Open iOS: `pnpm cap:ios`
- Open Android: `pnpm cap:android`
- Run iOS from CLI: `pnpm cap:run:ios`
- Run Android from CLI: `pnpm cap:run:android`
