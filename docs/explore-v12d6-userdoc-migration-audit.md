# ROOT Explore V1.2D6 — cross-user `/users/{uid}` migration audit

> Conservative static audit. A classification is not proof of runtime uid ownership.

## Summary

- Runtime files scanned: 178
- User-document read sites found: 11
- MANUAL_UID_FLOW_REVIEW: 3
- LIKELY_SELF: 8

## Migration rule

- LIKELY_SELF stays on private `/users/{uid}`.
- POSSIBLE_PUBLIC_PRESENTATION must be moved to `rootUserPublicProfiles/{uid}` only after Stage A is live and the projection has been backfilled.
- MANUAL_UID_FLOW_REVIEW blocks the self-only Rules release until the uid source is proven.

### `app/login.tsx:150`

- Classification: **MANUAL_UID_FLOW_REVIEW**

| line | code |
|---:|---|
| 147 | `*/` |
| 148 | `const serverPromise:` |
| 149 | `Promise<ServerFetchResult> =` |
| 150 | `getDoc(` |
| 151 | `doc(` |
| 152 | `firebaseDb,` |
| 153 | `'users',` |
| 154 | `uid` |
| 155 | `)` |

### `store/rootMemory.ts:6553`

- Classification: **LIKELY_SELF**

| line | code |
|---:|---|
| 6550 | `await resolveWithTimeout<` |
| 6551 | `any \| null` |
| 6552 | `>(` |
| 6553 | `getDoc(` |
| 6554 | `getUserDocumentRef(` |
| 6555 | `currentUser.uid` |
| 6556 | `)` |
| 6557 | `),` |
| 6558 | `` |

### `store/rootMemory.ts:7342`

- Classification: **LIKELY_SELF**

| line | code |
|---:|---|
| 7339 | `try {` |
| 7340 | `const snapshot =` |
| 7341 | `await resolveWithTimeout<any \| null>(` |
| 7342 | `getDoc(` |
| 7343 | `getUserDocumentRef(` |
| 7344 | `currentUser.uid` |
| 7345 | `)` |
| 7346 | `),` |
| 7347 | `` |

### `store/rootMemory.ts:7681`

- Classification: **LIKELY_SELF**

| line | code |
|---:|---|
| 7678 | `) {` |
| 7679 | `try {` |
| 7680 | `const snapshot =` |
| 7681 | `await getDoc(` |
| 7682 | `getUserDocumentRef(` |
| 7683 | `currentUser.uid` |
| 7684 | `)` |
| 7685 | `);` |
| 7686 | `` |

### `store/rootPlaceCommunity.ts:1521`

- Classification: **MANUAL_UID_FLOW_REVIEW**

| line | code |
|---:|---|
| 1518 | `const uid =` |
| 1519 | `user.uid;` |
| 1520 | `` |
| 1521 | `return onSnapshot(` |
| 1522 | `doc(` |
| 1523 | `firebaseDb,` |
| 1524 | `'users',` |
| 1525 | `uid` |
| 1526 | `),` |

### `store/rootUserPublicProfileSync.ts:115`

- Classification: **MANUAL_UID_FLOW_REVIEW**

| line | code |
|---:|---|
| 112 | `}` |
| 113 | `` |
| 114 | `const snapshot =` |
| 115 | `await getDoc(` |
| 116 | `doc(` |
| 117 | `getFirestore(),` |
| 118 | `'users',` |
| 119 | `normalizedUid,` |
| 120 | `),` |

### `store/savedCafeFolders.ts:965`

- Classification: **LIKELY_SELF**

| line | code |
|---:|---|
| 962 | `` |
| 963 | `const snapshot =` |
| 964 | `await withTimeout(` |
| 965 | `getDoc(userRef),` |
| 966 | `SAVED_CAFE_FOLDER_READ_TIMEOUT_MS,` |
| 967 | `'SAVED_CAFE_FOLDER_FIRESTORE_READ_TIMEOUT',` |
| 968 | `);` |
| 969 | `` |
| 970 | `const activeUidAfterRead =` |

### `store/savedCafeLocal.ts:1003`

- Classification: **LIKELY_SELF**

| line | code |
|---:|---|
| 1000 | `` |
| 1001 | `const snapshot =` |
| 1002 | `await withTimeout(` |
| 1003 | `getDoc(userRef),` |
| 1004 | `SAVED_CAFE_READ_TIMEOUT_MS,` |
| 1005 | `'SAVED_CAFE_FIRESTORE_READ_TIMEOUT',` |
| 1006 | `);` |
| 1007 | `` |
| 1008 | `const activeUidAfterRead =` |

### `store/savedCafeRecommendationFeedback.ts:616`

- Classification: **LIKELY_SELF**

| line | code |
|---:|---|
| 613 | `` |
| 614 | `const snapshot =` |
| 615 | `await withTimeout(` |
| 616 | `getDoc(userRef),` |
| 617 | `SAVED_CAFE_RECOMMENDATION_FEEDBACK_READ_TIMEOUT_MS,` |
| 618 | `'SAVED_CAFE_RECOMMENDATION_FEEDBACK_FIRESTORE_READ_TIMEOUT',` |
| 619 | `);` |
| 620 | `` |
| 621 | `const activeUidAfterRead =` |

### `store/savedCafeRecommendationPreferences.ts:596`

- Classification: **LIKELY_SELF**

| line | code |
|---:|---|
| 593 | `` |
| 594 | `const snapshot =` |
| 595 | `await withTimeout(` |
| 596 | `getDoc(userRef),` |
| 597 | `READ_TIMEOUT_MS,` |
| 598 | `'SAVED_CAFE_RECOMMENDATION_PREFERENCE_FIRESTORE_READ_TIMEOUT',` |
| 599 | `);` |
| 600 | `` |
| 601 | `const activeUidAfterRead =` |

### `store/savedCafeVisits.ts:846`

- Classification: **LIKELY_SELF**

| line | code |
|---:|---|
| 843 | `` |
| 844 | `const snapshot =` |
| 845 | `await withTimeout(` |
| 846 | `getDoc(userRef),` |
| 847 | `SAVED_CAFE_VISIT_READ_TIMEOUT_MS,` |
| 848 | `'SAVED_CAFE_VISIT_FIRESTORE_READ_TIMEOUT',` |
| 849 | `);` |
| 850 | `` |
| 851 | `const activeUidAfterRead =` |

## V1.2D6 activation decision

- Client projection sync adapter is prepared but intentionally not wired.
- Admin backfill tool is prepared and installer executes DRY_RUN only.
- Stage A has not been production-deployed, so client projection writes would currently be denied.
- Next activation phase must deploy Stage A first, run confirmed backfill, then enable dual-write/read migration.

