# ROOTY Behavior V64 bonded passive social attention checklist

## Goal

Let a strongly bonded Rooty occasionally acknowledge the user without requiring a tap.

V64 is deliberately subtle and uses only existing idle/directional behavior.

## Eligibility

Passive social attention is possible only when:

- affection condition = `bonded`
- energy is not `tired` or `exhausted`
- mood is not `low`

This preserves:

- V60 fatigue recovery priority
- V62 low-mood calm-rest priority

## Chance

At a normal post-walk rest decision:

`12%`

V61 excited spontaneous happy is checked first.

Therefore the order is:

1. V61 excited expression
2. V64 bonded passive attention
3. V55 numeric rest probabilities
4. V60 energy weighting
5. V62 low-mood weighting
6. final look/sit/nap

## Passive attention action

When V64 triggers:

1. Rooty stays in `idle`
2. Rooty faces toward the screen/user side
   - left-facing history -> `downLeft`
   - right-facing history -> `downRight`
3. Rooty holds the attention pose for 900..1400 ms
4. the normal rest decision resumes

No new sprite asset is required.

## Recursion protection

The resumed rest decision sets a one-shot skip:

`skipBondedPassiveAttentionOnce`

This prevents V64 from immediately triggering itself again after the attention pause.

The skip applies only to V64.

V61 and normal V55/V60/V62 behavior remain available.

## Interaction safety

V64 does not set the reaction lock.

Therefore the user can tap/long-press Rooty during passive attention.

A user interaction increments the normal cycle key; the natural-routine cleanup cancels the pending attention timer.

## State effects

V64 changes no persistent state:

- no mood reward
- no affection reward
- no energy cost
- no energy recovery

It is presentation only.

## Non-bonded behavior

- distant -> unchanged
- familiar -> unchanged
- close -> unchanged
- bonded -> 12% eligible when not tired and not low mood

There is no penalty for lower affection.

## Preserved systems

- V54 state persistence
- V55 numeric rest probability
- V56 energy changes
- V57 active mood drift
- V58 offline mood catch-up
- V59 condition classification
- V60 fatigue behavior control
- V61 excited spontaneous happy
- V62 low-mood calm rest
- V63 bonded tap follow-up
- tap and long-press rewards
- movement/collision timing

## Development traces

Policy:

`[ROOTY V64] passive social policy`

Triggered attention:

`[ROOTY V64] passive social attention start`

## Not included in V64

- new social sprite
- automatic touch animation
- state rewards
- persistent cooldown
- affection decay
- following the user's finger
- screen-coordinate gaze tracking
- native dependency changes

## Suggested next version

V65 can add a lightweight anti-repetition/cooldown layer so spontaneous expressions do not cluster when multiple condition systems are eligible.

## PC verification

- exact V63 baseline
- V64 policy source exists
- chance = 12%
- duration = 900..1400 ms
- non-bonded returns 0%
- tired/exhausted returns 0%
- low mood returns 0%
- V61 remains before V64
- V64 remains before V55/V60/V62 rest fallback
- attention uses only idle + downLeft/downRight
- one-shot recursion skip exists
- V59/V60/V61/V62/V63 policy sources remain untouched
- TypeScript passes
- Git whitespace passes
- only expected V64 files are committed
- local main matches origin/main after push
