# Character V96C - Relationship Diagnostics + Device Validation

## Goal

V96C does not tune relationship probabilities.

It adds a read-only diagnostic screen so V96B can be validated on the phone
before relationship pacing is changed.

Route:

`/character-relationship-diagnostics`

Character preview now includes:

`친밀도 진단`

## Visible data

For all seven characters:

- character name / id
- relationship points 0..100
- current tier
- points required for next tier
- short tap count
- long-press count
- legacySeeded
- last interaction time
- current relationship social multipliers

The currently selected Home character is highlighted.

## Relationship tiers

- 0..24 distant
- 25..49 familiar
- 50..74 close
- 75..100 bonded

## Core device test

### 1. Independent records

Start with Moru selected.

On Home:

- short tap Moru 3 times

Expected:

- Moru points +3
- Moru tapCount +3

Switch to Tori.

On Home:

- long press Tori 2 times

Expected:

- Tori points +4
- Tori longPressCount +2
- Moru values do not change

Open `친밀도 진단`.

PASS when Moru and Tori show independent increments.

### 2. Persistence

After confirming values:

1. fully reload/restart the app
2. reopen `친밀도 진단`

PASS when:

- Moru points/counts remain
- Tori points/counts remain
- all other characters remain unchanged

## Rooty legacy migration

Rooty alone may start above zero because V96B seeds Rooty once from existing
legacy `rooty_state_v1.affection`.

Expected:

- Rooty `legacySeeded = YES`
- newly independent standard characters are not automatically seeded from
  Rooty's affection

Do not treat Rooty's migrated starting points as a duplicate V96 interaction.

## Tier boundary tests

Natural progression is intentionally persistent.

If a character reaches:

- 25 -> familiar
- 50 -> close
- 75 -> bonded

the diagnostic tier must update without app restart.

## Social multiplier expectations

### Distant

- happy x0.75
- passive x0.00
- follow-up x0.00

Expected device behavior:

- no V64 passive attention
- no V63 follow-up touch
- direct user tap/long-press still works

### Familiar

- happy x0.90
- passive x0.25
- follow-up x0.00

### Close

- happy x1.00
- passive x0.60
- follow-up x0.35

### Bonded

- happy x1.05
- passive x1.00
- follow-up x1.00

## Tori relationship identity test

Tori is the most important V96 personality/relationship combination.

At distant/familiar:

- unsolicited social attention should stay restrained
- direct touch reaction still works

At close:

- passive social opening becomes possible
- follow-up touch becomes possible but still uncommon

At bonded:

- Tori's V95 `gentle-shy` personality remains
- bonded follow-up touch gets full relationship multiplier
- Tori should feel warmer after bonding, not simply hyperactive

## Dami / Pio / Nuri comparison

Dami:

- should read socially warm when relationship opens

Pio:

- remains relatively independent because personality passive attention is low

Nuri:

- remains playful because spontaneous happy personality is high

Relationship must amplify/restrict the personality rather than erase it.

## Safety regression

Confirm:

- V61 spontaneous happy still obeys V65 cooldown
- V63 follow-up touch gives no second reward
- V64 passive attention gives no reward
- V64 remains suppressed when tired/low mood
- V66 rest anti-repeat remains normal
- V85 no flicker/disappearance
- V86 balanced roaming remains normal
- Tori happy remains exactly 3 frames
- selected character persists after restart

## Recommended report format

Send:

```text
V96C

루티:
- points:
- tier:
- legacySeeded:

모루:
- before:
- tap 3회 after:
- restart after:

토리:
- before:
- long press 2회 after:
- restart after:

독립 저장: 정상/문제
재실행 유지: 정상/문제
distant passive/follow-up: 정상/문제
이동/깜빡임: 정상/문제
```

## Decision after validation

If all tests pass:

- V96 is complete
- move to V97 character acquisition / growth / reward linkage

If only progression speed feels wrong:

- V96D narrow relationship pacing calibration only

Do not modify V85/V86 or healthy personality profiles for relationship pacing.
