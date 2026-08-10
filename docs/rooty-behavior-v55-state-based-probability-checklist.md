# ROOTY Behavior V55 state-based probability checklist

## Goal

Use the persistent V54 state values to influence Rooty's natural rest behavior without changing V19 timing, V11 walk synchronization, V17 runtime persistence, or V54 state persistence.

## V55 scope

- Reads `rootyStateRef.current` at each rest decision.
- Keeps the V19 baseline probabilities:
  - look around: 45%
  - sit rest: 33%
  - nap: 22%
- Applies small state-based modifiers:
  - high energy -> more look-around, less nap
  - low energy -> more sit/nap
  - high mood -> more alert behavior, less nap
  - affection -> small personality modifier only
- Uses a 5% minimum probability floor before normalization.
- Does not add state decay or energy consumption.
- Does not change walk duration, movement speed, collision logic, resume timing, or persistence keys.

## Reference probability examples

With V54 default state:

- mood 70
- energy 80
- affection 50

Expected approximate probabilities:

- look around: 53.4%
- sit rest: 31.4%
- nap: 15.2%

With mood/energy/affection all at 0:

- look around: 27%
- sit rest: 37%
- nap: 36%

With mood/energy/affection all at 100:

- look around: 63%
- sit rest: 29%
- nap: 8%

## PC verification

- V55 policy file exists.
- Home contains V55 marker.
- V54 state store remains unchanged.
- V19 behavior constants remain unchanged.
- V17 runtime persistence remains unchanged.
- TypeScript passes.
- Git whitespace check passes.
- Only the expected V55 files are committed.

## Phone verification later

1. Relaunch the app and confirm Rooty resumes normally.
2. Observe `[ROOTY V55] rest choice` logs in development.
3. Tap/long-press Rooty and confirm mood/affection still update.
4. Confirm the next rest-choice log uses the latest state values.
5. Confirm Rooty still walks, looks around, sits, sleeps, and wakes normally.
6. Confirm Home blur/background behavior remains unchanged.

## Not included in V55

- automatic energy drain while walking
- energy recovery while sleeping
- mood decay over time
- affection decay over time
- time-of-day behavior
- weather behavior
- food/item interaction

Those belong in later state-simulation steps.
