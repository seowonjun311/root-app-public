# Character V98D - Guest Handoff + Cloud Diagnostics

## Goal

Complete the explicit guest -> authenticated character transition and make
V98 cloud state directly inspectable on-device.

## Login handoff

V98D captures the character account scope BEFORE Google authentication.

The guest handoff runs only when:

- ROOT local loginType before Google login was `guest`
- the captured character scope was actually a guest scope

After Firebase Google authentication succeeds:

- resolve the authenticated character scope
- attempt V98C guest -> authenticated migration
- log the result
- continue normal ROOT login regardless of migration success/failure

## Existing Google account safety

The V98C migration helper already requires:

- source scope is guest
- destination scope is authenticated user
- destination scoped character local data is empty
- destination `characterSystemV98` cloud bundle is absent
- guest scoped bundle contains character state

Therefore existing Google character data is never replaced by guest state.

## Why failure does not block login

Character handoff is wrapped in a separate try/catch.

ROOT login/server restore remains authoritative for login success.

A network or character-cloud error cannot trap the user on the login page.

## Cloud diagnostics route

Route:

`/character-cloud-diagnostics`

Character Preview entry:

`클라우드 진단`

Visible fields:

- scope kind
- scopeId
- cloudUid / guestId
- localHasData
- localFieldCount
- dirty
- lastLocalMutationAt
- cloudExists
- cloudUpdatedAt
- lastCloudUpdatedAt
- lastSyncAt
- syncInFlight
- retryScheduled
- retryAttempt

Buttons:

- 새로고침
- 지금 동기화

## Expected authenticated healthy state

Typical stable Google account:

- scopeId: `uid_...`
- kind: `user`
- localHasData: YES
- cloudExists: YES
- dirty: NO
- syncInFlight: NO
- retryScheduled: NO
- cloudScopeId matches current scopeId

## Expected guest state

- scopeId: `guest_...`
- kind: `guest`
- cloudUid: -
- cloud may be absent
- guest remains local-only

## Guest -> new Google account test

1. Start as guest.
2. Gain character XP / relationship state.
3. Note selected character and progression.
4. Google-login to an account with no prior character cloud state.
5. Open Character Preview and Cloud Diagnostics.

Expected:

- Google account receives guest character bundle
- `scopeId` changes from guest to uid
- cloud bundle becomes available after sync
- selected/progression/relationship survive the transition

## Guest -> existing Google account test

1. Google account A already has cloud character data.
2. Enter a guest state separately.
3. Login to account A.

Expected:

- A's existing cloud character data wins
- guest bundle does not overwrite A
- handoff result is false/skipped

## Account isolation regression

A -> B -> A:

Expected:

- each UID keeps independent character state
- cloudOwnerUid/cloudScopeId match active account
- no XP/relationship leak

## Offline diagnostics test

1. Disable network.
2. mutate character XP/relationship.
3. open cloud diagnostics.

Expected:

- local state still works
- dirty may be YES
- retryScheduled/retryAttempt may increase

Reconnect, press `지금 동기화`.

Expected after successful sync:

- dirty becomes NO
- lastSyncAt updates
- cloudUpdatedAt is present

## Regression checks

Confirm:

- V98C automatic cloud bootstrap remains
- V98C Firestore transaction conflict protection remains
- V98B account-scoped storage remains
- legacy V97 rollback keys remain
- V97F acquisition celebration remains
- V97E unlock rules remain
- V97D point reward/idempotency remains
- V97C XP interaction remains
- V97B selection gate remains
- V96 relationship remains
- V61/V63/V64/V65/V66 behavior remains
- renderer/roaming unchanged

## Next

After V98D device validation:

V98 can move to final hardening:

- cloud diagnostics history/event log
- optional explicit "keep guest data" confirmation UX
- sync schema migration/version policy
- final account A/B/guest/multi-device release checklist
