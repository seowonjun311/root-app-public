# Character V71 Home character entry + presentation tuning

## Home selection entry

V71 finds the existing Home settings `Pressable` by its unique settings router call.

It inserts one compact `Character change` button immediately after that existing settings Pressable.

The button routes to:

`/character-preview`

V71 does not rewrite the existing settings block.

The installer verifies that removing only the inserted V71 block reproduces the exact pre-V71 Home source text.

## Presentation profile

New:

`constants/characterPresentation.ts`

The profile provides:

- Home scale
- Home vertical offset
- Preview scale
- Preview vertical offset
- frame duration per action

Initial scale/vertical values remain neutral:

- scale = 1
- translateY = 0

This avoids guessing visual alignment before device verification.

## Standard action rhythm

Moru / Mongsil / Dami:

- idle: 460 ms/frame
- walk: 180 ms/frame
- sit: 380 ms/frame
- sleep: 620 ms/frame
- happy: 180 ms/frame
- touch: 220 ms/frame

Rooty Home rendering does not use these values.

Rooty still delegates directly to the existing LegacyRootySprite.

## Preview

`/character-preview` uses the same presentation profile.

It displays:

- current character profile
- raw/resolved frame count
- frame duration
- preview scale
- saved Home character

## Safety boundary

Untouched:

- selected-character persistence store
- V68 character asset registry
- V69 CharacterSprite implementation
- Legacy RootySprite implementation
- Rooty generic/directional assets
- Behavior V55-V66 policy files
- package files

## Manual device verification

1. Open Home.
2. Confirm `Character change` appears near the existing settings control.
3. Open the selection screen from Home.
4. Select Moru and save.
5. Return Home.
6. Confirm walk feels faster than idle/sit/sleep.
7. Confirm sleep is intentionally slow.
8. Repeat with Mongsil and Dami.
9. Check whether any standard character is too large/small or floats/sinks relative to the ground.
10. Save Rooty and confirm legacy direction/fallback/touch behavior remains unchanged.

## Next tuning

After screenshots/device feedback, adjust only:

- `homeScale`
- `homeTranslateY`
- `previewScale`
- `previewTranslateY`

inside `characterPresentation.ts`.

No behavior-policy change should be needed.
