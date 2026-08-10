# Character V69 CharacterSprite compatibility preview checklist

## Goal

Verify the V68 four-character common action registry visually before connecting character choice to Home.

## New files

- `components/characters/CharacterSprite.tsx`
- `app/character-preview.tsx`
- `docs/character-v69-character-sprite-preview-checklist.md`

## CharacterSprite

`CharacterSprite` accepts:

- `characterId`
- `action`
- `size`
- `frameDurationMs`
- `paused`
- `style`
- `testID`

It resolves frames only through:

`getCharacterFrames(characterId, action)`

from Character V68.

## Rooty compatibility

Rooty remains:

`frameProfile: legacy-rooty`

V69 does not modify or replace:

- `RootySprite`
- `ROOTY_FRAMES`
- directional Rooty resolution
- Home Rooty rendering

The preview uses the common V68 registry interface.

If a Rooty action has no generic frames, V68's `getCharacterFrames` returns Rooty's idle frames.

The preview displays when this fallback is being used.

## Standard characters

Moru, Mongsil, and Dami remain:

`frameProfile: standard-23`

Each uses:

- idle 4
- walk 4
- sit 4
- sleep 5
- happy 4
- touch 2

V69 animates whatever frame count the registry returns, so it does not hard-code 23-frame assumptions inside `CharacterSprite`.

## Preview route

Route:

`/character-preview`

The preview provides:

- Rooty / Moru / Mongsil / Dami selector
- idle / walk / sit / sleep / happy / touch selector
- animation playback
- pause / resume
- current frame profile
- raw action frame count
- resolved frame count
- fallback indicator

## Safety boundary

V69 does not modify:

- `app/(tabs)/index.tsx`
- `components/rooty/RootySprite.tsx`
- `constants/rootyAssets.ts`
- `constants/rootyDirectionalAssets.ts`
- `constants/characterAssets.ts`
- Behavior V55-V66 policies
- package files

No selected-character persistence is added.

No Home character switch is added.

No Rooty direction behavior is changed.

## Manual device verification

Open:

`/character-preview`

For Moru, Mongsil, and Dami:

1. Select each character.
2. Test all six actions.
3. Confirm all images belong to the selected character.
4. Confirm animation frames advance.
5. Confirm sleep shows five frames.
6. Confirm touch shows two frames.
7. Pause and resume.
8. Confirm changing character resets animation to frame 1.
9. Confirm changing action resets animation to frame 1.

For Rooty:

1. Select Rooty.
2. Test all six actions.
3. Confirm variable frame counts are accepted.
4. Confirm missing generic actions use visible idle fallback.
5. Confirm this preview does not affect the existing Home Rooty.

## Suggested next phase

Character V70:

`selected character persistence + safe Home render switch`

V70 should first store a selected `CharacterId`, defaulting to `rooty`.

Home should continue using the existing Rooty path when selected character is Rooty.

Only standard-23 characters should use `CharacterSprite`.

Behavior V55-V66 state/decision logic can remain shared because behavior output actions already use the same six-action vocabulary.

## PC verification

- exact Character V68 baseline
- V68 registry unchanged
- CharacterSprite marker exists
- CharacterSprite consumes getCharacterFrames
- variable frame counts supported
- preview route exists
- four character choices
- six action choices
- fallback indicator exists
- TypeScript passes
- Git whitespace passes
- exactly three V69 files changed
- existing Home/Rooty/V68 registry/Behavior files untouched
- commit and push succeed
- final working tree clean
- local main equals origin/main
