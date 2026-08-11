# Character V85 persistent double-buffer renderer

## Goal
Keep Moru, Mongsil and Dami continuously visible on Android while animated.

## V83 evidence
- Registry source resolves.
- Direct PNG require resolves.
- `onLoad: LOADED`.
- `Image.getSize`: 1024x1536 for standard characters.

## V84 result
Disabling Android Image fade alone did not solve the long invisible interval.

## V85 renderer
The standard-23 path now uses two persistent Image slots.

1. Slot A keeps the currently visible, already-loaded frame.
2. The requested next frame is assigned to hidden Slot B.
3. Slot B becomes visible only after its `onLoad` fires.
4. On the next transition, Slot A becomes the hidden loading slot.
5. If a requested frame is not ready, the previous loaded frame remains visible.

This intentionally favors continuous character visibility over showing an unloaded next frame.

## Safety
- Only `components/characters/CharacterSprite.tsx` is changed in production code.
- Rooty legacy rendering is untouched.
- All Moru/Mongsil/Dami PNG bytes remain unchanged.
- V82 canvas normalization remains.
- V84 `fadeDuration={0}` behavior remains.
- V55-V81 Home behavior policies remain untouched.

## Device validation
1. Reload the app.
2. Select Mongsil.
3. Watch Home continuously for at least 20 seconds.
4. Mongsil should remain visible between frame transitions.
5. Verify walk, sit, sleep, happy and touch.
6. Repeat with Moru and Dami.
7. Verify Rooty still behaves exactly as before.
