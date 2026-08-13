# ROOT Explore V1.2D8 V2 — MANUAL_UID_FLOW_REVIEW resolution

> V1.2D8 V1 stopped because a line-proximity heuristic could not prove all three sites. V2 resolves them by runtime guard contracts and collection-aware source checks.

## Summary

- V1.2D6 manual sites: 3
- Resolved self-only sites: 3
- Unresolved sites: 0

## Resolutions

### `app/login.tsx`

- Resolution: **PROVEN_SELF_RUNTIME_GUARD**
- `loadServerData(uid)` now checks `firebaseAuth.currentUser.uid` against the requested private user uid before any `/users/{uid}` read.
- This removes dependence on whether an individual caller names the authenticated user `user`, `currentUser`, or another variable.

### `store/rootPlaceCommunity.ts`

- Resolution: **PROVEN_SELF_REFERENCE_GUARD**
- Guarded private-user document refs: 2
- Every direct `doc(..., "users", uid)` reference in this module routes its document id through `assertOwnRootPlaceCommunityUid(...)`.
- The assertion compares the requested uid with Firebase Auth before returning the document id.

### `store/rootUserPublicProfileSync.ts`

- Resolution: **PROVEN_SELF_EXISTING_GUARD + FALSE-POSITIVE-CORRECTION**
- The private source builder rejects `currentUid !== normalizedUid` before its `/users/{uid}` read.
- `readRootUserPublicProfile(...)` reads `rootUserPublicProfiles`, not `/users`; V1 line-proximity matching incorrectly treated that public read as the old manual private-user site.

## Decision

- All three former MANUAL_UID_FLOW_REVIEW sites are now statically and contractually resolved as authenticated-user self reads.
- No former manual site requires a cross-user private `/users/{uid}` read.
- Production remains on Stage A in V1.2D8.
- The self-only target is still not deployed; V1.2D9 must perform a fresh whole-project zero-cross-user audit and release rehearsal.
