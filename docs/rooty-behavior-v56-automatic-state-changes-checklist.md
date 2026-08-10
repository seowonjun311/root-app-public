# ROOTY Behavior V56 automatic state changes checklist

## Goal

Close the first Rooty state/behavior loop:

state -> V55 behavior probability -> behavior -> V56 state change -> next V55 probability

## V56 automatic energy changes

- completed walk session with at least one successful movement: energy -2
- completed look-around sequence: energy -1
- completed sit rest: energy +2
- completed nap sleep duration: energy +6

All values still pass through the existing V54 clamp and serialized state save path.

## Interruption safety

V56 applies rest recovery only when the scheduled behavior reaches its completion callback.

Examples:

- tap/long-press during sit rest -> no +2 sit recovery
- tap/long-press during nap -> no +6 nap recovery
- cancelled Home routine -> no delayed recovery
- walk session blocked before any successful movement -> no -2 walk cost

## Preserved behavior

- V55 rest probability policy is unchanged.
- V19 natural timing is unchanged.
- V11 movement timing is unchanged.
- V17 runtime position/action persistence is unchanged.
- V54 rooty_state_v1 storage key and serialized save queue are unchanged.
- V54 tap/long-press mood and affection changes are unchanged.
- mood and affection do not decay automatically in V56.

## Expected state loop

Example from energy 80:

1. walk completion -> 78
2. look-around completion -> 77
3. walk completion -> 75
4. sit-rest completion -> 77
5. later nap completion -> +6, clamped to 0..100

As energy drops, V55 progressively increases sit/nap probability.
Rest then restores energy and naturally shifts later choices back toward active behavior.

## PC verification

- V56 config file exists.
- V56 Home marker exists.
- state-change reason union includes four automatic reasons.
- completed walk, look-around, sit-rest, and nap each use the shared V54 state helper.
- TypeScript passes.
- Git whitespace check passes.
- only the expected V56 files are staged and committed.
- local main and origin/main match after push.

## Phone verification later

Development logs should show entries like:

- `[ROOTY STATE] updated` reason `walk-session`
- `[ROOTY STATE] updated` reason `look-around`
- `[ROOTY STATE] updated` reason `sit-rest`
- `[ROOTY STATE] updated` reason `nap`

Then the next `[ROOTY V55] rest choice` log should show the updated energy value and recalculated probabilities.

## Not included in V56

- real-time energy drain per second
- offline elapsed-time simulation
- mood decay toward a baseline
- affection decay
- time-of-day modifiers
- food/item energy recovery
- explicit tired/hungry states

Those should be added only after this first behavior/state feedback loop is verified.
