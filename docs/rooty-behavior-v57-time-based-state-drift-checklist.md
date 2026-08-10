# ROOTY Behavior V57 time-based state drift checklist

## Goal

Add the first time-based Rooty state change without disturbing the proven V56 behavior/state feedback loop.

## V57 behavior

While the app is active:

- every uninterrupted 10 minutes, mood moves by 1 toward the baseline value 70
- mood above 70 moves down by 1
- mood below 70 moves up by 1
- mood exactly 70 does not change

Examples:

- mood 74 -> 73 after 10 active minutes
- mood 71 -> 70 after 10 active minutes
- mood 69 -> 70 after 10 active minutes
- mood 42 -> 43 after 10 active minutes
- mood 70 -> 70

## Lifecycle behavior

- app active -> mood timer may run
- app background/inactive -> timer is cleared
- app returns active -> a fresh 10-minute interval begins
- app closed time is NOT simulated in V57
- Home-tab focus is not required; active time elsewhere in the app still counts while this Home component remains mounted

V57 intentionally avoids offline elapsed-time simulation. That should be a separate later version after active-time drift is verified.

## Preserved systems

- V54 `rooty_state_v1` serialized persistence remains unchanged
- V55 state-based rest probabilities remain unchanged
- V56 automatic energy changes remain unchanged:
  - walk -2
  - look-around -1
  - sit-rest +2
  - nap +6
- affection does not decay
- energy does not gain any additional clock-based drain
- tap and long-press mood/affection changes remain unchanged

## Why mood returns toward 70

The baseline is neutral/comfortable rather than zero.

User interaction can temporarily raise mood, but the character gradually returns toward a normal state instead of remaining permanently at an extreme value.

Low mood also naturally recovers toward baseline instead of continuing downward without an explicit negative-state system.

## PC verification

- V57 Home marker exists
- V57 config marker exists
- baseline = 70
- interval = 10 minutes
- step = 1
- `time-mood` uses the existing V54 state helper
- timer is gated by `rootyAppActive`
- timer cleanup uses `clearInterval`
- V54/V55/V56 markers remain
- TypeScript passes
- Git whitespace check passes
- only expected V57 files are staged and committed
- local main and origin/main match after push

## Phone verification later

For ordinary use, wait for a natural 10-minute tick and check:

`[ROOTY STATE] updated`

with:

`reason: time-mood`

For faster development-only testing later, temporarily changing the interval constant can be done in a dedicated test step rather than weakening the production value in V57.

## Not included in V57

- offline/background elapsed-time catch-up
- affection decay
- clock-based energy drain
- time-of-day mood rules
- weather state rules
- hunger
- negative mood events

Those belong in later versions.
