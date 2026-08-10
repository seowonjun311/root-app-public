# ROOTY Behavior V62 low-mood calm rest checklist

## Goal

Give `low` mood a subtle, calmer behavior style without introducing a negative animation or weakening V60 recovery priority.

## V62 scope

V62 changes only final rest-choice weighting.

No new action type is added.

## Low-mood eligibility

V62 applies only when:

- mood condition = `low`
- energy condition = `normal` or `energetic`

When energy is:

- `tired`
- `exhausted`

V62 returns the exact V60 probabilities unchanged.

Energy recovery remains higher priority than mood expression.

## Low-mood weights

Input is the V60 energy-conditioned probability set.

V62 applies:

- look-around x0.75
- sit-rest x1.30
- nap x1.00

Then normalizes to a total of 1.

This produces a quieter low-mood style:

- less looking around
- more sitting
- no extra forced sleep

## Example

Using a simple 45/33/22 input:

- look-around: about 34.2%
- sit-rest: about 43.5%
- nap: about 22.3%

The actual runtime input may differ because V55 numeric-state adjustment and V60 energy adjustment happen before V62.

## Full decision order

1. V61 checks spontaneous happy
2. if not triggered, V55 computes numeric-state rest probabilities
3. V60 applies energy-condition weighting
4. V62 applies low-mood weighting only when energy is normal/energetic
5. final look/sit/nap behavior is selected

## Priority rules

### excited

V61 may trigger spontaneous happy when not tired.

### tired / exhausted

V60 remains authoritative.

V62 does not modify V60's rest probabilities.

### low + normal / energetic

V62 calmly shifts probability from look-around toward sit-rest.

## State effects

V62 itself changes no state.

Existing action completion effects still apply:

- walk -> energy -2
- look-around -> energy -1
- sit-rest -> energy +2
- nap -> energy +6

## Preserved systems

- V54 state persistence
- V55 numeric probability policy
- V56 energy changes
- V57 active mood drift
- V58 offline mood catch-up
- V59 condition classification
- V60 energy behavior control
- V61 spontaneous happy expression
- tap/long-press behavior
- movement speed
- collision logic
- sleep/sit durations

## Development trace

`[ROOTY V62] low mood rest policy`

The V60 trace remains and now reports the intermediate V60 energy probability set.

The V55 trace reports the final selected probability set used for behavior selection.

## Not included in V62

- sad/cry animation
- forced sitting
- mood penalties
- affection-based behavior
- low-mood walking speed change
- low-mood energy cost change
- native dependencies

## Suggested next version

V63 can begin affection-based social response, for example:

- bonded -> slightly richer touch reaction
- distant -> no penalty, simply neutral reaction

This should be separate from V62.

## PC verification

- exact V61 baseline
- V62 policy exists
- low-mood weights 0.75 / 1.30 / 1.00
- non-low mood returns input unchanged
- tired/exhausted return V60 input unchanged
- Home order is V61 -> V55 -> V60 -> V62 -> pick
- V59/V60/V61 policy source files remain untouched
- TypeScript passes
- Git whitespace passes
- only expected V62 files are committed
- local main matches origin/main after push
