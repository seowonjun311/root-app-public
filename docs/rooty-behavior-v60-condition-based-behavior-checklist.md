# ROOTY Behavior V60 condition-based behavior control checklist

## Goal

Use the V59 semantic energy condition to change Rooty's actual natural behavior for the first time.

V60 intentionally limits its scope to:

- walk-session length
- rest-choice weighting

Mood and affection do not directly trigger behavior in V60.

## Walk-session policy

### exhausted

Energy condition:

`0..24`

Walk range:

`2..3 steps`

### tired

Energy condition:

`25..49`

Walk range:

`3..5 steps`

### normal

Energy condition:

`50..74`

Walk range:

`4..7 steps`

This is the original V19 range.

### energetic

Energy condition:

`75..100`

Walk range:

`4..7 steps`

This also preserves the original V19 range.

V60 does not make energetic Rooty walk farther yet. The first behavior-control version only reduces activity when tired.

## Rest-choice policy

V55 still produces the base probabilities from numeric mood/energy/affection.

V60 then applies an energy-condition multiplier.

### exhausted multipliers

- look-around x0.55
- sit-rest x0.95
- nap x1.75

### tired multipliers

- look-around x0.80
- sit-rest x1.05
- nap x1.30

### normal multipliers

- all x1.00

### energetic multipliers

- all x1.00

After weighting, probabilities are normalized back to a sum of 1.

## Example using legacy V19 base 45/33/22

### exhausted

approximately:

- look-around 26.2%
- sit-rest 33.1%
- nap 40.7%

### tired

approximately:

- look-around 36.3%
- sit-rest 34.9%
- nap 28.8%

### normal / energetic

unchanged:

- look-around 45%
- sit-rest 33%
- nap 22%

In actual runtime V55 numeric-state adjustments happen first, so exhausted Rooty may have an even stronger sleep preference.

## Important interaction with V56

Walk completion still costs energy -2 per completed walking session.

V60 does not alter V56 state deltas.

Shorter tired/exhausted sessions therefore reduce visual activity duration, while the increased sit/nap preference provides more opportunities for V56 recovery.

## Preserved systems

- V19 movement speed and animation timing
- V19 heading logic and collision retries
- V54 state persistence
- V55 numeric state probability calculation
- V56 energy changes
- V57 active mood drift
- V58 offline mood catch-up
- V59 condition thresholds and snapshot synchronization

## Not changed in V60

- movement speed
- step distance
- collision logic
- sleep duration
- sit duration
- touch behavior
- spontaneous happy behavior
- mood-based direct actions
- affection-based direct actions
- native dependencies

## Development traces

Walk:

`[ROOTY V60] walk policy`

Rest:

`[ROOTY V60] rest policy`

The original:

`[ROOTY V55] rest choice`

trace remains present.

## PC verification

- V60 condition behavior policy exists
- exhausted walk range 2..3
- tired walk range 3..5
- normal/energetic range equals V19 4..7
- rest multipliers normalize correctly
- normal/energetic rest probabilities are unchanged
- V55 probability source file remains untouched
- V59 condition source remains untouched
- TypeScript passes
- Git whitespace check passes
- only expected V60 files are staged
- local main and origin/main match after push

## Phone verification later

When energy crosses:

- 75 -> energetic
- 74 -> normal
- 49 -> tired
- 24 -> exhausted

observe:

`[ROOTY V59] condition`

followed by V60 walk/rest traces.

No new native build is required.

## Suggested V61

After V60 is verified, mood may influence optional expressive behavior:

- excited -> occasional spontaneous happy
- low -> quieter/restful behavior

That should remain separate from V60 energy control.
