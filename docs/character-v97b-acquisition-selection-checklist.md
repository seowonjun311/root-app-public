# Character V97B - Acquisition-Aware Selection

## Goal

Make V97A acquisition state authoritative for character selection while
protecting the character an existing user already had active before V97.

## Legacy-safe migration

On the first selected-character load after V97B:

1. read `selected_character_v1`
2. load `character_progression_v1`
3. mark that current selected character acquired using source `legacy`
4. only then mark selected-character state ready

Rooty is already starter-acquired.

This means the active character cannot disappear during the transition to the
new acquisition system.

## Authoritative selection gate

`store/selectedCharacter.ts` now checks progression before saving.

Locked character:

- can be previewed
- cannot be saved as Home character
- does not overwrite `selected_character_v1`

Acquired character:

- can be saved normally
- Home rendering path remains unchanged

The gate lives in the selected-character store, not only in the UI.

## Character Preview

The Preview now shows for the viewed character:

- acquired / locked
- growth level
- growth XP

Button states:

- locked: `잠긴 캐릭터`
- current: `현재 사용 중`
- acquired and not current: `Home에 사용`

Locked characters remain visible so users can see characters they may earn
later.

## Progression diagnostics

New route:

`/character-progression-diagnostics`

Character Preview entry:

`획득·성장 진단`

Visible for all seven characters:

- acquired
- acquisition source
- acquired time
- growth level
- growth XP
- claimed reward levels
- unclaimed growth rewards
- legacySeeded
- current Home character highlight

## Expected first migration

If the user had Tori selected before installing V97B:

- Rooty: acquired / starter
- Tori: acquired / legacy
- other standard characters: locked

If Rooty was selected:

- Rooty: acquired / starter
- all standard characters: locked

## Device verification

1. Open `캐릭터 선택`.
2. Open `획득·성장 진단`.
3. Confirm Rooty is acquired.
4. Confirm the character that was already active before V97B remains acquired.
5. Choose a locked character in Preview.
6. Confirm the character image/actions can still be previewed.
7. Confirm the save button says `잠긴 캐릭터`.
8. Confirm pressing it cannot switch Home.
9. Choose an acquired character.
10. Confirm `Home에 사용` still switches normally.
11. Restart app.
12. Confirm acquired/locked state persists.
13. Confirm current Home character persists.

## Important

V97B does not yet provide a way to earn locked characters.

That comes after the lock/persistence path is proven safe.

V97C will connect real character growth XP earning.

V97D will connect milestone point rewards.

V97E will connect acquisition conditions/rewards.

## Protected systems

V97B does not edit:

- Home
- V96 relationship store/policy/runtime
- V61/V63/V64 social policies
- V65 cooldown
- V66 rest anti-repeat
- V75/V76 personality policy
- V78/V79 statistics/validation
- V85 renderer
- V86 roaming
- character assets
- presentation values
- package files
