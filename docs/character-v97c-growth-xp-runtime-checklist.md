# Character V97C - Selected-Character Growth XP Runtime

## Goal

Connect real Home interaction to the V97 progression store.

V97C makes acquired characters grow while the user interacts with them.

## XP earning

For the currently selected acquired character:

- short tap: +1 growth XP
- long press: +2 growth XP

V96 relationship progression remains independent:

- short tap: +1 relationship point
- long press: +2 relationship points

So one interaction now advances both:

`relationship + character growth`

without changing ROOT mood/affection behavior.

## Selected-character capture

The selected character id is read at interaction time and passed into the
growth queue.

This matters if a user switches characters while an AsyncStorage write is
still pending.

The XP remains assigned to the character that actually received the
interaction.

## Rapid-tap safety

The existing V97A `addCharacterGrowthXp()` API is asynchronous.

If many taps were started concurrently, several calls could theoretically
observe the same pre-increment XP value.

V97C therefore adds a dedicated serialized interaction queue.

Example:

5 rapid taps from 0 XP

Expected:

- 1
- 2
- 3
- 4
- 5 XP

not multiple writes of `1 XP`.

## Acquisition safety

V97A already refuses growth XP for `acquired = false`.

V97B prevents locked characters from becoming the active Home character.

Both protections remain.

V97C adds no bypass.

## Growth levels

The existing V97A thresholds stay unchanged:

- Lv1: 0 XP
- Lv2: 25 XP
- Lv3: 75 XP
- Lv4: 150 XP
- Lv5: 250 XP

## Milestone rewards

V97C detects level crossings through the existing V97A mutation result, but
does NOT grant ROOT points and does NOT mark rewards claimed.

Example:

24 XP -> short tap -> 25 XP

Result:

- growth level becomes 2
- Lv2 reward becomes unclaimed
- no ROOT point is automatically edited yet

V97D will connect the reward to the authoritative ROOT point mutation path.

## Device test

Open:

`캐릭터 선택 -> 획득·성장 진단`

Record the current acquired character's XP.

### Short tap

1. Home
2. short tap active character exactly 3 times
3. return to `획득·성장 진단`

Expected:

- growth XP +3

### Long press

1. note XP
2. long press exactly 2 times
3. return to diagnostics

Expected from the long-press handler itself:

- growth XP +4

If the platform also emits a short `onPress` after a long press, report the
observed delta rather than manually compensating. V97D should not proceed
until interaction accounting is confirmed on-device.

### Rapid taps

1. note XP
2. tap quickly 5 times
3. wait briefly for persistence
4. reopen/observe diagnostics

Expected:

- XP +5 with no lost update

### Character isolation

If two acquired characters exist:

1. character A: 3 short taps
2. switch to character B
3. character B: 2 short taps
4. inspect diagnostics

Expected:

- A +3
- B +2

No XP leaks across characters.

### Persistence

Restart the app.

Expected:

- XP unchanged from pre-restart value
- level unchanged
- acquired/locked state unchanged
- selected character unchanged

## Safety regression

Confirm:

- relationship points still rise independently
- locked characters still cannot become Home
- Home roaming works
- V61/V63/V64 social behavior works
- V65 spontaneous cooldown works
- V66 anti-repeat works
- no sprite flicker/disappearance
- Tori still has 3 happy frames
- no ROOT points are granted yet

## Report format

```text
V97C

캐릭터:
- 시작 XP:
- 짧게 3회 후:
- 길게 2회 후:
- 빠르게 5회 후:
- 재실행 후:

관계도 증가: 정상 / 문제
XP 독립 저장: 정상 / 문제
빠른 터치 누락: 없음 / 있음
long press 실제 증가량:
이동/애니메이션: 정상 / 문제
```

## Next

If V97C passes:

V97D - growth milestone reward -> authoritative ROOT point grant/claim.

If long press also triggers short press on-device:

insert a narrow press-de-duplication layer before V97D.
