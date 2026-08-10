# Character V74 standard-character facing compatibility

## Goal

Give Moru/Mongsil/Dami a visible left/right facing response on Home without requiring new directional image assets.

## Why mirror instead of directional assets

The standard-23 characters currently have generic action frames only.

They do not have Rooty's directional asset set.

V74 therefore adds a compatibility layer:

- left direction -> horizontal mirror
- right direction -> original orientation
- neutral/unrecognized direction -> original orientation

No image is invented and no directional file requirement is added.

## Direction policy

New:

`constants/characterFacing.ts`

The direction input is normalized to lowercase alphabetic text.

If the normalized string contains:

- `left` -> facing left / scaleX -1
- `right` -> facing right / scaleX 1
- neither -> neutral / scaleX 1

This supports names such as:

- left
- upLeft
- downLeft
- right
- upRight
- downRight

without importing Rooty's concrete direction type.

## Home wiring

`SelectedCharacterSprite` reads the existing legacy Home direction prop through a narrow unknown-safe adapter.

For standard characters only:

`scaleX` is appended after the existing V72 `translateY` transform.

V72 calibration and V73 playback stay active.

## Rooty safety

Rooty remains on the exact LegacyRootySprite path.

V74 does not change Rooty's:

- directional resolver
- directional assets
- generic fallback
- size
- playback
- behavior

## Preview

`/character-preview` adds:

- Left
- Right

for Moru/Mongsil/Dami.

Left mirrors the current generic frame.
Right restores the original orientation.

For Rooty, the preview explains that Home still uses the legacy directional resolver.

## Files

New:

- `constants/characterFacing.ts`
- `docs/character-v74-standard-character-facing-checklist.md`

Changed:

- `components/characters/SelectedCharacterSprite.tsx`
- `app/character-preview.tsx`

Untouched:

- `app/(tabs)/index.tsx`
- `components/characters/CharacterSprite.tsx`
- `constants/characterPlayback.ts`
- `constants/characterPresentation.ts`
- `store/characterPresentationOverrides.ts`
- `store/selectedCharacter.ts`
- `constants/characterAssets.ts`
- `components/rooty/RootySprite.tsx`
- `constants/rootyDirectionalAssets.ts`
- Behavior V55-V66 policy files
- package files

## Manual verification

1. Open Character change.
2. Select Moru.
3. Tap Left and Right.
4. Confirm the same artwork mirrors horizontally.
5. Repeat for idle/walk/sit/sleep/happy/touch.
6. Repeat for Mongsil and Dami.
7. Save a standard character to Home.
8. Watch it walk left and right.
9. Confirm leftward movement mirrors the character.
10. Confirm rightward movement uses the original orientation.
11. Confirm size/Y calibration is still applied.
12. Confirm happy/touch once-hold playback is still correct.
13. Save Rooty.
14. Confirm Rooty's real directional frames/fallback remain unchanged.

## Known boundary

V74 does not create true up/down/back views for standard characters.

It only provides left/right mirroring of generic frames.

True directional standard-character rendering requires actual directional art assets.

## Suggested next phase

Character V75 can proceed with either:

1. character-specific personality weighting layered safely above the shared behavior engine
2. true directional standard-character asset registry, after directional image sets are created
