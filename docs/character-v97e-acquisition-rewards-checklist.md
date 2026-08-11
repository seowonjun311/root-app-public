# Character V97E - Real Acquisition Rewards

## Goal

Turn V97B locked characters into earnable gameplay rewards.

V97E does not add a second acquisition store.

All unlocks call the existing authoritative V97A:

`acquireCharacter(characterId, source)`

Therefore the existing V97B selection lock automatically opens after a
successful reward.

## Unlock policy

### Moru

Requirement:

`Rooty growth XP >= 25`

Meaning:

Rooty reaches Lv2.

Source:

`growthReward`

Moru is the early "you started growing" character reward.

### Mongsil

Requirement:

`total growth XP across acquired characters >= 75`

Source:

`growthReward`

This rewards continued character interaction rather than one single
character.

### Dami

Requirement:

`highest per-character relationship points >= 75`

This is the V96 bonded threshold.

Source:

`relationshipReward`

Dami is therefore earned through long-term interaction/affection.

### Pio

Requirement:

`exploration visited places >= 5`

Source:

`explorationReward`

This uses ROOT's existing local exploration data and `visitedPlaceIds`.

### Nuri

Requirement:

`exploration visited places >= 15`

Source:

`explorationReward`

Nuri is a later active-exploration reward than Pio.

### Tori

Requirement:

- acquired character count >= 6
- highest relationship points >= 75
- total growth XP >= 250

Source:

`relationshipReward`

Tori is intentionally the rare long-term reward.

The acquired-count check means all six other characters must already be
available unless Tori was preserved as a legacy-acquired character.

## Existing-user safety

V97B legacy-acquired characters stay acquired.

V97E never removes acquisition.

If a character is already acquired, its reward rule is skipped.

## Evaluation timing

V97E evaluates rewards:

1. when Home is entered
2. after a short-tap growth mutation completes
3. after a long-press growth mutation completes
4. when Character Preview opens

This means exploration rewards are normally recognized as soon as the user
returns Home or opens Character Preview.

## Character Preview

Locked character text now shows the real acquisition condition instead of the
generic:

`획득 조건이 필요합니다`

Examples:

- Moru: `루티 성장 Lv.2 달성 (25 XP)`
- Pio: `탐험 장소 5곳 방문`
- Tori: `다른 6캐릭터 획득 + 친밀도 75 + 성장 XP 합계 250`

The existing locked save button remains authoritative.

## Device test

### Moru

1. confirm Moru is locked
2. grow Rooty to 25 XP
3. return to Character Preview

Expected:

- Moru: 획득됨
- acquisitionSource: growthReward
- `Home에 사용` enabled

### Mongsil

Build acquired-character total growth XP to 75.

Expected:

- Mongsil unlocks once
- restart keeps it acquired

### Dami

Raise any character relationship to 75.

Expected:

- Dami unlocks
- source relationshipReward

### Pio / Nuri

After exploration records exist:

- 5 visited places -> Pio
- 15 visited places -> Nuri

Return Home or open Character Preview.

Expected:

- acquisition persists
- selection gate immediately permits acquired character

### Tori

Expected only when all are true:

- 6 characters already acquired
- relationship 75+
- total acquired-character growth XP 250+

## Regression checks

Confirm:

- Rooty remains starter acquired
- legacy-selected character remains acquired
- locked selection cannot bypass V97B
- short tap growth +1 XP still works
- long press growth +2 XP still works
- V97D milestone ROOT point payout still works
- V97D duplicate reward protection still works
- V96 relationship points still work
- V61/V63/V64 behavior remains unchanged
- V65 cooldown remains unchanged
- V66 anti-repeat remains unchanged
- sprite presentation remains unchanged
- Tori still uses 3 happy frames

## Next

After V97E passes on-device:

V97F should harden progression/account ownership and add explicit acquisition
celebration UX.

Recommended V97F scope:

- "새 캐릭터 획득!" one-time modal
- acquired-character source history/diagnostics
- account-switch isolation check
- Firestore/cloud progression strategy review
- final V97 end-to-end device checklist
