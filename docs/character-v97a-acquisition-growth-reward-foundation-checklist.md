# Character V97A - Acquisition + Growth + Reward Foundation

## Goal

V97 starts the progression layer that turns the character system from a
preview/selection system into a long-term reward system.

V97A is intentionally the persistence/policy foundation.

It does NOT lock the existing Character Preview yet and does NOT spend/grant
ROOT's global points yet.

That separation prevents a new acquisition system from unexpectedly hiding a
character that an existing user already had selected.

## Persistent storage

Key:

`character_progression_v1`

Every character owns an independent record:

- acquired
- acquiredAt
- acquisitionSource
- growthXp
- claimedRewardLevels
- updatedAt
- legacySeeded

Characters:

- Rooty
- Moru
- Mongsil
- Dami
- Pio
- Nuri
- Tori

## Acquisition sources

The foundation supports:

- starter
- legacy
- growthReward
- relationshipReward
- explorationReward
- eventReward
- points
- admin

V97B/V97C can connect these to actual ROOT systems without changing the
persistence shape again.

## Starter policy

New-progression default:

- Rooty: acquired
- Moru: locked
- Mongsil: locked
- Dami: locked
- Pio: locked
- Nuri: locked
- Tori: locked

V97A does NOT enforce these locks in the current Preview.

## Existing-user safety

V97A adds:

`seedLegacySelectedCharacterAcquisition(characterId)`

Before V97B enforces lock-aware selection, V97B must:

1. load current selected character
2. seed that selected character as acquired with source `legacy`
3. only then enable acquisition gating

Therefore a currently selected Moru/Tori/etc. cannot disappear simply because
V97 was installed.

Rooty remains starter acquired regardless.

## Character growth

Five levels:

| Level | Cumulative XP | Point reward |
|---|---:|---:|
| 1 | 0 | 0 |
| 2 | 25 | 5 |
| 3 | 75 | 10 |
| 4 | 150 | 15 |
| 5 | 250 | 25 |

Maximum milestone reward per character:

55 ROOT points.

These values are intentionally modest compared with long-term app progression.

## Growth XP API

`addCharacterGrowthXp(characterId, amount)`

Rules:

- only acquired characters gain growth XP
- negative/zero/non-finite values do nothing
- growth XP never removes a level
- the mutation result reports newly reached levels

V97B can connect interaction progression to this API.

A later stage can also award growth XP from:

- daily goals
- exploration
- crew activity
- event rewards

without changing this store.

## Reward safety: two-phase claim

V97A does NOT directly edit the global ROOT point store.

Instead:

1. read `getCharacterUnclaimedGrowthRewards(characterId)`
2. successfully grant points through the authoritative ROOT point path
3. call `markCharacterGrowthRewardClaimed(characterId, level)`

This prevents a reward from being marked claimed before the actual point grant
succeeds.

It also avoids blindly coupling the new character system to an old Home/shop
point implementation.

## Planned V97B

V97B should implement acquisition-aware selection:

- preload character progression
- legacy-seed current selected character
- Character Preview shows acquired / locked
- locked character cannot be saved as active
- current selected acquired character remains valid
- acquisition state persists after restart

V97B should also add a progression diagnostics page before point spending is
introduced.

## Planned V97C

V97C should connect growth to real behavior:

Recommended initial earning:

- selected-character short tap: +1 growth XP
- selected-character long press: +2 growth XP
- relationship tier promotion bonus:
  - familiar +5
  - close +10
  - bonded +20

The exact bonuses should be verified against actual V96 runtime before
installation.

## Planned V97D

V97D should connect milestone point rewards through the authoritative current
ROOT point mutation path.

Only after the authoritative point path is identified should point purchase or
point-based character acquisition be enabled.

## Protected systems

V97A does not edit:

- Home
- Character Preview
- selected-character store
- V96 relationship runtime
- V61/V63/V64 social policies
- V65 cooldown
- V66 anti-repeat
- V76 personality runtime
- V78/V79 statistics/validation
- V85 renderer
- V86 roaming
- presentation
- assets
- package files

No visible behavior change is expected from V97A alone.

## Next

Run V97A.

If all preflights pass, continue to:

V97B - acquisition-aware Character Preview + legacy-safe selection gating.
