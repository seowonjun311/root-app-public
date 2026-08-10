# Character V78 runtime statistics

## Goal

Turn V77's single latest observation into persistent character-by-character evidence.

V78 accumulates the actual V77 observation results without changing behavior decisions.

## Persistence

Storage key:

`character_runtime_statistics_v1`

Per character:

- up to 100 rest decision samples
- up to 100 social chance evaluation samples

Characters:

- rooty
- moru
- mongsil
- dami

Oldest samples are removed when a list exceeds 100.

## Rest sample

Each actual final rest decision stores:

- timestamp
- V75 personality-adjusted rest probabilities when available
- V66 anti-repeat final rest probabilities
- actual selected rest behavior

Therefore the statistics screen can compare intended personality probability with actual selected rest distribution.

## Social sample

Each V61/V63/V64 personality chance evaluation stores:

- timestamp
- channel
- final personality-adjusted chance

Channels:

- spontaneousHappy
- passiveAttention
- bondedFollowUpTouch

Important:

Social sample count is evaluation count, not actual action-trigger count.

V78 intentionally labels this distinction in the UI.

## Non-blocking behavior path

Behavior evaluation does not await AsyncStorage.

V77 observation calls enqueue V78 persistence work in a serialized Promise queue and return immediately.

Therefore persistent statistics are observational side effects and do not participate in the behavior decision result.

## Route

`/character-runtime-statistics`

The V77 diagnostics screen includes a Character cumulative statistics button.

## Statistics UI

For each character:

- personality id
- rest sample count
- actual rest behavior counts
- actual rest behavior ratios
- average V75 personality rest probabilities
- average V66 final rest probabilities
- latest rest behavior/time
- social gate evaluation count per channel
- average social chance per channel
- latest social chance per channel

## V77 compatibility

`store/characterRuntimeDiagnostics.ts` remains the existing in-memory latest-value observer.

V78 adds persistence calls at:

- final rest observation
- social chance observation

The V77 snapshot update behavior remains intact.

## Protected runtime systems

V78 does not edit:

- Home behavior pipeline
- V61/V63/V64 policies
- V65 cooldown
- V66 anti-repeat
- V75 personality profile
- V76 runtime adapters
- selected-character store
- renderers
- presentation
- calibration
- playback
- facing
- assets
- package files

## Manual verification

1. Open Home with Moru.
2. Allow several natural rest cycles.
3. Open Runtime diagnostics.
4. Open Character cumulative statistics.
5. Confirm Moru rest sample count increased.
6. Confirm look/sit/nap behavior ratios are visible.
7. Repeat with Mongsil.
8. Repeat with Dami.
9. Compare distributions after enough samples.
10. Close and restart the app.
11. Reopen cumulative statistics.
12. Confirm samples remain.
13. Confirm social section says evaluation counts, not actual trigger counts.
14. Select Rooty and verify separate Rooty statistics.

## Interpreting small samples

Do not judge personality balance from only a few samples.

A useful first check is around 20-30 rest decisions per character.

A stronger comparison is closer to the 100-sample cap.

Anti-repeat, mood, energy, condition, and randomness continue to influence actual outcomes, so observed behavior ratios are expected to differ from raw V75 personality probabilities.
