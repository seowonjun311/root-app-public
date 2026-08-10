# ROOTY Behavior V65 spontaneous anti-repetition cooldown checklist

## Goal

Prevent spontaneous condition-based expressions from clustering across consecutive natural behavior cycles.

V65 affects only:

- V61 spontaneous happy
- V64 bonded passive social attention

It does not suppress normal rest behavior or user-triggered interactions.

## Cooldown rule

After either spontaneous action triggers:

`cooldown = 2`

The next two normal post-walk rest decisions suppress both V61 and V64.

Example:

spontaneous happy
-> cooldown 2

next natural rest decision
-> spontaneous suppressed
-> cooldown 1
-> normal V55/V60/V62 rest behavior

next natural rest decision
-> spontaneous suppressed
-> cooldown 0
-> normal V55/V60/V62 rest behavior

following natural rest decision
-> V61/V64 eligible again

## Shared cooldown

V61 and V64 use one shared runtime cooldown.

This prevents patterns such as:

- happy -> passive attention immediately next cycle
- passive attention -> happy immediately next cycle
- passive attention -> passive attention cluster

## V64 same-cycle resume

V64 passive attention pauses in idle for 900..1400 ms and then calls `startRootyRest()` again.

That internal resume is still the same natural rest cycle.

V65 uses:

`skipSpontaneousCooldownConsumeOnce`

so the internal V64 resume:

- remains spontaneous-suppressed
- does not consume one of the two future cooldown cycles
- proceeds directly to ordinary rest behavior

## Runtime-only state

Cooldown uses:

`rootySpontaneousCooldownRef`

It is not persisted.

Closing/restarting the app resets the cooldown to 0.

This is intentional for V65 because the cooldown is presentation spacing, not long-term Rooty state.

## Priority order

At a normal rest decision:

1. V65 resolves shared spontaneous cooldown
2. if not suppressed, V61 may run
3. if not suppressed and V61 did not run, V64 may run
4. V55 numeric rest probabilities
5. V60 energy weighting
6. V62 low-mood weighting
7. look / sit / nap

## User interactions

V65 does not block:

- short tap happy reaction
- V63 bonded tap follow-up touch
- long-press touch reaction

User-driven interaction remains immediate.

User-triggered happy/touch does not arm the spontaneous cooldown.

## State effects

V65 changes no Rooty state:

- no mood change
- no affection change
- no energy change

## Preserved systems

- V54 persistent state
- V55 numeric rest probability
- V56 automatic energy changes
- V57 active mood drift
- V58 offline mood catch-up
- V59 condition classification
- V60 energy behavior control
- V61 spontaneous happy conditions/chance
- V62 low-mood calm rest
- V63 bonded tap follow-up
- V64 passive attention conditions/chance/duration
- movement and collision timing

## Development traces

Cooldown arming:

`[ROOTY V65] cooldown armed`

Cooldown resolution:

`[ROOTY V65] spontaneous cooldown`

Existing V61/V64 traces remain.

## Not included in V65

- wall-clock cooldown
- persisted cooldown
- random 2..3 cycle duration
- user interaction cooldown
- normal rest anti-repetition
- animation asset changes
- native dependency changes

## Suggested next version

V66 can add normal rest anti-repetition so the same look/sit/nap result is less likely to repeat too many times in a row, while preserving V60/V62 probability intent.

## PC verification

- exact V64 baseline
- cooldown policy exists
- trigger cooldown = 2 cycles
- 2 -> 1 suppressed
- 1 -> 0 suppressed
- 0 -> 0 not suppressed
- skip-consume keeps 2 -> 2 suppressed
- V61 arms cooldown
- V64 arms cooldown
- common gate is before V61
- V64 checks common suppression
- V64 same-cycle resume skips consumption
- V55/V60/V62 remain fallback
- V61/V64/V60/V62/V63 policy source files remain untouched
- TypeScript passes
- Git whitespace passes
- only expected V65 files are committed
- local main matches origin/main after push
