# Character V98C - Cloud Bootstrap + Synchronization

## Goal

Activate authenticated cloud synchronization after V98B proved the local
account-scoped storage boundary.

V98C keeps the V98B scoped local stores as the runtime source and adds an
explicit reconciliation layer with Firestore.

## Synced character domains

One `users/{uid}.characterSystemV98` envelope contains the four V98B scoped
states:

- selected character
- progression/acquisition/growth/claimed rewards
- relationship
- acquisition celebration seen state

ROOT point balance remains in the existing ROOT/rootData synchronization path.

## Durable sync metadata

Each account scope stores:

`character_cloud_sync_meta_v1`

Fields:

- dirty
- lastLocalMutationAt
- lastCloudUpdatedAt
- lastSyncAt

Every live character write uses a central scoped persistence helper.

The character value and dirty metadata are written in one AsyncStorage
`multiSet` before cloud upload is scheduled.

## First cloud bootstrap policy

Authenticated scope automatically reconciles when the scope becomes active.

### Server absent

If scoped local character data exists:

local -> server upload.

### Local absent, server exists

server -> local download.

### Both exist and no V98C sync metadata yet

server wins.

This is intentionally conservative for the first cloud-aware launch. An
unknown local install must not overwrite an already-established cloud bundle
from another device.

## Ongoing conflict policy

After the first successful sync, V98C knows the last cloud version.

If local is dirty while the server also changed:

- compare `lastLocalMutationAt`
- compare cloud envelope `updatedAt`
- newer side wins

This is explicit timestamp last-writer-wins.

The policy is simple and inspectable; it does not silently merge relationship
counters or XP from two concurrent offline devices.

## Transaction protection

Before upload, a Firestore transaction verifies that the server envelope has
not changed since it was read.

If another device writes first:

- transaction throws `CHARACTER_CLOUD_CONFLICT_RETRY`
- the operation does not overwrite that newer server bundle
- reconciliation retries and applies the conflict policy again

## Offline retry

Failed authenticated sync retries with capped exponential backoff:

- ~1.5s
- ~3s
- ~6s
- ~12s
- ~24s
- up to 60s

Dirty metadata persists across app restarts, so a later bootstrap also retries.

## Live cache refresh

When the cloud bundle wins and is downloaded:

- selected-character cache resets/reloads
- progression cache resets/reloads
- relationship cache resets/reloads
- acquisition celebration active/check state resets

Therefore the app does not require a full restart to observe the remote
character state.

## Guest behavior

Guest scopes remain local-only.

They never write `users/{uid}.characterSystemV98`.

V98C provides:

`migrateGuestCharacterBundleToAuthenticatedUserIfEmpty(...)`

but does not call it automatically.

This is deliberate. Automatic guest transfer during Firebase auth hydration
could attach the wrong guest session to an existing account.

The helper only permits migration when:

- source is a guest scope
- destination is an authenticated user scope
- destination scoped local data is empty
- destination cloud bundle is absent
- guest bundle has data

A later login-flow integration can call this helper with explicit transition
context.

## Device test - same account restart

1. Login to account A.
2. Note selected character, XP and relationship.
3. Make one short tap.
4. Wait a few seconds.
5. Restart app.

Expected:

- selection preserved
- XP preserved
- relationship preserved
- no duplicate acquisition celebration

## Device test - two-device / reinstall-style bootstrap

On device 1:

1. account A
2. modify selection or character XP
3. stay online for sync

On another installation/device logged into the same account:

Expected after bootstrap:

- cloud selection arrives
- cloud progression arrives
- cloud relationship arrives
- celebration seen state arrives

## Device test - multi-account

A -> B -> A must still pass V98B isolation.

Cloud bundle path is UID-specific, so account B must never read A's
`characterSystemV98`.

## Device test - offline retry

1. disable network
2. short tap character
3. confirm local XP still changes
4. re-enable network
5. wait for retry
6. restart or check same account on second device

Expected:

- local interaction works offline
- dirty state later reaches cloud
- no app crash

## Conflict test

If two devices change the same account while offline and later reconnect,
V98C uses timestamp last-writer-wins for the whole character bundle.

Expected:

- no duplicate/corrupt JSON
- one deterministic winning bundle
- Firestore transaction prevents stale blind overwrite

## Regression checks

Confirm:

- V98B account isolation remains
- V97F celebration remains one-time
- V97E acquisition rules remain
- V97D ROOT point reward/idempotency remains
- V97C tap +1 XP / long +2 XP remains
- V97B locked character selection remains
- V96 relationship +1/+2 remains
- V61/V63/V64 social behavior remains
- V65 cooldown remains
- V66 anti-repeat remains
- character renderer/roaming remains unchanged

## Next

If V98C device/cloud validation passes:

V98D should integrate the explicit guest -> authenticated handoff into the
actual login transition and add a visible cloud diagnostics page.

That stage can also expose:

- current scopeId
- dirty status
- last local mutation
- last cloud version
- last successful sync
- manual retry
- cloud/local state summary
