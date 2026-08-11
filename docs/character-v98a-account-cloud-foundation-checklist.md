# Character V98A - Account Scope + Cloud Sync Foundation

## Goal

Prepare the V97 character system for account isolation and cloud persistence
without moving or deleting any existing user data yet.

V98A is deliberately a foundation stage.

It does not change the active storage keys used by V97 runtime.

## Why this is separated

The current V97 character state is primarily device-local and uses four
unscoped AsyncStorage keys:

- `selected_character_v1`
- `character_progression_v1`
- `character_relationship_v1`
- `character_acquisition_celebration_v1`

Changing all four live stores and enabling cloud synchronization in one patch
would make rollback/data-loss analysis unnecessarily difficult.

## Account scope identity

Authenticated user:

`uid_<firebase uid>`

Guest:

`guest_<rootData.guestId>`

Legacy guest fallback:

`guest_legacy_guest`

The existing ROOT guest flow already keeps a persistent `guestId`, so V98 can
use that identity instead of treating every signed-out session as the same
person.

## Scoped storage shape

Future V98B keys use:

`character_account_scope_v1:<scopeId>:<legacyKey>`

Example:

`character_account_scope_v1:uid_ABC123:character_progression_v1`

This allows account A and account B to coexist on one device without reading
each other's character progression.

## Non-destructive legacy migration

V98A adds a helper that:

1. reads the current four legacy V97 keys
2. checks whether the current account-scoped bundle is empty
3. if empty, copies the legacy values into the scoped keys
4. never deletes the old keys

V98A does not call this helper automatically.

V98B will activate the migration only after the four live stores have been
converted to use account-scoped keys.

## Cloud schema

Authenticated users use the existing Firestore user document:

`users/{uid}`

New field:

`characterSystemV98`

Envelope:

- version
- ownerUid
- scopeId
- updatedAt
- selectedCharacter raw state
- progression raw state
- relationship raw state
- acquisition celebration seen state

Guest users never write this authenticated cloud field.

## Cloud helpers

V98A provides explicit helpers for:

- load cloud envelope
- save cloud envelope
- upload current scoped local bundle
- download cloud bundle into scoped local storage

They are NOT automatically called in V98A.

This is important because conflict/merge policy must be installed at the same
time the runtime switches to scoped storage.

## Protected systems

V98A must not modify:

- Home
- Character Preview
- selected-character runtime
- progression runtime
- relationship runtime
- acquisition rules
- acquisition celebration runtime
- V97D ROOT point ledger
- V55-V66 behavior
- V75-V79 personality/statistics
- V85/V86 renderer/roaming
- rootMemory
- package files

## Planned V98B

V98B should switch all four live stores to account-scoped keys with this order:

1. resolve account scope
2. copy legacy bundle into scoped storage only when the scoped bundle is empty
3. load selected/progression/relationship/celebration from scoped keys
4. keep legacy keys untouched as rollback fallback
5. on account identity change, clear in-memory caches and reload the new scope

This is the stage that actually prevents account A / account B local leakage.

## Planned V98C

After V98B device isolation passes:

- authenticated cloud bootstrap
- server/local conflict policy
- serialized upload after local character mutations
- retry after offline/network failure
- guest -> authenticated migration policy
- multi-device validation

## V98A verification

Expected:

- TypeScript PASS
- exactly four new files
- no existing runtime source modified
- V97A-F regression PASS
- final main clean and synchronized
