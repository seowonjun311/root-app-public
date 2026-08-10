# Character V79 personality auto-validation

## Goal

Automatically judge whether each character personality is actually operating in the intended runtime direction.

Statuses:

- PASS
- CHECK
- WAIT

## Why V79 does not compare raw behavior directly to the V75 neutral example

Actual runtime behavior is also affected by:

- V55 state
- V60 condition
- V62 low mood
- V66 anti-repeat
- random selection

Therefore a fixed statement such as "Moru must always have 54.6% lookAround" would produce false alarms.

V79 validates separate layers instead.

## Check 1 - personality rest signature

V78 stores the V75 personality-adjusted rest probabilities.

Because the V75 personality multipliers are known, V79 reconstructs the normalized pre-personality distribution:

post_i = pre_i * multiplier_i / total

Therefore:

pre_i proportional to post_i / multiplier_i

V79 normalizes the reconstructed pre values and calculates:

delta = post - reconstructed pre

This directly measures what the personality layer changed at runtime independent of upstream state.

Minimum samples:

5

Expected signatures:

### Rooty

Balanced.

All deltas should remain approximately zero.

### Moru

Curious-active.

Expected:

- lookAround delta positive
- nap delta negative

### Mongsil

Cozy-calm.

Expected:

- lookAround delta negative
- nap delta positive
- combined sit + nap delta positive

### Dami

Social-warm / awake-rest tendency.

Expected:

- nap delta negative
- combined look + sit delta positive

## Check 2 - actual rest selection calibration

Minimum actual rest samples:

20

V79 compares:

- actual selected behavior frequency
- average V66 final probability

for:

- lookAround
- sitRest
- nap

The maximum absolute percentage-point error is compared with a sample-size-aware tolerance:

max(10%, 90% / sqrt(n))

Examples:

- n=20 -> about 20.1pp
- n=50 -> about 12.7pp
- n=81+ -> 10pp floor

This is intentionally tolerant because the samples are random and anti-repeat creates dependency between adjacent selections.

Confidence:

- under 20 rest samples -> warming
- 20-49 -> usable
- 50+ -> strong

## Check 3 - social personality fingerprint

Minimum per channel:

3 gate evaluations

Channels:

- spontaneousHappy
- passiveAttention
- bondedFollowUpTouch

Expected chance is calculated from the V75 profile:

base chance * character multiplier

Base chances:

- spontaneousHappy 0.22
- passiveAttention 0.12
- bondedFollowUpTouch 0.35

Tolerance:

0.005 absolute probability
= 0.5 percentage point

Social WAIT does not block a rest-based overall PASS.

However, if a social channel has enough samples and becomes CHECK, the overall result becomes CHECK.

## Overall result

CHECK has highest priority.

If any evaluable check is CHECK:

overall CHECK

Otherwise, if the two core rest checks are not ready:

overall WAIT

Otherwise:

overall PASS

Social channels can remain WAIT while rare gates gather data.

## Route

`/character-personality-validation`

The V78 cumulative statistics screen includes a Personality auto-validation button.

## Files

New:

- `store/characterPersonalityValidation.ts`
- `app/character-personality-validation.tsx`
- `docs/character-v79-personality-auto-validation-checklist.md`

Changed:

- `app/character-runtime-statistics.tsx`

## Protected systems

V79 does not edit:

- Home behavior pipeline
- V77 diagnostics store
- V78 statistics persistence store
- V75 personality profiles
- V76 runtime adapters
- V61-V66 policies
- selected-character persistence
- renderers
- presentation
- calibration
- playback
- facing
- asset registry
- package files

## Manual verification

1. Open Character cumulative statistics.
2. Tap Personality auto-validation.
3. With little data, confirm WAIT.
4. Accumulate at least 5 rest samples and confirm personality signature begins evaluating.
5. Accumulate at least 20 rest samples and confirm actual-selection calibration evaluates.
6. Compare Moru delta: look positive / nap negative.
7. Compare Mongsil delta: look negative / nap positive.
8. Compare Dami delta: nap negative / look+sit positive.
9. Confirm Rooty delta stays near zero.
10. When social channels reach 3 evaluations, confirm expected chance fingerprint becomes PASS.
11. If a real mismatch exists, confirm CHECK appears instead of silently passing.
12. Continue toward 50+ rest samples for strong confidence.
