# Character V97F - Acquisition Celebration + V97 Hardening

## Goal

Finish the user-facing V97 acquisition loop without changing the proven
acquisition, growth, relationship, or ROOT point accounting stores.

V97F adds a durable one-time:

`새 캐릭터 획득!`

celebration.

## Celebration persistence

Storage key:

`character_acquisition_celebration_v1`

The store remembers which acquired characters already had their celebration.

If the app closes after acquisition but before the user confirms the alert,
the character remains "unseen" and the celebration is recovered next time.

## False-positive protection

The celebration intentionally excludes:

- Rooty starter ownership
- V97B `legacy` ownership

Existing users therefore do not receive a fake "new character" message for a
character they already had before the V97 acquisition system.

## Multiple simultaneous unlocks

Only one acquisition alert can be active at a time.

After the user confirms one reward:

1. mark that character celebration seen
2. re-check remaining acquired/unseen characters
3. show the next one

## Runtime hosts

The hook runs from:

- Home
- Character Preview

V97E remains responsible for actually unlocking characters.

V97F only observes the authoritative progression result and presents the
celebration.

## V97 complete gameplay loop

The intended V97 loop is now:

1. use/interact/explore in ROOT
2. gain relationship / character growth
3. reach acquisition requirement
4. V97E calls authoritative `acquireCharacter`
5. V97F shows `새 캐릭터 획득!`
6. V97B permits that acquired character to become Home character
7. interaction grows that character
8. Lv2/Lv3/Lv4/Lv5 milestones grant 5/10/15/25 ROOT points through V97D

## Device test

### Normal acquisition

Use a locked character whose requirement is one action away.

Expected:

- condition reached
- character becomes acquired
- exactly one `새 캐릭터 획득!` alert
- alert names the correct character
- after confirm, Character Preview permits Home selection

### Restart recovery

For an unacknowledged acquisition alert:

1. close/restart app before confirming if feasible
2. reopen Home

Expected:

- acquisition itself remains saved
- unseen celebration is shown again

### Duplicate prevention

After confirming a celebration:

1. leave/re-enter Home
2. open Character Preview
3. restart app

Expected:

- the same acquisition alert does not return

### Legacy protection

Existing `legacy` acquired character:

Expected:

- remains acquired
- no "new character" celebration is generated

### Multiple unlocks

If more than one condition is already satisfied when V97E evaluates:

Expected:

- alerts appear one at a time
- each character appears once
- no overlapping duplicate alerts

## Regression checks

Confirm:

- Moru 25 Rooty XP condition remains
- Mongsil total growth 75 remains
- Dami relationship 75 remains
- Pio 5 exploration visits remains
- Nuri 15 exploration visits remains
- Tori long-term condition remains
- short tap still +1 growth XP
- long press still +2 growth XP
- V97D milestone point payouts still work
- V97D duplicate point ledger still works
- V96 relationship +1/+2 remains
- V61/V63/V64 social behavior remains
- V65 cooldown remains
- V66 anti-repeat remains
- character sprites/presentation remain unchanged

## Account/cloud hardening boundary

V97F deliberately does NOT rewrite account ownership or cloud persistence.

Current character progression/relationship/selection data is still primarily
device-local AsyncStorage state.

That means a production-grade account-switch/cloud strategy should be handled
as a separate migration instead of being mixed into the celebration patch.

Recommended next version:

`V98 - character account scope + cloud synchronization hardening`

That version should treat together:

- selected character
- character progression
- relationship
- acquisition celebration seen state

and define an explicit guest -> authenticated-user migration before changing
any storage keys.

This is intentionally not hidden or treated as already solved by V97F.
