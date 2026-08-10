# Character V76 personality runtime integration

## Runtime order

Rest behavior:

1. V55 state-based probability
2. V60 condition adjustment
3. V62 low-mood adjustment
4. V75 selected-character personality adjustment
5. V66 anti-repeat adjustment
6. existing final picker

V76 locates the actual V66 call in local Home source with the TypeScript compiler.

It finds the argument whose type contains:

- lookAround
- sitRest
- nap

Only that exact rest-weight expression is wrapped by the selected-character V75 policy.

## Social chance gates

V76 discovers policy files by their local behavior version marker and verifies the existing base chance.

V61:

- channel: spontaneousHappy
- base: 0.22

V63:

- channel: bondedFollowUpTouch
- base: 0.35

V64:

- channel: passiveAttention
- base: 0.12

The existing runtime chance expression is wrapped, not replaced with a hard-coded final probability.

Therefore mood/condition/cooldown gates remain owned by their existing behavior systems.

## Selected-character snapshot

V76 adds:

`getSelectedCharacterSnapshot()`

to the V70 selected-character store.

The snapshot reads the already loaded in-memory selected character.

It does not read AsyncStorage on every behavior decision.

Before selected-character persistence has loaded, the V70 cache remains Rooty, so startup behavior keeps the compatibility baseline.

## Rooty compatibility

Rooty personality multipliers are all 1.0.

Rest policy:

Rooty returns the incoming rest weights unchanged.

Social policy:

Rooty returns the existing base chance unchanged within the existing 0..1 domain.

Therefore selecting Rooty preserves the pre-V76 behavior probabilities.

## Character effects

Moru:

- more look-around rest
- less nap
- more spontaneous happy
- slightly less passive/bonded social response

Mongsil:

- more sit/nap
- less look-around
- calmer spontaneous happy

Dami:

- more look/sit than nap
- stronger passive attention
- stronger bonded touch response

## Safety

V76 does not alter:

- V66 anti-repeat policy implementation
- V55/V60/V62 decision policy implementations
- V65 cooldown implementation
- character renderers
- V71 presentation
- V72 calibration
- V73 playback
- V74 facing
- character assets
- package files

V61/V63/V64 policy source is changed only at the verified existing chance runtime expression.

Home is changed only at the verified rest-weight input to the V66 anti-repeat call plus one import/marker.

## Verification

The installer requires:

- exact V75 commit baseline
- clean local main
- local main equals origin/main
- exact V66 typed rest-weight anchor
- one V61 marker file with base 0.22
- one V63 marker file with base 0.35
- one V64 marker file with base 0.12
- TypeScript success
- Git whitespace success
- exact changed-file set
- exact staging
- commit/push success
- final clean tree
- final local main equals origin/main

Any ambiguous source structure fails before commit and restores V75.
