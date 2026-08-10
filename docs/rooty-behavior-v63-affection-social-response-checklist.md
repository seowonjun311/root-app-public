# ROOTY Behavior V63 affection-based social response checklist

## Goal

Connect V59 affection condition to a richer user interaction without penalizing low affection and without creating extra state rewards.

## V63 behavior

Short tap always keeps the existing base flow:

1. mood +2
2. affection +1
3. happy animation

After the existing state delta is applied, V63 reads the latest V59 condition.

If the resulting affection condition is:

`bonded`

then the tap has a:

`35%`

chance to queue one additional `touch` animation after the `happy` animation finishes.

## Threshold behavior

V59 bonded threshold is:

`affection >= 75`

Because V63 evaluates after the normal tap reward:

`affection 74`
-> tap reward +1
-> affection 75
-> condition becomes bonded
-> the same tap is eligible for the 35% richer response

## Other affection conditions

- distant -> existing tap behavior only
- familiar -> existing tap behavior only
- close -> existing tap behavior only
- bonded -> existing tap behavior + optional follow-up touch

There is no negative reaction for lower affection.

## Long press

Long press remains unchanged:

- mood +3
- affection +2
- touch animation

V63 does not add another follow-up to long press because long press already uses the touch interaction animation.

## No reward loop

The optional V63 follow-up touch:

- does NOT add mood
- does NOT add affection
- does NOT subtract energy
- does NOT write a second interaction reward

It is presentation only.

## Animation safety

V63 adds:

`rootyBondedTapFollowUpRef`

Flow when queued:

tap
-> reacting lock true
-> happy
-> happy animation end
-> follow-up ref consumed
-> touch
-> touch animation end
-> reacting lock false
-> idle
-> natural cycle resumes

The follow-up ref is cleared when:

- a spontaneous V61 happy begins
- long press begins
- queued follow-up is consumed
- happy/touch reaction fully completes

This prevents a stale bonded tap from affecting a future unrelated happy animation.

## Preserved systems

- V54 state persistence
- V55 numeric rest probabilities
- V56 automatic energy changes
- V57 active mood drift
- V58 offline mood catch-up
- V59 affection thresholds
- V60 energy behavior control
- V61 spontaneous happy
- V62 low-mood calm-rest behavior
- existing tap reward +2 mood / +1 affection
- existing long-press reward +3 mood / +2 affection

## Development traces

Tap policy:

`[ROOTY V63] affection interaction policy`

Follow-up trigger:

`[ROOTY V63] bonded follow-up touch`

## Not included in V63

- affection decay
- extra affection reward for bonded users
- distant negative reactions
- new touch assets
- double follow-up chains
- spontaneous affection actions
- native dependency changes

## Suggested next version

V64 can add a small affection-based passive social behavior, such as bonded Rooty occasionally facing toward the user or doing a friendly idle expression, but only if it can be implemented without adding visual noise.

## PC verification

- exact V62 baseline
- V63 policy source exists
- bonded follow-up chance = 35%
- non-bonded chance = 0%
- tap state update occurs before V63 condition read
- tap reward remains +2 mood / +1 affection
- long-press reward remains +3 mood / +2 affection
- spontaneous happy clears stale follow-up
- long press clears stale follow-up
- happy animation can chain one touch
- touch completion returns to normal cycle
- V59/V60/V61/V62 policy files remain untouched
- TypeScript passes
- Git whitespace passes
- only expected V63 files are committed
- local main matches origin/main after push
