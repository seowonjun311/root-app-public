# ROOT Explore V1.2D9 V2 — precise zero-cross-user private read audit

> Fresh collection-aware scan from the V1.2D8 baseline after saved-cafe pre-read hardening.

## Summary

- Runtime source files scanned: 178
- Private-user Firestore read sites found: 13
- Proven authenticated self reads: 13
- Unresolved/blocked private-user reads: 0
- Public-profile reads excluded from private-user count: 1

## Private-user read sites

| site | read | uid | result | proof |
|---|---|---|---|---|
| `app/(tabs)/index.tsx:4396` | `getDoc(` | `currentUser.uid` | **PROVEN_SELF** | direct authenticated-user uid or authenticated self-uid assertion |
| `app/login.tsx:178` | `getDoc(` | `uid` | **PROVEN_SELF** | V1.2D8 login runtime Firebase Auth uid equality guard |
| `store/rootMemory.ts:6582` | `getDoc(` | `currentUser.uid` | **PROVEN_SELF** | direct authenticated-user uid or authenticated self-uid assertion |
| `store/rootMemory.ts:7371` | `getDoc(` | `currentUser.uid` | **PROVEN_SELF** | direct authenticated-user uid or authenticated self-uid assertion |
| `store/rootMemory.ts:7710` | `getDoc(` | `currentUser.uid` | **PROVEN_SELF** | direct authenticated-user uid or authenticated self-uid assertion |
| `store/rootPlaceCommunity.ts:1555` | `onSnapshot(` | `assertOwnRootPlaceCommunityUid(uid)` | **PROVEN_SELF** | direct authenticated-user uid or authenticated self-uid assertion |
| `store/rootUserPublicProfileSync.ts:176` | `getDoc(` | `normalizedUid` | **PROVEN_SELF** | public-profile private source currentUid/normalizedUid self guard |
| `store/rootUserPublicProfileSync.ts:393` | `getDoc(` | `requestedUid` | **PROVEN_SELF** | V1.2D8 device diagnostic authenticated uid equality gate |
| `store/savedCafeFolders.ts:986` | `getDoc(` | `expectedUid` | **PROVEN_SELF** | V1.2D9 saved-cafe pre-read Firebase Auth uid equality guard |
| `store/savedCafeLocal.ts:1024` | `getDoc(` | `expectedUid` | **PROVEN_SELF** | V1.2D9 saved-cafe pre-read Firebase Auth uid equality guard |
| `store/savedCafeRecommendationFeedback.ts:637` | `getDoc(` | `expectedUid` | **PROVEN_SELF** | V1.2D9 saved-cafe pre-read Firebase Auth uid equality guard |
| `store/savedCafeRecommendationPreferences.ts:617` | `getDoc(` | `expectedUid` | **PROVEN_SELF** | V1.2D9 saved-cafe pre-read Firebase Auth uid equality guard |
| `store/savedCafeVisits.ts:867` | `getDoc(` | `expectedUid` | **PROVEN_SELF** | V1.2D9 saved-cafe pre-read Firebase Auth uid equality guard |

## Public projection reads

- `store/rootUserPublicProfileSync.ts:125` — getDoc( reads the public projection collection and is excluded from private `/users/{uid}` dependencies.

## Release gate

- **PASS:** fresh precise audit found zero unresolved cross-user private-user reads.
- **PASS:** no collection-wide private `users` query was found.
- **PASS:** public-profile reads are collection-aware and are not misclassified as private-user reads.
- Physical-device regression remains mandatory before V1.2D10.
