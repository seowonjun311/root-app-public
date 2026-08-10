# Character V73 standard-character playback stability

## Goal

Stabilize Moru/Mongsil/Dami action-frame playback on Home without changing Rooty's legacy renderer or the behavior decision engine.

## Playback policy

New:

`constants/characterPlayback.ts`

Modes:

- idle -> loop
- walk -> loop
- sit -> loop
- sleep -> loop
- happy -> once-hold
- touch -> once-hold

`once-hold` means:

1. start at frame 0
2. advance through every frame once
3. stop scheduling frame changes at the last frame
4. keep the last frame visible until Home changes action or a new playback key arrives

## CharacterSprite engine

V73 adds:

- `playbackKey`
- `playbackMode`

Frame 0 reset occurs when:

- character changes
- action changes
- playbackKey changes

The old always-running interval is replaced by one timeout per frame.

This avoids unnecessary timer work after one-shot actions reach the last frame.

## Same-action cycle restart

Home already provides Rooty-compatible `cycleKey` when available.

V73 forwards that identity as `playbackKey`.

Therefore:

- walk -> sit resets naturally by action
- sit -> sleep resets naturally by action
- happy cycle A -> happy cycle B can reset by playbackKey
- touch cycle A -> touch cycle B can reset by playbackKey
- same action without a new cycle identity does not reset unnecessarily

V73 removes the standard-character React `key` remount workaround.

The component remains mounted and resets its own playback state explicitly.

## Sleep behavior

Sleep stays in `loop` mode.

If Home keeps the same sleep action and cycle identity, the sleep animation continues instead of restarting.

A genuinely new sleep cycle with a new playback key can restart from frame 0.

## Preview verification

`/character-preview` shows:

- playback mode
- Replay button

Press Replay while keeping the same action selected.

Expected:

- loop actions restart at frame 0 and continue looping
- happy/touch restart at frame 0, play once, then hold the final frame

## Rooty safety

Rooty still returns directly to `LegacyRootySprite`.

V73 does not change:

- RootySprite
- Rooty directional assets/resolver
- V55-V66 behavior policies
- selected character persistence
- V71 presentation timing constants
- V72 calibration persistence
- Home source

## Files

New:

- `constants/characterPlayback.ts`
- `docs/character-v73-standard-character-playback-stability-checklist.md`

Changed:

- `components/characters/CharacterSprite.tsx`
- `components/characters/SelectedCharacterSprite.tsx`
- `app/character-preview.tsx`

## Manual device verification

1. Open Character change.
2. Select Moru.
3. Test idle, walk, sit, sleep.
4. Confirm all four loop continuously.
5. Select happy.
6. Confirm it plays once and holds the final frame.
7. Press Replay.
8. Confirm happy starts again from frame 0.
9. Repeat for touch.
10. Repeat for Mongsil and Dami.
11. Save a standard character to Home.
12. Confirm normal Home behavior changes restart frames correctly.
13. Watch sleep and confirm it does not repeatedly jump to frame 0 during one continuous sleep.
14. Save Rooty and confirm legacy direction/fallback/touch behavior is unchanged.

## Suggested next phase

Character V74 can focus on one of two paths:

1. standard-character directional asset support, if directional image sets exist
2. character-specific personality/behavior weighting, while preserving common V55-V66 safety policy layers
