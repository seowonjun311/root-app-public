# ROOTY Behavior V66 normal rest anti-repetition checklist

## Goal

Reduce visually repetitive normal rest behavior while preserving the probability intent established by V55, V60, and V62.

V66 applies only to:

- `lookAround`
- `sitRest`
- `nap`

## Runtime history

V66 keeps:

`{ behavior, streak }`

in a runtime-only React ref.

Examples:

first sit
-> `{ sitRest, 1 }`

second sit
-> `{ sitRest, 2 }`

different look
-> `{ lookAround, 1 }`

The history is not persisted across app restarts.

## Activation threshold

Anti-repeat adjustment begins when the same normal rest behavior has already been selected:

`2 consecutive times`

Therefore the third same choice and later same choices use adjusted probabilities.

## Repeated behavior multiplier

The repeated behavior receives:

`x0.55`

The other two weights remain unchanged.

The full set is then normalized back to 1.

V66 never sets a probability to zero and never hard-blocks an action.

## 45 / 33 / 22 examples

After two consecutive `lookAround`:

- lookAround: about 31.0%
- sitRest: about 41.4%
- nap: about 27.6%

After two consecutive `sitRest`:

- lookAround: about 52.8%
- sitRest: about 21.3%
- nap: about 25.8%

After two consecutive `nap`:

- lookAround: about 49.9%
- sitRest: about 36.6%
- nap: about 13.4%

These are examples only.

Real runtime input is the final V62 probability set.

## Decision order

1. V65 spontaneous cooldown resolution
2. V61 spontaneous happy if eligible
3. V64 passive attention if eligible
4. V55 state probability
5. V60 energy-condition weighting
6. V62 low-mood weighting
7. V66 normal-rest anti-repeat weighting
8. V55 picker selects look / sit / nap
9. V66 updates normal-rest history

## What does not count as normal rest history

V66 does not record:

- V61 spontaneous happy
- V64 passive attention
- V63 tap follow-up touch
- short tap happy
- long-press touch
- walking

Only the final normal rest selection changes V66 history.

## Recovery safety

V66 is a soft probability multiplier, not a ban.

If V60 strongly favors nap because Rooty is tired, nap can still be selected even after two naps.

Two consecutive naps also already provide V56 energy recovery before a possible third selection.

## State effects

V66 itself changes no persistent Rooty state:

- no mood changes
- no affection changes
- no energy changes

Existing selected-action completion effects remain unchanged.

## Preserved systems

- V54 state persistence
- V55 state probability and picker
- V56 energy changes
- V57 active mood drift
- V58 offline mood catch-up
- V59 condition classification
- V60 energy behavior control
- V61 spontaneous happy
- V62 low-mood calm rest
- V63 bonded tap follow-up
- V64 passive social attention
- V65 spontaneous cooldown

## Development trace

`[ROOTY V66] rest anti-repeat`

Trace fields include:

- previous behavior
- previous streak
- probabilities before V66
- probabilities after V66
- selected behavior
- resulting streak

## Not included in V66

- hard prohibition of three repeats
- persistent rest history
- wall-clock history
- spontaneous-expression history
- walking-direction repetition control
- action-duration changes
- native dependency changes

## Suggested next version

V67 can add a lightweight natural behavior telemetry/debug summary so V55-V66 behavior frequencies can be reviewed on a real device without changing behavior logic.

## PC verification

- exact V65 baseline
- V66 policy exists
- threshold = 2
- repeated weight = 0.55
- below threshold preserves normalized input
- repeated look/sit/nap examples pass
- different behavior resets streak to 1
- same behavior increments streak
- Home applies V66 after V62
- picker receives V66 probabilities
- history updates after picker
- spontaneous/user actions do not update history
- V55/V60/V61/V62/V63/V64/V65 policy source files remain untouched
- TypeScript passes
- Git whitespace passes
- only expected V66 files are committed
- local main matches origin/main after push
