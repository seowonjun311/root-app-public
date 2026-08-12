# Character V101A - Android Floating Character Overlay Foundation

## Goal

Keep the currently selected ROOT character visible above other Android apps
after the ROOT Activity is closed or removed from Recents.

This is deliberately separate from the skipped V100 growth expansion.

## Android architecture

V101A adds a local Expo module:

`modules/root-floating-character`

The module is Android-only and autolinks through Expo Modules.

Native runtime:

- `SYSTEM_ALERT_WINDOW`
- `TYPE_APPLICATION_OVERLAY`
- foreground service
- foreground-service type `specialUse`
- `START_STICKY`
- `android:stopWithTask="false"`

The service owns the overlay independently from the ROOT React Activity.

## User flow

Character Preview -> `화면 위 캐릭터`

1. Open `화면 위 표시 권한`.
2. Enable ROOT in Android `다른 앱 위에 표시`.
3. Return to ROOT.
4. Tap `현재 캐릭터 화면 위에 켜기`.
5. Leave ROOT or remove it from Recents.
6. The character remains visible above other apps while the foreground service
   is alive.

The overlay can be dragged.

A light tap on the floating character opens ROOT.

The persistent notification includes a `숨기기` action.

## Character source

V101A embeds one idle frame for each current runtime character:

- rooty
- moru
- mongsil
- dami
- pio
- nuri
- tori

Repository layout is intentionally mixed because Rooty preserves its legacy
runtime asset tree while standard characters use the Character V68+ import
tree:

- Rooty: `assets/rooty/idle/rooty_idle_01.png`
- Standard characters: `characters/<id>/<id>_idle_01.png`

V101A v6 resolves those canonical locations first and also supports the
historical `.png.png` filename edge case plus a narrow fallback search for a
valid idle frame 01.

The resolved frame is copied into Android `drawable-nodpi`.

The selected character ID is sent from the current V97 selected-character
system into the native service.

## What "app closed" means on Android

The V101A target is:

- ROOT Activity goes to background
- another app opens
- ROOT is removed from Recents

The foreground service is designed to continue in those cases.

Android force-stop is different: when the user explicitly force-stops ROOT from
system settings, Android stops the app's services and the overlay cannot remain.

A device reboot is also outside V101A. Automatic reboot restoration can be a
later explicit stage if desired.

OEM battery managers may additionally terminate long-running foreground
services on some devices, so real-device validation is required.

## Android 14+

V101A declares foreground service type:

`specialUse`

and:

`FOREGROUND_SERVICE_SPECIAL_USE`

with a manifest property explaining the persistent user-enabled floating
character overlay use case.

## Android 15+

V101A starts the foreground service from the visible ROOT settings screen after
explicit user action.

It does not attempt to bootstrap a new foreground service invisibly from a
background app state.

## Current scope

V101A intentionally starts with a static selected-character idle frame.

It does not yet:

- animate idle frames outside ROOT
- walk around the full screen
- react to taps with character animation
- show dialogue outside ROOT
- auto-start after reboot
- sync Home position with overlay position

Those belong to V101B/V101C after this native foundation builds and runs on a
real Android device.

## Safety boundaries

V101A does not modify:

- Home behavior runtime
- V99 dialogue runtime
- V98 cloud/account
- V97 growth/acquisition/point authority
- V96 relationship authority
- V95 personality policies
- V59 condition policies
- current character assets
- package.json / package-lock.json
- existing Android app manifest

The overlay permission/service declarations live in the local module manifest
and merge into the Android app at native build time.

## Installer path hardening

V101A v6 keeps repository-generated files on project-relative paths but writes
the temporary Node patcher directly to its absolute `$env:TEMP` path.

This prevents the V101A v3 `WriteAllText` failure caused by attempting to join
an already-rooted Windows temp path beneath the repository directory.

## Native rebuild required

This feature contains new Kotlin/Android resources.

Expo Fast Refresh or a JavaScript-only reload is not enough.

After V101A source installation succeeds, create a new Android native build
before real-device testing.

Recommended next stage:

`V101B - native build verification + animated idle overlay`

First prove the service/permission/overlay lifecycle, then add 4-frame idle
animation while the app is closed.
