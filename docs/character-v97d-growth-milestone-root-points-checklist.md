# Character V97D - Growth Milestone ROOT Point Rewards

## Goal

Connect V97 character growth milestones to the existing spendable ROOT point
balance without allowing duplicate milestone payouts.

## Existing ROOT point path

Home calculates spendable points from:

- action-goal earned points
- exploration points
- `rootData.testPoints` adjustment

Existing shop purchase/refund already changes `testPoints`.

V97D therefore grants character milestone points through the same adjustment
field rather than creating a second incompatible currency.

## Milestone rewards

Existing V97A policy stays unchanged:

- Lv2 / 25 XP -> +5P
- Lv3 / 75 XP -> +10P
- Lv4 / 150 XP -> +15P
- Lv5 / 250 XP -> +25P

Total per fully grown character:

55P.

## Idempotency ledger

Every reward gets a stable id:

`character-growth:<characterId>:lv<level>`

ROOT rootData stores granted ids in:

`characterGrowthRewardGrantIds`

A reward whose id already exists does not add points again.

This protects against:

- app crash after points were granted but before progression claim completed
- repeated settlement attempts
- rapid interactions
- logged-in multi-device retry

## Logged-in users

For Firebase-authenticated users:

1. Firestore transaction reads server rootData
2. transaction checks reward ledger
3. if missing, transaction adds `pointReward` to `rootData.testPoints`
4. transaction writes the reward id into the ledger
5. only after transaction success is local rootData synchronized
6. progression reward is then marked claimed

If local claim fails after server point success, the next retry sees the
server ledger and does not add points again.

## Guest users

Guests use the same `rootData.testPoints` field and persistent local ledger.

## Retry behavior

V97D settles ALL currently unclaimed growth rewards after every successful
character interaction.

Therefore a reward that failed because of network/root-data readiness remains
unclaimed and is retried on a later interaction.

## Home refresh

A point-reward bridge listener updates Home onboarding state after the local
ROOT data is synchronized, so `totalPoints` can refresh without restarting the
app.

## Device test

### Normal milestone

Use an acquired character near 25 XP.

Example:

- before: 24 XP / 100P
- short tap once

Expected:

- XP: 25
- level: Lv2
- ROOT points: 105P
- progression diagnostics: Lv2 reward claimed
- unclaimed Lv2 reward disappears

### Duplicate protection

After Lv2 reward was paid:

1. tap again several times
2. restart app
3. tap again

Expected:

- Lv2 +5P is not paid again
- `claimedRewardLevels` still includes level 2

### Existing unclaimed reward from V97C

If a character already reached a milestone before V97D:

- perform one valid interaction

Expected:

- existing unclaimed milestone is settled
- point reward is granted once
- claim becomes recorded

### Logged-in persistence

When logged in:

1. receive a milestone reward
2. restart app
3. confirm ROOT points remain
4. confirm reward remains claimed

### Guest persistence

For guest:

1. receive reward
2. restart app
3. confirm ROOT points and claim remain

## Important regression

Confirm:

- short tap still +1 growth XP
- long press still +2 growth XP
- V96 relationship +1/+2 still works
- locked characters still cannot become Home
- Home roaming/animations unchanged
- V61/V63/V64 social behavior unchanged
- V65 cooldown unchanged
- V66 anti-repeat unchanged
- no sprite flicker
- Tori remains 3 happy frames

## Recommended report

```text
V97D

캐릭터:
- milestone 전 XP:
- milestone 후 XP:
- milestone 전 ROOT P:
- milestone 후 ROOT P:
- claimedRewardLevels:
- unclaimedRewards:

재실행 후 ROOT P:
중복 지급: 없음 / 있음
관계도: 정상 / 문제
성장 XP: 정상 / 문제
Home 표시 즉시 갱신: 정상 / 문제
```

## Next

If V97D passes:

V97E - real acquisition conditions and rewards.

Recommended first acquisition design:

- Moru: early growth reward
- Mongsil: consistency/growth reward
- Dami: relationship/social reward
- Pio: exploration reward
- Nuri: active exploration/growth reward
- Tori: rare long-term relationship/growth reward

Do not activate acquisition requirements until V97D point payout is proven
idempotent on-device.
