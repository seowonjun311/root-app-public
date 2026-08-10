# ROOTY Behavior V59 condition classification checklist

## Goal

Translate Rooty's numeric state into stable semantic condition tiers without changing behavior yet.

V59 creates a reusable interpretation layer for V60+ behavior rules.

## Mood tiers

- 0..29: `low`
- 30..59: `calm`
- 60..84: `happy`
- 85..100: `excited`

## Energy tiers

- 0..24: `exhausted`
- 25..49: `tired`
- 50..74: `normal`
- 75..100: `energetic`

## Affection tiers

- 0..24: `distant`
- 25..49: `familiar`
- 50..74: `close`
- 75..100: `bonded`

## Default condition

V54 default state:

- mood 70
- energy 80
- affection 50

V59 default semantic condition:

- mood: `happy`
- energy: `energetic`
- affection: `close`

## Future behavior flags

The snapshot also exposes:

- `isLowMood`
- `isExcited`
- `isTired`
- `isExhausted`
- `isEnergetic`
- `isBonded`

These are intentionally read-only derived values.

They do not create new persisted state.

## Runtime synchronization

`rootyConditionRef.current` is refreshed:

- after persisted Rooty state is loaded
- after every `applyRootyStateDelta`

Therefore V54 tap updates, V56 energy changes, V57 active mood drift, and V58 offline mood catch-up all update the semantic condition automatically.

## Important V59 scope

V59 DOES NOT:

- change walking duration
- change rest probabilities
- force sleep
- trigger happy behavior
- change touch rewards
- create new AsyncStorage state
- modify V55 probability math

Those changes belong in V60+ after the classification layer is verified.

## Development trace

`[ROOTY V59] condition`

Examples:

Default:

- mood: happy
- energy: energetic
- affection: close

After energy reaches 49:

- energy: tired
- `isTired: true`

After energy reaches 24:

- energy: exhausted
- `isTired: true`
- `isExhausted: true`

## PC verification

- V59 classifier file exists
- mood boundary classifications pass
- energy boundary classifications pass
- affection boundary classifications pass
- default 70/80/50 -> happy/energetic/close
- Home keeps a current condition ref
- state restore refreshes the condition ref
- all state updates refresh the condition ref
- V54/V55/V56/V57/V58 files are otherwise preserved
- TypeScript passes
- Git whitespace check passes
- only expected V59 files are staged
- local main and origin/main match after push

## Phone verification later

Observe development logs:

`[ROOTY V59] condition`

The condition should change automatically when numeric values cross a threshold.

No visual or behavioral difference is expected in V59 itself.

## Next candidate: V60

Use semantic conditions to modify behavior carefully.

Examples:

- exhausted -> stronger sleep preference
- tired -> shorter walk sessions
- energetic -> normal/full walk behavior
- excited -> occasional happy spontaneous action

V60 should consume the V59 condition layer rather than re-checking numeric thresholds throughout Home.
