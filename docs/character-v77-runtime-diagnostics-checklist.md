# Character V77 runtime diagnostics

## Goal

Observe character-personality runtime behavior without changing behavior decisions.

V77 is read-only instrumentation plus a diagnostics screen.

## Route

`/character-runtime-diagnostics`

The Character preview screen includes a Runtime personality diagnostics entry.

## Observed runtime values

### Selected character

Uses the existing V70/V76 selected-character state.

### Personality

Shows the V75 personality profile id.

### Rooty persistent state

Reads `rooty_state_v1` every 2 seconds:

- mood
- energy
- affection

The diagnostics screen never writes this key.

### Rest probability pipeline

V77 observes two points:

1. V75 selected-character personality output
2. V66 anti-repeat final probabilities

It also records the actual rest behavior chosen by the existing picker.

### Social probability pipeline

V77 observes the final selected-character personality chance returned by the V76 adapters:

- V61 spontaneousHappy
- V63 bondedFollowUpTouch
- V64 passiveAttention

## Diagnostics store

New:

`store/characterRuntimeDiagnostics.ts`

It is memory-only.

It has record functions used by existing runtime evaluation points and a subscription hook used by the screen.

It does not persist diagnostics and does not expose functions that alter:

- mood
- energy
- affection
- selected character
- condition
- behavior cooldown
- behavior history
- Home action

## Runtime instrumentation

`store/characterPersonalityPolicy.ts`

The existing V76 functions keep returning the same values.

V77 only records those already-computed return values.

`app/(tabs)/index.tsx`

After the existing final rest picker chooses a behavior, V77 records:

- V66 final probabilities
- selected rest behavior

The installer finds the existing `pickRootyRestBehavior` call with the TypeScript AST before inserting this observation.

## Rooty compatibility

No probability is changed by V77.

Rooty remains on its V75/V76 1.0 personality compatibility path.

## Files

New:

- `app/character-runtime-diagnostics.tsx`
- `store/characterRuntimeDiagnostics.ts`
- `docs/character-v77-runtime-diagnostics-checklist.md`

Changed:

- `app/(tabs)/index.tsx`
- `app/character-preview.tsx`
- `store/characterPersonalityPolicy.ts`

## Protected systems

V77 does not edit:

- selected-character store
- personality profile constants
- V61 policy
- V63 policy
- V64 policy
- V65 cooldown
- V66 anti-repeat implementation
- V71 presentation
- V72 calibration
- V73 playback
- V74 facing
- character renderers
- asset registry
- package files

## Manual verification

1. Open Character change.
2. Open Runtime personality diagnostics.
3. Confirm current selected character and personality.
4. Return Home.
5. Allow the character to complete natural behavior cycles.
6. Open diagnostics again.
7. Confirm V75 personality rest values are present.
8. Confirm V66 final rest values are present.
9. Confirm selected rest behavior is present.
10. Trigger or wait for social gates.
11. Confirm social chance values appear as those gates are evaluated.
12. Compare Moru, Mongsil, and Dami.
13. Select Rooty and confirm its values follow the existing compatibility baseline.
14. Confirm changing diagnostic screens never changes mood/energy/affection or action.

## Note

The Rooty state card is a persisted-state observation from `rooty_state_v1`.

Runtime probability cards are in-memory observations from the actual current app process.

If the app process restarts, runtime observation cards begin empty until Home evaluates those paths again.
