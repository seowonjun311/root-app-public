# Character V96B - Relationship Runtime Integration

## Goal

Connect the V96A per-character relationship foundation to the existing Home
runtime without replacing the established V54-V66 safety/state behavior.

V96B makes relationship progression real.

## Runtime bootstrap

When the existing Rooty state is restored:

1. `character_relationship_v1` is loaded
2. Rooty's relationship is seeded once from legacy `rooty_state_v1.affection`
3. only after that does Rooty runtime become ready

This prevents a startup window where every character would temporarily look
distant before relationship storage finishes loading.

## Legacy Rooty migration

Only Rooty receives legacy migration.

If Rooty has no V96 relationship activity yet:

- existing global affection 0..100 becomes Rooty's initial relationship points
- `legacySeeded` becomes true
- migration never overwrites later V96 relationship progress

Moru/Mongsil/Dami/Pio/Nuri/Tori start with their own independent relationship
records.

## Interaction progression

The existing interaction rewards remain unchanged:

### Short tap

Legacy state:

- mood +2
- global affection +1

V96 relationship:

- selected character +1 relationship point
- selected character tapCount +1

### Long press

Legacy state:

- mood +3
- global affection +2

V96 relationship:

- selected character +2 relationship points
- selected character longPressCount +1

No duplicate mood/affection rewards are added.

The V96 relationship write updates the in-memory cache synchronously after
store load, then serializes persistence through the existing write queue.

Therefore crossing a relationship threshold on a tap can affect the same
interaction's later V63 follow-up decision.

## Personality + relationship composition

The order for social probabilities is now:

base V61/V63/V64 chance
→ selected-character personality multiplier
→ selected-character relationship multiplier
→ existing random roll / behavior safety

Personality and relationship remain separate concepts.

Example:

Tori is `gentle-shy`.

Its V95 personality already makes:

- spontaneous happy lower
- passive attention lower
- bonded follow-up touch high

Relationship then scales those personality results:

- distant: reserved
- familiar: slightly warmer
- close: clear social opening
- bonded: full character personality expression

## V61 spontaneous happy

V61 remains base 22%.

Relationship now scales the personality-adjusted chance:

- distant x0.75
- familiar x0.90
- close x1.00
- bonded x1.05

V65 cooldown remains unchanged and still prevents spontaneous social spam.

## V63 follow-up touch

The old global `condition.flags.isBonded` gate is removed from the V63 chance
function.

The selected character's relationship now owns the progression:

- distant x0
- familiar x0
- close x0.35
- bonded x1.00

V63 remains presentation-only:

- no second mood reward
- no second global affection reward
- no second V96 relationship reward
- no energy cost

The existing happy -> optional touch animation chain remains unchanged.

## V64 passive attention

The old global `condition.flags.isBonded` relationship requirement is removed.

The selected character relationship now scales passive attention:

- distant x0
- familiar x0.25
- close x0.60
- bonded x1.00

Existing safety remains:

- tired suppresses passive attention
- low mood suppresses passive attention

V65 cooldown remains authoritative.

## Statistics safety

V95B personality statistics remain intentionally personality-stage.

The V77/V78 observation happens inside
`applySelectedCharacterPersonalityToSocialChance`.

V96 relationship adjustment happens outside that adapter in the V61/V63/V64
policy files.

Therefore V79 continues validating the personality policy only and is not
contaminated by relationship-tier changes.

Relationship-specific statistics/diagnostics can be added separately later.

## Expected first-run behavior

Because legacy default Rooty affection was historically 50, a user with the
default untouched Rooty state will migrate Rooty to `close`.

Other characters start at `distant` unless they already have V96 relationship
data.

This is intentional.

## Device validation

### Persistence

1. Reload the app.
2. Select Moru.
3. Tap Moru several times.
4. Switch to Tori.
5. Tap Tori a different number of times.
6. Restart the app.
7. The relationships must remain independent.

### Distant behavior

A newly independent character at distant should:

- have no V64 passive attention
- have no V63 follow-up touch
- still perform normal rest/walk behavior
- still allow direct user tap/long-press reactions

### Close/bonded behavior

As relationship increases:

- passive attention begins gradually
- close can occasionally produce V63 follow-up touch
- bonded uses the full character personality social profile

### Tori

Tori should be the clearest relationship example:

- early: shy / low unsolicited attention
- close: begins opening up
- bonded: warm follow-up touch becomes much more visible

### Safety regression

Verify:

- V61 happy still respects V65 cooldown
- V64 passive attention still respects tired/low mood
- V66 rest anti-repeat still works
- no frame flicker/disappearance
- roaming remains balanced
- no duplicate state rewards
- no duplicate relationship rewards
- no repeated touch chain

## Next: V96C

V96C should add relationship diagnostics / device validation support rather
than changing relationship probabilities immediately.

Useful V96C UI:

- selected character name
- relationship points
- relationship tier
- tap/long-press counts
- last interaction time
- current relationship multipliers

After device validation, only then tune values if a relationship stage feels
too fast or too slow.
