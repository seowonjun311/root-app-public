# Character V72 device presentation calibration

## Goal

Tune standard-character Home size and ground alignment on a real device without guessing values in source code.

## Persistent override store

New:

`store/characterPresentationOverrides.ts`

Storage key:

`character_presentation_overrides_v1`

Each standard character stores:

- scale
- translateY

Characters:

- moru
- mongsil
- dami

Rooty is excluded.

## Limits

Scale:

- minimum 0.70
- maximum 1.40
- step 0.05
- default 1.00

Vertical translation:

- minimum -40 px
- maximum +40 px
- step 2 px
- default 0 px

Negative Y moves upward.
Positive Y moves downward.

## Composition with V71

V71 base presentation remains source-controlled.

Effective standard-character Home presentation:

`base homeScale * saved override scale`

and:

`base homeTranslateY + saved override translateY`

V71 action frame durations are unchanged.

## Selection screen

`/character-preview` adds:

- Size -
- Size +
- Up
- Down
- Reset calibration

Changes auto-save.

The preview uses the same override so the user can see the adjustment immediately.

## Rooty safety

Rooty remains outside V72 calibration.

When Rooty is selected:

- Legacy RootySprite remains the Home renderer
- no V72 scale override is applied
- no V72 Y override is applied
- legacy directional/fallback behavior remains untouched

## Files

New:

- `store/characterPresentationOverrides.ts`
- `docs/character-v72-device-presentation-calibration-checklist.md`

Changed:

- `app/character-preview.tsx`
- `components/characters/SelectedCharacterSprite.tsx`

Untouched:

- `app/(tabs)/index.tsx`
- `constants/characterPresentation.ts`
- `store/selectedCharacter.ts`
- `constants/characterAssets.ts`
- `components/characters/CharacterSprite.tsx`
- `components/rooty/RootySprite.tsx`
- Behavior V55-V66 policy files
- package files

## Manual device calibration

For Moru:

1. Select Moru.
2. Save Moru as Home character.
3. Use Size +/- until its body scale fits the village.
4. Use Up/Down until the feet visually meet the ground.
5. Return Home and verify.
6. Repeat if needed.

Repeat independently for Mongsil and Dami.

If a result becomes worse, press Reset calibration.

## Suggested next phase

Character V73 can lock the tested device values into source defaults if desired, or keep V72 user/device-specific calibration permanently.

Another V73 option is directional standard-character assets once directional image sets are available.
