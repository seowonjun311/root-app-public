# Character V98E - Final Release Hardening

## Goal

Close the V98 code-hardening phase.

V98E adds strict cloud compatibility/integrity guards without adding new
gameplay rules or destructively repairing user data.

## Cloud schema

Current supported character cloud schema:

`version = 1`

A cloud envelope is accepted only when all are true:

- version is exactly 1
- ownerUid exactly matches the active Firebase UID
- scopeId exactly matches the active character account scope
- updatedAt is a valid timestamp
- bundle field shapes are valid

An unsupported future/old schema is NOT interpreted as "no cloud data".

That prevents an older app build from overwriting a newer cloud schema with
its local state.

## Bundle integrity

### selectedCharacter

Must be null or one of:

- rooty
- moru
- mongsil
- dami
- pio
- nuri
- tori

### progression

If present:

- must be valid JSON
- must be a JSON object
- must contain all seven character ids

### relationship

If present:

- must be valid JSON
- must be a JSON object
- must contain all seven character ids

### acquisition celebration

If present:

- must be valid JSON
- must be an array
- every entry must be a valid character id

## Upload protection

V98E validates scoped local data before:

- direct cloud envelope write
- transactional multi-device write

Corrupted local character JSON therefore does not get uploaded over a valid
server copy.

## Download protection

Cloud data is validated before it can replace local scoped state.

Invalid/incompatible cloud data causes an explicit error rather than a
destructive fallback.

## Permanent vs transient errors

Permanent:

- unsupported schema
- owner mismatch
- scope mismatch
- invalid updatedAt
- malformed cloud bundle
- malformed local upload bundle

These do NOT schedule the V98C exponential retry loop.

Transient Firebase/network/conflict failures keep the existing retry behavior.

## Cloud diagnostics

`캐릭터 선택 -> 클라우드 진단`

now includes:

`Release Integrity`

with:

- schemaVersion
- schemaGuard
- cloudReadError
- permanentSyncError

Healthy authenticated account:

- schemaVersion: 1
- schemaGuard: YES
- cloudReadError: -
- permanentSyncError: -

## Code release state

After V98E source verification passes:

- V98A account/cloud foundation
- V98B local account isolation
- V98C active cloud synchronization
- V98D guest handoff + device diagnostics
- V98E release-integrity guards

are code-complete.

## Important: device validation is still deferred

The user intentionally chose to continue coding before running the V98
real-device account/cloud test.

Therefore V98E code PASS does NOT mean the Firebase/account behavior has been
proven on-device.

Before production release, still run:

### Google account A

- scope uid_A
- cloud exists
- dirty stabilizes to NO
- selected/progression/relationship persist after restart

### A -> B

- B does not inherit A state

### B -> A

- A state restores

### Guest -> empty Google account

- explicit handoff preserves guest character state

### Guest -> existing Google account

- existing Google cloud state wins
- guest does not overwrite it

### Offline

- local XP/relationship mutation works
- dirty becomes YES
- reconnect eventually returns dirty to NO

### Multi-device

- stale transaction cannot blindly overwrite newer server data

## Production release gate

Do not call V98 "device-verified" until the above checks are actually run.

Code-complete and device-verified are intentionally separate statuses.

## Next

After V98E succeeds, the next development version should start as V99.

Recommended V99 direction:

`character gameplay polish + acquisition presentation`

rather than further changing the V98 persistence architecture unless device
testing reveals a concrete bug.
