# Character V98B - Account-Scoped Runtime Storage

## Goal

Activate the account-scoped local storage foundation created in V98A.

After V98B, the four live character state domains use an account-specific
AsyncStorage namespace:

- selected character
- progression/acquisition/growth
- relationship
- acquisition celebration seen state

## Scope identity

Authenticated:

`uid_<Firebase uid>`

Guest:

`guest_<rootData.guestId>`

Scoped key example:

`character_account_scope_v1:uid_ABC:character_progression_v1`

## One-owner legacy migration

The old V97 keys remain on disk.

The first active account scope that enters V98B may copy the legacy four-key
bundle into its scoped namespace.

A global migration marker records:

`character_account_scope_v1:legacy_claim_owner`

After that, another account cannot copy the same old V97 data.

This prevents:

Account A V97 state -> Account B accidental inheritance.

The old keys are not deleted, so rollback remains possible.

## Live stores switched

### selectedCharacter

Reads/writes:

`selected_character_v1`

through the current scoped key.

V97B locked-character selection gate remains authoritative.

### characterProgression

Reads/writes:

`character_progression_v1`

through the current scoped key.

V97A-E acquisition, XP, rewards and V97D milestone claims remain unchanged.

### characterRelationship

Reads/writes:

`character_relationship_v1`

through the current scoped key.

V96 tap/long-press relationship accounting remains unchanged.

### characterAcquisitionCelebration

Reads/writes:

`character_acquisition_celebration_v1`

through the current scoped key.

One account acknowledging an unlock celebration no longer hides the same
celebration state for another account.

## In-memory cache reset

The account-scope module observes Firebase auth changes.

When the active scope changes:

- selected-character cache resets
- progression cache resets
- relationship cache resets
- the new scope reloads from its own scoped storage
- celebration active/check state resets

Guest-id changes are also detected lazily whenever a scoped store loads or
writes.

## Async queue account affinity

A delayed write must never move from account A to account B.

V98B therefore captures or validates the account scope around:

- progression serialized writes
- rapid interaction growth queue
- relationship serialized writes
- selected-character saves
- celebration acknowledgement

If the account changes while an operation is waiting, the old operation is
aborted or writes only to its original scoped key.

## Device test

### Test A - existing account migration

Before switching accounts, note:

- current selected character
- growth XP
- acquired characters
- relationship points
- celebration state

Launch V98B build.

Expected:

- current data is preserved
- selected character remains the same
- no character is unexpectedly re-locked
- no XP/relationship reset

### Test B - Google account A -> account B

1. Sign in as account A.
2. Record A character state.
3. Switch to account B.
4. Open Home and Character Preview.

Expected for B:

- B does not inherit A's selected character/progression/relationship
- B has its own Rooty/default character state unless B already had scoped data

### Test C - B -> A

Switch back to A.

Expected:

- A's selected character returns
- A's XP/acquisition returns
- A's relationship points return
- B's changes are absent

### Test D - guest isolation

Use a guest with a persistent guestId.

Expected:

- guest state stays attached to that guest scope
- authenticated account state does not overwrite guest state

### Test E - interaction after account switch

Immediately after switching accounts:

- short tap once
- long press once

Expected:

- only the currently active account's progression/relationship changes

## Regression checks

Confirm:

- V97F new-character celebration still works once per scoped account
- V97E unlock rules remain
- V97D milestone ROOT point payout remains
- V97D duplicate payout protection remains
- V97C tap +1 XP / long +2 XP remains
- V97B locked selection remains
- V96 relationship +1/+2 remains
- V61/V63/V64 social behavior remains
- V65 cooldown remains
- V66 anti-repeat remains
- sprites/roaming remain unchanged

## Cloud status after V98B

Cloud helper code exists from V98A, but V98B still does not automatically
upload or download the character bundle.

This is intentional.

Local account isolation must pass first.

## Next - V98C

After V98B device isolation passes:

- authenticated cloud bootstrap
- server vs local conflict policy
- serialized upload after mutations
- offline retry
- app restart recovery
- multi-device sync
- explicit guest -> authenticated migration
