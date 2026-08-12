# Character V101B - Floating Idle Animation + Native Build

## Installed behavior

V101B extends the V101A Android overlay without changing ROOT behavior authority.

- Seven selected characters remain supported.
- Each character has four native idle frames.
- The native foreground service advances idle frames every 700 ms.
- Changing the selected character restarts the animation from frame 01.
- Dragging the overlay remains supported.
- Tapping the overlay still opens ROOT.
- Removing ROOT from Recents does not intentionally stop the overlay service.
- Stopping/hiding the overlay cancels animation callbacks.

## Native rebuild required

V101A/V101B contain Android native code and drawable resources.

A new Android development build is required before device testing.

Preferred local physical-device command:

`npx expo run:android --device`

If the development build is already installed but native code changed, rebuild it.
Starting Metro alone is not sufficient for a native-module change.

## Device test

1. Connect the Android phone by USB and allow USB debugging.
2. Build/install the new development build.
3. Open ROOT.
4. Open Character Preview.
5. Open `화면 위 캐릭터`.
6. Enable `다른 앱 위에 표시` if needed.
7. Start the current character overlay.
8. Confirm four-frame idle motion.
9. Drag the character and confirm its position updates.
10. Tap the character and confirm ROOT reopens.
11. Switch ROOT to another selected character and confirm the overlay updates.
12. Open another app and confirm the character remains above it.
13. Remove ROOT from Recents and confirm the foreground-service overlay remains.
14. Use the notification `숨기기` action and confirm the overlay disappears.
15. Explicit Android Force stop is outside the persistence target and should stop the service.

## Not included yet

- Walk animation outside ROOT
- autonomous roaming across other apps
- sit/sleep/happy behavior outside ROOT
- reboot restoration
- battery-adaptive animation cadence
