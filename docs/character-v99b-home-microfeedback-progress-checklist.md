# Character V99B - Home XP / Relationship Micro-feedback + Progress

## Goal

Make every selected-character interaction visibly meaningful on Home while
leaving V96/V97/V98 authoritative persistence and V99A reward presentation
unchanged.

## Micro-feedback

Short tap:

- V96 relationship mutation runs first.
- V99B compares the synchronous V96B before/after relationship snapshots.
- Actual relationship delta is emitted only when points really increased.
- V97C serialized growth mutation runs.
- V99B emits XP only after `addCharacterGrowthXp()` returns the authoritative
  `beforeXp` / `afterXp`.

Long press follows the same flow with the existing +2 policy.

This means the UI does not blindly claim +1/+2 when a bounded value did not
actually change.

## Rapid interaction batching

The Home feedback layer batches events for the selected character when they
arrive within 450ms.

Example:

`+3 XP   +3 친밀도`

The bubble restarts its animation and disappears after about 900ms.

No feedback events are persisted.

## Growth progress HUD

The Home floating card reacts to:

- selected character
- progression store changes
- relationship store changes

It displays:

- current growth level
- current XP -> next level threshold
- growth progress bar
- current relationship tier
- relationship points -> next tier threshold
- relationship progress bar

Growth thresholds remain:

- Lv1 0 XP
- Lv2 25 XP
- Lv3 75 XP
- Lv4 150 XP
- Lv5 250 XP

Relationship thresholds remain:

- 0 distant
- 25 familiar
- 50 close
- 75 bonded
- 100 max

## React Native width typing

The growth and relationship bars use a typed helper returning
`` `${number}%` `` rather than building an unconstrained `string`.

This keeps React Native `ViewStyle.width` compatible with `DimensionValue`
under the current RN TypeScript definitions.

## Safety

V99B does not change:

- V98 cloud schema
- account scope
- selected-character persistence
- relationship persistence format
- progression persistence format
- acquisition rules
- ROOT point grant authority
- V99A acquisition/LEVEL UP Modal queue
- character renderer/behavior/personality

## Device test later

### Short tap

Expected:

- relationship increases by the real amount
- `+1 친밀도` appears
- serialized growth later confirms `+1 XP`
- HUD updates

### Long press

Expected:

- actual relationship delta appears
- confirmed growth delta appears
- HUD updates
- existing touch/happy behavior remains intact

### Rapid taps

Expected:

- no overlapping bubbles
- values batch
- no lost XP
- no false delta at relationship max

### Level threshold

Expected:

- micro-feedback can appear
- V99A LEVEL UP presentation still appears exactly once
- V97D point reward remains authoritative

### Account switch

Expected:

- selected character/progression/relationship HUD follows account scope
- runtime feedback does not migrate or persist

## Next

Recommended V99C:

`character-specific interaction dialogue + mood-aware micro reactions`

This can reuse the V95 personality profiles and current V55/V60/V62 mood
signals without changing the existing behavior probability engine.
