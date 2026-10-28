# Android setup

This guide covers local Android development, EAS test builds, and preparing a
Google Play release. It describes the repository's current configuration; it
does not create a build, change signing, or verify a device or Play Console
release.

## Current project settings

- Expo app name: `GospelAI`; Expo SDK: 54; React Native: 0.81.
- Android application ID (package): `com.steomi.gospelsai`. Keep this exact
  value for every test and store build. Changing it creates a different Android
  app and prevents normal upgrades of an installed app.
- App version shown to users: `2.0.0` (`expo.version` in `app.json`).
- `eas.json` uses `appVersionSource: "remote"` and enables
  `autoIncrement: true` for production. EAS manages the Android build number
  remotely; it is not set in `app.json`. Check the EAS project's remote version
  before the first store build, especially if this app already has a Play
  listing.
- `development` enables the development client and internal distribution.
  `preview` uses internal distribution without the development client.
  Android internal-distribution builds are installable APKs by default.
- `production` has no APK override, so EAS produces an Android App Bundle
  (AAB), the store artifact. The `production` submit profile is empty: no
  Google service-account key, track, or release status is configured in the
  repository.
- The app uses an existing external Clerk instance. The EAS
  `eas-build-post-install` check requires
  `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and checks its format and hostname only.
  It does not check provider configuration, connectivity, or callback
  delivery. The existing app scheme is `gospelsai`; keep the
  `oauth-native-callback` path unchanged.

## Local Android development

Use a workstation with:

- Node.js 20.19.x or later in the SDK 54-compatible range, plus npm.
- Android Studio with Android SDK Platform 36, Android SDK Build-Tools,
  Platform-Tools, and Android Emulator installed.
- JDK 17.
- An Android Virtual Device (AVD), or a physical Android device with USB
  debugging enabled. A physical device is not required when using an emulator.

Expo's current [SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/)
lists Android compile/target SDK 36 and Node.js 20.19.x. Follow the Expo
[Android Studio Emulator setup](https://docs.expo.dev/workflow/android-studio-emulator/)
guide to install the SDK and configure `JAVA_HOME`, `ANDROID_HOME`, and the
Android `platform-tools` and `emulator` paths. On SDK 54, install Watchman on
macOS or Linux as described in Expo's setup guide.

From the project root:

```sh
npm ci
```

Start an AVD from Android Studio's Device Manager. Confirm it is visible before
building:

```sh
adb devices
```

Then run the project's Android script. It is an alias for
`expo run:android`; Expo generates the native Android project if needed, builds
the app locally, installs it on the running emulator, and starts the
development server. Use this native development build rather than Expo Go:
the app includes native modules that need to be compiled into the app:

```sh
npm run android
```

For a USB-connected device, enable Developer options and USB debugging, accept
the computer authorization prompt on the device, check `adb devices`, then run
the same command. If more than one device is attached, use Expo's device
selection or disconnect the unused device.

For an already-installed development build, start the bundler explicitly:

```sh
npx expo start --dev-client
```

Keep the workstation and device on a reachable network. If the device cannot
reach the development server, confirm the emulator/device is online and listed
by `adb devices`, check that the firewall permits the connection, and retry
with Expo's tunnel connection option if needed.

### Local troubleshooting

- **No device appears:** start the AVD first, or reconnect/unlock the phone,
  re-accept its USB debugging prompt, then run `adb devices` again.
- **Android tools or Java are not found:** confirm `ANDROID_HOME` points to the
  SDK location shown in Android Studio, `platform-tools` is on `PATH`, and
  `JAVA_HOME` points to JDK 17. Restart the terminal after changing shell
  settings.
- **Build asks for an Android SDK component:** install Android SDK Platform 36
  and the Build-Tools from Android Studio's SDK Manager.
- **The app opens but cannot reach Metro:** run `npx expo start --dev-client`,
  confirm both devices can reach the host, and check the local firewall or
  tunnel connection.
- **A local native build fails:** from the project root, check the first Gradle
  error, installed Java/SDK versions, and dependency installation before
  retrying. Do not delete app data or replace signing credentials as a general
  troubleshooting step.

## EAS development and preview builds

EAS cloud builds do not require Android Studio or a local Android SDK. They do
require access to this existing Expo project and an EAS account. The configured
project ID is already in `app.json`; do not run project initialization or change
the ID.

Install and sign in to the EAS CLI on the workstation:

```sh
npm install --global eas-cli
eas --version
eas login
```

Use an EAS CLI version satisfying the `eas.json` requirement `>= 16.19.3`.
For either test build, use the profile that matches the purpose:

```sh
# Development build: contains expo-dev-client and connects to Metro.
eas build --platform android --profile development

# Preview build: standalone internal test app; no Metro connection required.
eas build --platform android --profile preview
```

Both profiles use internal distribution and produce an installable APK under
the current EAS defaults. EAS prints a build page/install link when the build
is ready. Open that link on the Android device or emulator and install the
APK. On an emulator, the APK can also be downloaded on the workstation and
installed with:

```sh
adb install path/to/build.apk
```

For a development build, start Metro after installation with
`npx expo start --dev-client` and open the project from the development client.
A preview build is a standalone snapshot and does not connect to Metro.

To update a test install, build again using the same profile and install the
new APK from its EAS build page. Android updates require the same package ID
and compatible signing key. If Android reports a signature conflict, stop and
confirm the existing EAS signing credentials rather than replacing them.
Uninstalling may erase local app data, so do not use it as a first repair step.

This project does not currently configure EAS Update (`updates`, a runtime
version, or update channels). Do not use `eas update` as a substitute for
installing a new test binary. Development builds can load JavaScript from a
running Metro server; native changes require another native build.

### EAS configuration and sign-in checks

The three build profiles do not explicitly name an EAS environment. EAS selects
an environment from the profile configuration: development for the
development-client profile, preview for an internal non-development profile,
and production for a store build. Before building, make sure
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is present in the EAS environment used by
that profile. Configure it through EAS project environment settings; for local
Replit runs, use Replit Secrets; on a personal workstation, supply it through
the operating system's secure environment configuration. Do not paste keys into
chat, save them in project files, commit them, or put them in `app.json` or
`eas.json`.

If the build's post-install check fails, confirm the variable is set in the
right EAS environment and retry. The check prints only a public hostname and
test/live label, but a successful check is not proof that Android can sign in.
On the installed build, verify the intended Clerk instance, then test email
sign-in and any enabled providers using a safe test account. Preserve the
existing `gospelsai://oauth-native-callback` return scheme/path. Real Android
provider sign-in and return callbacks still require device verification.

## Google Play release

An EAS production build creates the AAB to upload; it does not publish the app.
Do not install the AAB directly. Google Play generates device-specific APKs
from it.

### Before the first upload

These actions require the user's Google Play Console account and are not
configured by this repository:

1. Create or access the Google Play Developer account and create the app in
   Play Console. Use the existing package ID `com.steomi.gospelsai` exactly;
   do not create a second app ID to work around a setup error.
2. Complete the Play Console setup tasks, including the store listing, app
   content declarations, data safety, content rating, target-audience details,
   and any testing or review requirements shown for this account and app.
   Play Console requirements and screens can change; use the current console
   checklist.
3. Review Android app signing before uploading. EAS manages Android signing
   credentials remotely by default when no local credentials are configured.
   Keep the same upload/signing credentials for later updates. If Play App
   Signing is offered, review and retain the upload-key recovery information.
   Never put keystores, passwords, or service-account JSON files in the
   repository or chat.
4. If using EAS Submit, create a Google service account with the required Play
   Console access and add its key to this app in EAS project credentials. This
   is separate from the Android app-signing key. The repository contains no
   service-account key or local key path; whether a key is already attached to
   this EAS project must be checked in EAS project credentials.

For a first release, either upload the AAB manually in Play Console or use EAS
Submit after the app and EAS service-account access are ready. The manual route
lets you create and review the first internal-testing release in Play Console.
EAS Submit can also create the first release on the internal testing track by
default. Confirm the selected track and release status before any submission;
the repository's empty `submit.production` profile does not explicitly set
them.

### Build and submit

Check the app version and remote Android build number in EAS before creating a
production build. The current `production` profile increments the remote build
number automatically; do not add or change `android.versionCode` just to make
a submission. The public app version remains `2.0.0` until deliberately
changed in a separately reviewed release.

When ready to create the AAB:

```sh
eas build --platform android --profile production
```

After reviewing the build in EAS:

- **Manual upload:** download the `.aab` from the EAS build page and upload it
  to the intended Play Console track. Complete Play Console warnings and
  release tasks, test the internal track with opted-in testers, then promote
  to production when ready.
- **EAS Submit:** after the app exists in Play Console and the service-account
  key is assigned to this app in EAS, run:

  ```sh
  eas submit --platform android --profile production
  ```

  Follow the prompts and confirm the intended build and track. The current
  submit profile has no explicit `track`, `releaseStatus`, or local key path.
  Do not add a service-account JSON file or secret path to the project.

Play Console may require further listing, testing, or review steps before a
release can reach production. Uploading or submitting an AAB alone does not
mean the app is published.

## What has and has not been verified

Confirmed from project files: the Android package ID, Expo SDK and app version,
the development/preview/production EAS profiles, remote production
auto-increment, the Clerk post-install format check, and the configured Expo
project ID.

Not performed for this guide: an Android local build, EAS build or install,
Android emulator or physical-device run, Android sign-in/provider callback,
Play Console account/app setup, confirmation of EAS signing or Play service
account credentials, signing-key review, AAB upload, or store release. These
require the user's workstation/device, EAS account, and/or Play Console access.
A JavaScript export or successful Clerk format check would not replace those
checks.

## Official references

- [Expo SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/)
- [Android Studio Emulator setup](https://docs.expo.dev/workflow/android-studio-emulator/)
- [EAS internal distribution](https://docs.expo.dev/build/internal-distribution/)
- [EAS Android build process and signing](https://docs.expo.dev/build-reference/android-builds/)
- [EAS app version management](https://docs.expo.dev/build-reference/app-versions/)
- [Submit to Google Play with EAS](https://docs.expo.dev/submit/android/)
- [Manually submit an Android app](https://docs.expo.dev/submit/android-manual/)
