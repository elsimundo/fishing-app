---
description: Capacitor mobile workflow (iOS + Android)
---

# Complete Android App Launch Guide

This workflow covers everything from setup to Play Store submission.

---

## PART A: Two Options for Android

### Option 1: PWA (Progressive Web App) - Simplest
**No app store needed. Users install from browser.**

Already configured! Users can:
1. Visit your deployed site in Chrome on Android
2. Tap ⋮ menu → "Add to Home screen" or "Install app"
3. App appears on home screen, runs fullscreen

**Pros:** No Play Store fees, instant updates, works now
**Cons:** No Play Store presence, limited native features

### Option 2: Capacitor Native App - Full Android App
**Published to Google Play Store.**

This is what the rest of this workflow covers.

---

## PART B: Initial Setup (One-Time)

### B1) Install Android Studio

1. Download from https://developer.android.com/studio
2. Run installer, accept defaults
3. On first launch, let it download SDK components (~2-3GB)
4. Go to **Settings → Languages & Frameworks → Android SDK**
   - SDK Platforms: Install Android 14 (API 34)
   - SDK Tools: Install Android SDK Build-Tools, Android Emulator, Android SDK Platform-Tools

### B2) Install Capacitor in the project

```bash
# Install Capacitor core
pnpm add @capacitor/core @capacitor/cli

# Initialize Capacitor (if not done)
npx cap init "Catchi" "com.catchi.app" --web-dir dist

# Add Android platform
pnpm add @capacitor/android
npx cap add android

# Useful plugins
pnpm add @capacitor/camera @capacitor/splash-screen @capacitor/status-bar
```

### B3) Add npm scripts to package.json

```json
{
  "scripts": {
    "cap:sync": "pnpm build && npx cap sync",
    "cap:android": "npx cap open android",
    "cap:run:android": "npx cap run android"
  }
}
```

### B4) Configure capacitor.config.ts

```typescript
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.catchi.app',
  appName: 'Catchi',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a',
    },
  },
}

export default config
```

---

## PART C: Development & Testing

### C1) Build and sync

```bash
# Build web app and sync to Android
pnpm cap:sync
```

### C2) Test on Android Emulator

1. Open Android Studio: `pnpm cap:android`
2. Click **Device Manager** (phone icon in toolbar)
3. Create a Virtual Device:
   - Select "Pixel 7" or similar
   - Select system image "API 34" (download if needed)
   - Finish
4. Start the emulator
5. Click **Run** (green play button) or `Shift+F10`

### C3) Test on Physical Android Device

1. **Enable Developer Options on phone:**
   - Settings → About Phone → Tap "Build Number" 7 times
   
2. **Enable USB Debugging:**
   - Settings → Developer Options → USB Debugging: ON
   
3. **Connect phone via USB cable**
   - Accept "Allow USB debugging" prompt on phone
   
4. **Run from Android Studio:**
   - Your device should appear in the device dropdown
   - Click Run

### C4) Live reload during development (optional)

For faster iteration, use live reload:

```bash
# Get your local IP
ipconfig getifaddr en0  # e.g., 192.168.0.34

# Update capacitor.config.ts temporarily:
server: {
  url: 'http://192.168.0.34:5175',
  cleartext: true,
}

# Sync and run
pnpm cap:sync
pnpm cap:run:android
```

**Remember to remove the `url` before release builds!**

---

## PART D: App Icons & Splash Screen

### D1) Create app icons

You need icons in multiple sizes. Start with a 1024x1024 PNG.

**Option A: Use Android Studio**
1. Right-click `android/app/src/main/res` → New → Image Asset
2. Select your icon, configure, generate

**Option B: Use online generator**
1. Go to https://icon.kitchen or https://appicon.co
2. Upload 1024x1024 icon
3. Download Android icons
4. Copy to `android/app/src/main/res/mipmap-*` folders

### D2) Splash screen

Update `capacitor.config.ts` splash settings, or add custom splash images:
- `android/app/src/main/res/drawable/splash.png`

---

## PART E: Build for Release

### E1) Create signing keystore (one-time)

```bash
cd android

# Generate keystore (save password securely!)
keytool -genkey -v -keystore catchi-release.keystore \
  -alias catchi -keyalg RSA -keysize 2048 -validity 10000

# Answer prompts:
# - Keystore password: (create strong password)
# - Key password: (same or different)
# - Name, Organization, etc.
```

**⚠️ CRITICAL: Back up `catchi-release.keystore` and passwords!**
If lost, you cannot update your app on Play Store.

### E2) Configure signing in Gradle

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('../catchi-release.keystore')
            storePassword 'YOUR_KEYSTORE_PASSWORD'
            keyAlias 'catchi'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Better: Use environment variables or local.properties for passwords!**

### E3) Build release AAB (App Bundle)

```bash
cd android

# Build release bundle
./gradlew bundleRelease

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## PART F: Google Play Store Submission

### F1) Create Google Play Developer account

1. Go to https://play.google.com/console
2. Pay one-time $25 registration fee
3. Complete identity verification (may take 1-2 days)

### F2) Create app in Play Console

1. Click **Create app**
2. Fill in:
   - App name: Catchi
   - Default language: English
   - App or game: App
   - Free or paid: Free
3. Accept policies

### F3) Complete store listing

**Main store listing:**
- Short description (80 chars max)
- Full description (4000 chars max)
- App icon (512x512 PNG)
- Feature graphic (1024x500 PNG)
- Screenshots (min 2, recommended 8):
  - Phone: 1080x1920 or similar
  - Tablet (optional): 1200x1920

**App content:**
- Privacy policy URL (required)
- Content rating questionnaire
- Target audience and content
- Data safety form

### F4) Upload your app

1. Go to **Release → Production**
2. Click **Create new release**
3. Upload your `app-release.aab` file
4. Add release notes
5. Click **Review release**

### F5) Testing tracks (recommended)

Before production, use testing tracks:

**Internal testing:** Up to 100 testers, instant approval
**Closed testing:** Selected users, reviewed within hours
**Open testing:** Anyone can join, reviewed

### F6) Submit for review

1. Ensure all sections are complete (green checkmarks)
2. Click **Send for review**
3. Review takes 1-7 days for new apps

---

## PART G: Quick Reference Commands

```bash
# Sync web build to native
pnpm cap:sync

# Open in Android Studio
pnpm cap:android

# Run on connected device/emulator
pnpm cap:run:android

# Build debug APK
cd android && ./gradlew assembleDebug

# Build release AAB
cd android && ./gradlew bundleRelease

# Install debug APK directly
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## PART H: Checklist Summary

- [ ] Android Studio installed with SDK 34
- [ ] Capacitor installed and configured
- [ ] App runs on emulator
- [ ] App runs on physical device
- [ ] App icons added (all sizes)
- [ ] Splash screen configured
- [ ] Signing keystore created and backed up
- [ ] Release AAB builds successfully
- [ ] Google Play Developer account created
- [ ] Store listing complete
- [ ] Privacy policy URL added
- [ ] App uploaded to internal testing
- [ ] Tested by real users
- [ ] Submitted to production

---

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
