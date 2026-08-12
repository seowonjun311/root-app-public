# Character V101C - Floating Motion + Scale

## Goal

Extend the Android floating character created in V101A/V101B so it feels alive
outside ROOT without changing ROOT's existing behavior/persistence authority.

## Added in V101C

- Autonomous slow movement above other apps.
- Auto-move ON/OFF setting.
- One-finger drag keeps highest priority.
- Touching the character pauses autonomous movement immediately.
- Autonomous movement resumes about 4 seconds after the user releases it.
- Two-finger pinch scales the floating character.
- Settings screen scale control from 60% to 160%.
- Position, scale, and auto-move preference persist in Android SharedPreferences.
- Existing 4-frame native idle animation remains active.

## Native behavior

The service continues to use:

- `TYPE_APPLICATION_OVERLAY`
- foreground service
- `START_STICKY`
- `android:stopWithTask="false"`

Motion is driven on the Android main looper at a low-frequency movement tick.
The character chooses a nearby target, moves toward it, pauses for roughly
2-5 seconds, then chooses another nearby target.

Movement is clamped to the visible display bounds based on the current overlay
size.

## Gesture priority

1. Two fingers: pinch scale.
2. One finger held/moved: manual drag.
3. Short tap without drag/scale: open ROOT.
4. Autonomous movement: only while the user is not interacting.

## Device verification

1. Install a new Android development build because Kotlin/native code changed.
2. Start the floating character.
3. Open KakaoTalk, YouTube, Chrome, or another app.
4. Confirm the character remains visible.
5. Wait several seconds and confirm it starts moving by itself.
6. Grab it with one finger and confirm autonomous movement stops immediately.
7. Drag it to another location and release.
8. Confirm it resumes autonomous movement after about 4 seconds.
9. Pinch with two fingers and confirm the character grows/shrinks.
10. Confirm the scale never becomes smaller than 60% or larger than 160%.
11. Open ROOT -> Character Preview -> 화면 위 캐릭터.
12. Turn 자동 이동 OFF and confirm the character no longer moves itself.
13. Turn 자동 이동 ON and confirm it resumes.
14. Change 캐릭터 크기 in settings and confirm the overlay updates.
15. Stop and restart the floating character and confirm position/scale/auto-move
    settings are preserved.
16. Remove ROOT from Recents and confirm the foreground-service overlay remains.
17. Tap the character and confirm ROOT opens.
18. Use the notification 숨기기 action and confirm the overlay disappears.

## Scope boundary

V101C must not modify:

- ROOT home behavior engine
- V55-V99 behavior policies
- relationship/mood/energy persistence
- selected-character store semantics
- source character image assets
- Android app manifest
- V101A local Expo module manifest
- V101B 4-frame native drawable resources
