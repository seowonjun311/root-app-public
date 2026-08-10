# Character V75 personality probability policy foundation

## Goal

Define character-specific personality probability modifiers without guessing or patching the Home behavior pipeline.

V75 is intentionally a policy-foundation phase.

It does not yet change runtime Home behavior.

## Personalities

### Rooty - balanced

Rest multipliers:

- lookAround 1.00
- sitRest 1.00
- nap 1.00

Social chance multipliers:

- spontaneousHappy 1.00
- passiveAttention 1.00
- bondedFollowUpTouch 1.00

Rooty is the compatibility baseline.

### Moru - curious-active

Rest multipliers:

- lookAround 1.25
- sitRest 0.95
- nap 0.70

Social:

- spontaneousHappy 1.35
- passiveAttention 0.85
- bondedFollowUpTouch 0.90

Intent:

- look around more
- nap less
- express excitement more often

### Mongsil - cozy-calm

Rest multipliers:

- lookAround 0.75
- sitRest 1.15
- nap 1.45

Social:

- spontaneousHappy 0.75
- passiveAttention 0.90
- bondedFollowUpTouch 1.00

Intent:

- sit and sleep more
- look around less
- calmer spontaneous expression

### Dami - social-warm

Rest multipliers:

- lookAround 1.15
- sitRest 1.20
- nap 0.80

Social:

- spontaneousHappy 1.15
- passiveAttention 1.50
- bondedFollowUpTouch 1.40

Intent:

- stay attentive
- seek social attention more often
- react more warmly to bonded interaction

## Base-rest example

Using the original neutral rest split:

- lookAround 45%
- sitRest 33%
- nap 22%

V75 produces approximately:

### Rooty

- 45.00%
- 33.00%
- 22.00%

### Moru

- 54.61%
- 30.44%
- 14.95%

### Mongsil

- 32.58%
- 36.63%
- 30.79%

### Dami

- 47.50%
- 36.35%
- 16.15%

## Existing social-chance examples

Using current behavior-policy examples:

V61 spontaneous happy base:

22%

V64 passive attention base:

12%

V63 bonded follow-up touch base:

35%

Examples after V75 personality multiplier:

### Moru

- spontaneous happy 29.7%
- passive attention 10.2%
- bonded follow-up touch 31.5%

### Mongsil

- spontaneous happy 16.5%
- passive attention 10.8%
- bonded follow-up touch 35.0%

### Dami

- spontaneous happy 25.3%
- passive attention 18.0%
- bonded follow-up touch 49.0%

All social chances are clamped to 0..1.

## Rooty compatibility guarantee

`applyCharacterPersonalityToRestWeights('rooty', weights)`

returns a copy of the input weights without re-normalizing them.

`applyCharacterPersonalityToSocialChance('rooty', channel, baseChance)`

returns the clamped base chance with multiplier 1.0.

Therefore V75 does not introduce a character-personality drift for Rooty.

## New files

- `constants/characterPersonality.ts`
- `store/characterPersonalityPolicy.ts`
- `docs/character-v75-personality-policy-foundation-checklist.md`

## Protected sources

V75 does not edit:

- Home
- character preview
- selected character persistence
- V68 asset registry
- V71 presentation
- V72 calibration
- V73 playback
- V74 facing
- CharacterSprite
- SelectedCharacterSprite
- Legacy RootySprite
- Behavior V55-V66
- package files

## Why V75 does not patch Home yet

The personality layer belongs after existing state/condition adjustments and before final anti-repeat selection.

The intended future order is:

1. V55 state-based rest probability
2. V60 condition behavior
3. V62 low-mood rest adjustment
4. V75 selected-character personality adjustment
5. V66 rest anti-repeat
6. final picker

Social personality multipliers belong at the existing V61/V63/V64 chance gates.

The installer environment must identify those exact local source anchors before runtime integration.

No Home source is guessed in V75.

## Suggested next phase

Character V76:

- discover exact V55/V60/V62/V66 rest pipeline anchors in local Home source
- discover V61/V63/V64 chance gates
- import selected-character state and V75 policy
- apply personality only at verified anchors
- require exact-count static checks
- preserve Rooty 1.0 compatibility
- run TypeScript and probability checks
- rollback safely on any ambiguous source match
