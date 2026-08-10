# Character V81 real-device comprehensive validation

## Goal

Freeze the current character foundation only after it has been checked on a real device.

V81 does not change character behavior.

It adds a persistent manual verification workflow.

## Route

`/character-device-validation`

The Character preview screen includes:

`Real-device comprehensive validation`

## Validation storage

Key:

`character_v81_device_validation_v1`

This key stores only manual validation results.

It does not modify:

- selected character
- mood
- energy
- affection
- behavior probabilities
- behavior cooldown
- V77 diagnostics
- V78 statistics
- V79 validation result

## Characters

Validate separately:

- Rooty
- Moru
- Mongsil
- Dami

## Checks

1. selected character appears correctly on Home
2. selected character remains after full app restart
3. idle
4. walk
5. sit
6. sleep
7. happy
8. touch
9. left/right facing
10. transition stability
11. stays inside village movement bounds
12. scale/floor alignment
13. V77 runtime diagnostics update
14. V78 cumulative statistics increase
15. V79 personality auto-validation screen works

Each check can be:

- UNTESTED
- PASS
- FAIL

## Recommended test order per character

1. Select the character.
2. Open Home.
3. Confirm visible character.
4. Watch idle and walk.
5. Wait for sit and sleep.
6. Trigger touch.
7. Observe happy when it occurs.
8. Watch both horizontal directions.
9. Watch several action transitions.
10. Confirm character never leaves village bounds.
11. Confirm size and floor alignment.
12. Open V77.
13. Confirm runtime values update.
14. Open V78.
15. Confirm samples accumulate.
16. Open V79.
17. Confirm report loads.
18. Fully terminate app.
19. Relaunch.
20. Confirm selected character persists.

## Passing V81

A character is device-validated when all 15 checks are PASS.

If any check is FAIL, leave it as FAIL.

Do not hide a real-device issue by changing it to UNTESTED.

Collect the failed item names and fix them in the next targeted patch.

## Scope boundary

V81 intentionally does not add:

- new personality tuning
- new movement personality
- new sleep duration personality
- new touch behavior
- new ROOT event integration
- character growth

Those belong to later phases.

## Protected systems

V81 does not edit:

- Home
- V55-V66 behavior policies
- V75 personality
- V76 runtime integration
- V77 diagnostics
- V78 statistics
- V79 auto-validation
- selected-character persistence
- CharacterSprite
- SelectedCharacterSprite
- presentation/calibration/playback/facing
- assets
- package files
