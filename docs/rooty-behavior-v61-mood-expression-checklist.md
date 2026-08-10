# ROOTY Behavior V61 mood-based expression behavior checklist

## Goal

Connect V59 mood condition to an actual expressive action while preserving V60 energy priority.

V61 intentionally adds only one spontaneous expression:

`excited -> occasional happy animation`

## Eligibility

Spontaneous happy is possible only when:

- mood condition = `excited`
- energy condition is NOT `tired`
- energy condition is NOT `exhausted`
- Rooty is not already reacting

Therefore:

- excited + energetic -> eligible
- excited + normal -> eligible
- excited + tired -> blocked
- excited + exhausted -> blocked
- happy -> blocked
- calm -> blocked
- low -> blocked

## Chance

At each normal rest-decision point:

`22%`

This is not a timer.

A decision happens only after the existing natural routine reaches the post-walk rest-selection stage.

## Behavior flow

Normal eligible cycle:

walk
-> post-walk delay
-> V61 expression decision
-> if roll succeeds: spontaneous happy
-> existing happy animation completion
-> new natural cycle

If the V61 roll does not succeed:

V55 numeric state probability
-> V60 energy-condition rest weighting
-> look / sit / nap

## Energy priority

V60 remains authoritative when Rooty is tired.

V61 does not replace a tired/exhausted rest opportunity with celebration.

This helps preserve the existing V56 recovery loop:

- sit -> energy +2
- nap -> energy +6

## State changes

Spontaneous V61 happy:

- does NOT add mood
- does NOT add affection
- does NOT subtract energy

It is an expression of current state, not a reward source.

User tap/long-press behavior remains separate and unchanged.

## Animation safety

V61 reuses:

- `rootyReactingRef`
- `faceRootyForAction('happy')`
- `applyRootyAction('happy')`
- the existing `handleRootyAnimationEnd` happy-completion path
- `rootyCycleKey` restart behavior

This prevents movement timers from competing with the happy animation.

## Development traces

Decision:

`[ROOTY V61] expression policy`

Triggered action:

`[ROOTY V61] spontaneous happy start`

Existing traces remain:

- `[ROOTY V59] condition`
- `[ROOTY V60] walk policy`
- `[ROOTY V60] rest policy`
- `[ROOTY V55] rest choice`

When V61 triggers, the normal V55/V60 rest-choice trace for that decision is intentionally skipped because happy replaces that rest decision.

## Preserved systems

- V54 state persistence
- V55 numeric probability policy
- V56 energy changes
- V57 active mood drift
- V58 offline mood catch-up
- V59 condition classification
- V60 tired/exhausted walk and rest control
- movement speed
- collision logic
- action animation assets
- touch rewards

## Not included in V61

- low-mood forced behavior
- calm-specific animation
- affection-based expression
- spontaneous happy cooldown storage
- extra energy cost for happy
- new animation assets
- native dependency changes

## Suggested next version

V62 can add a low-mood expression carefully, such as a small preference for quiet sit/rest without forcing a negative animation.

That should remain separate from V61.

## PC verification

- exact V60 baseline confirmed
- V61 policy source exists
- excited chance = 22%
- excited normal/energetic can trigger
- excited tired/exhausted cannot trigger
- non-excited moods cannot trigger
- Home decision occurs before V55/V60 rest fallback
- spontaneous happy sets reacting before animation
- spontaneous happy uses directional happy fallback helper
- existing happy animation-end handler remains
- V59/V60/V55 source files remain untouched
- TypeScript passes
- Git whitespace passes
- only expected V61 files are committed
- local main matches origin/main after push
