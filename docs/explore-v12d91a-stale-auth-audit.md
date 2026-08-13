# ROOT Explore V1.2D9.1A — stale Firebase Auth guest-scope audit

> ROOT local guest state must take precedence over a stale Firebase Auth user for ordinary account-scoped data and cloud synchronization.

## Summary

- Runtime source files scanned: 180
- Auth-currentUser cloud-context occurrences: 46
- Missing hardened contracts: 0
- Unreviewed stale-auth risks: 0

## Hardened surfaces

- Character account scope
- Google guest-to-user character handoff + exact characterAccountScope import provenance
- Home exploration main badge
- rootMemory cloud/member-dependent operations
- Daily cloud sync
- Exploration cloud sync and journals
- Media backup entry gate
- Action-goal and result-goal cloud ownership
- Character growth ROOT-point reward ownership
- Saved-cafe integrity repair ownership
- Place community private self assertion and remaining account identity
- Settings explicit auth-control reads reviewed with exact-count gate
- Saved-cafe diagnostic auth reads reviewed with exact-count gate
- Saved cafe five-store boundary from V1.2D9.1 remains active

## Auth-currentUser occurrences

- `app/(tabs)/index.tsx:232` — **BOUNDARY_INTERNAL** — `firebaseAuth.currentUser`
- `app/(tabs)/settings.tsx:1003` — **REVIEWED_EXPLICIT_AUTH** — `auth() .currentUser`
- `app/(tabs)/settings.tsx:1200` — **REVIEWED_EXPLICIT_AUTH** — `auth() .currentUser`
- `app/add-action-goal.tsx:42` — **BOUNDARY_INTERNAL** — `auth().currentUser`
- `app/add-result-goal.tsx:42` — **BOUNDARY_INTERNAL** — `auth().currentUser`
- `app/login.tsx:134` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth.currentUser`
- `app/login.tsx:885` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth.currentUser`
- `app/login.tsx:1051` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth .currentUser`
- `app/login.tsx:1392` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth.currentUser`
- `app/login.tsx:1441` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth.currentUser`
- `app/login.tsx:1809` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth.currentUser`
- `app/login.tsx:2277` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth .currentUser`
- `app/login.tsx:2561` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth .currentUser`
- `app/onboarding.tsx:242` — **REVIEWED_EXPLICIT_AUTH** — `auth().currentUser`
- `store/characterAccountScope.ts:91` — **BOUNDARY_INTERNAL** — `auth() .currentUser`
- `store/characterAccountScope.ts:151` — **BOUNDARY_INTERNAL** — `auth() .currentUser`
- `store/characterGrowthPointReward.ts:29` — **BOUNDARY_INTERNAL** — `auth().currentUser`
- `store/dailyCloud.ts:36` — **BOUNDARY_INTERNAL** — `getAuth(getApp()).currentUser`
- `store/explorationCloud.ts:44` — **BOUNDARY_INTERNAL** — `firebaseAuth.currentUser`
- `store/mediaBackup.ts:32` — **BOUNDARY_INTERNAL** — `auth().currentUser`
- `store/rootCloudSession.ts:22` — **BOUNDARY_INTERNAL** — `getAuth(getApp()).currentUser`
- `store/rootMemory.ts:140` — **BOUNDARY_INTERNAL** — `firebaseAuth.currentUser`
- `store/rootPlaceCommunity.ts:46` — **BOUNDARY_INTERNAL** — `firebaseAuth.currentUser`
- `store/rootPlaceCommunitySafety.ts:66` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth .currentUser`
- `store/rootPlaceCommunitySafety.ts:315` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth.currentUser`
- `store/rootPlaceModeration.ts:119` — **REVIEWED_EXPLICIT_AUTH** — `firebaseAuth.currentUser`
- `store/rootUserPublicProfileSync.ts:98` — **REVIEWED_EXPLICIT_AUTH** — `getAuth() .currentUser`
- `store/rootUserPublicProfileSync.ts:356` — **REVIEWED_EXPLICIT_AUTH** — `getAuth() .currentUser`
- `store/savedCafeDiagnostics.ts:783` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeDiagnostics.ts:944` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeFolders.ts:954` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeFolders.ts:993` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeFolders.ts:1057` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeIntegrityRepair.ts:54` — **BOUNDARY_INTERNAL** — `getAuth(getApp()).currentUser`
- `store/savedCafeLocal.ts:992` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeLocal.ts:1031` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeLocal.ts:1095` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeRecommendationFeedback.ts:604` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeRecommendationFeedback.ts:643` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeRecommendationFeedback.ts:709` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeRecommendationPreferences.ts:585` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeRecommendationPreferences.ts:624` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeRecommendationPreferences.ts:693` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeVisits.ts:835` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeVisits.ts:874` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`
- `store/savedCafeVisits.ts:938` — **REVIEWED_EXPLICIT_AUTH** — `getAuth( getApp(), ).currentUser`

## Decision

- **PASS:** all required guest-scope cloud boundaries are installed.
- **PASS:** no unreviewed Firebase-auth-derived cloud identity remains in the runtime scan.
- Explicit Firebase Auth use that remains is limited to reviewed authentication/control/token/self-verification contexts.
- V1.2D9.2 nickname registry migration remains the next blocker before V1.2D10.
