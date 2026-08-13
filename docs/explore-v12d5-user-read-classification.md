# ROOT Explore V1.2D5 — user read classification

> This report is heuristic and migration-oriented. It is not proof that a candidate is safe to switch to self-only Firestore reads.

## Summary

- V1.2D4 candidates parsed: 8
- LIKELY_SELF_AUTH_BOOTSTRAP: 1
- LIKELY_SELF_ROOT_DOCUMENT: 1
- MANUAL_REVIEW_REQUIRED: 6

## Classification

### `app/login.tsx`

- Classification: **LIKELY_SELF_AUTH_BOOTSTRAP**
- Confidence: medium
- Migration note: Keep on private /users/{uid}; verify the requested uid is always the current authenticated uid.

| line | nearby user/read code |
|---:|---|
| 148 | `const serverPromise:` |
| 149 | `Promise<ServerFetchResult> =` |
| 150 | `getDoc(` |
| 151 | `doc(` |
| 152 | `firebaseDb,` |
| 153 | `'users',` |
| 154 | `uid` |
| 155 | `)` |
| 156 | `)` |
| 889 | `doc(` |
| 890 | `firebaseDb,` |
| 891 | `'users',` |
| 892 | `uid` |
| 893 | `),` |
| 894 | `{` |

### `store/rootMemory.ts`

- Classification: **LIKELY_SELF_ROOT_DOCUMENT**
- Confidence: medium
- Migration note: Keep private ROOT state on /users/{uid}; only cross-user presentation fields should move to rootUserPublicProfiles.

| line | nearby user/read code |
|---:|---|
| 44 | `doc(` |
| 45 | `firebaseDb,` |
| 46 | `'users',` |
| 47 | `String(` |
| 48 | `uid` |
| 49 | `)` |
| 59 | `) => {` |
| 60 | `await setDoc(` |
| 61 | `getUserDocumentRef(` |
| 62 | `uid` |
| 63 | `),` |
| 64 | `data,` |
| 1294 | `` |
| 1295 | `const serverLoadPromise =` |
| 1296 | `getDocs(` |
| 1297 | `crewListQuery` |
| 1298 | `)` |
| 1299 | `.then(` |
| 1382 | `);` |
| 1383 | `` |
| 1384 | `return onSnapshot(` |
| 1385 | `crewListQuery,` |
| 1386 | `` |
| 1387 | `(` |
| 1573 | `] =` |
| 1574 | `await Promise.all([` |
| 1575 | `getDocs(` |
| 1576 | `crewPostQuery` |
| 1577 | `),` |
| 1578 | `` |
| 1579 | `getDocs(` |
| 1580 | `sharedCrewPostQuery` |
| 1581 | `),` |
| 1582 | `]);` |
| 1749 | `` |
| 1750 | `/*` |

### `store/rootPlaceCommunity.ts`

- Classification: **MANUAL_REVIEW_REQUIRED**
- Confidence: low
- Migration note: Do not tighten /users/{uid} for this path until the target uid and fields are manually classified.

| line | nearby user/read code |
|---:|---|
| 503 | `doc(` |
| 504 | `firebaseDb,` |
| 505 | `'users',` |
| 506 | `record.userId` |
| 507 | `);` |
| 508 | `` |
| 1519 | `user.uid;` |
| 1520 | `` |
| 1521 | `return onSnapshot(` |
| 1522 | `doc(` |
| 1523 | `firebaseDb,` |
| 1524 | `'users',` |
| 1525 | `uid` |
| 1526 | `),` |
| 1527 | `(` |

### `store/savedCafeFolders.ts`

- Classification: **MANUAL_REVIEW_REQUIRED**
- Confidence: low
- Migration note: Do not tighten /users/{uid} for this path until the target uid and fields are manually classified.

| line | nearby user/read code |
|---:|---|
| 957 | `doc(` |
| 958 | `db,` |
| 959 | `'users',` |
| 960 | `expectedUid,` |
| 961 | `);` |
| 962 | `` |
| 963 | `const snapshot =` |
| 964 | `await withTimeout(` |
| 965 | `getDoc(userRef),` |
| 966 | `SAVED_CAFE_FOLDER_READ_TIMEOUT_MS,` |
| 967 | `'SAVED_CAFE_FOLDER_FIRESTORE_READ_TIMEOUT',` |
| 968 | `);` |

### `store/savedCafeLocal.ts`

- Classification: **MANUAL_REVIEW_REQUIRED**
- Confidence: low
- Migration note: Do not tighten /users/{uid} for this path until the target uid and fields are manually classified.

| line | nearby user/read code |
|---:|---|
| 995 | `doc(` |
| 996 | `db,` |
| 997 | `'users',` |
| 998 | `expectedUid,` |
| 999 | `);` |
| 1000 | `` |
| 1001 | `const snapshot =` |
| 1002 | `await withTimeout(` |
| 1003 | `getDoc(userRef),` |
| 1004 | `SAVED_CAFE_READ_TIMEOUT_MS,` |
| 1005 | `'SAVED_CAFE_FIRESTORE_READ_TIMEOUT',` |
| 1006 | `);` |

### `store/savedCafeRecommendationFeedback.ts`

- Classification: **MANUAL_REVIEW_REQUIRED**
- Confidence: low
- Migration note: Do not tighten /users/{uid} for this path until the target uid and fields are manually classified.

| line | nearby user/read code |
|---:|---|
| 608 | `doc(` |
| 609 | `db,` |
| 610 | `'users',` |
| 611 | `expectedUid,` |
| 612 | `);` |
| 613 | `` |
| 614 | `const snapshot =` |
| 615 | `await withTimeout(` |
| 616 | `getDoc(userRef),` |
| 617 | `SAVED_CAFE_RECOMMENDATION_FEEDBACK_READ_TIMEOUT_MS,` |
| 618 | `'SAVED_CAFE_RECOMMENDATION_FEEDBACK_FIRESTORE_READ_TIMEOUT',` |
| 619 | `);` |

### `store/savedCafeRecommendationPreferences.ts`

- Classification: **MANUAL_REVIEW_REQUIRED**
- Confidence: low
- Migration note: Do not tighten /users/{uid} for this path until the target uid and fields are manually classified.

| line | nearby user/read code |
|---:|---|
| 588 | `doc(` |
| 589 | `db,` |
| 590 | `'users',` |
| 591 | `expectedUid,` |
| 592 | `);` |
| 593 | `` |
| 594 | `const snapshot =` |
| 595 | `await withTimeout(` |
| 596 | `getDoc(userRef),` |
| 597 | `READ_TIMEOUT_MS,` |
| 598 | `'SAVED_CAFE_RECOMMENDATION_PREFERENCE_FIRESTORE_READ_TIMEOUT',` |
| 599 | `);` |

### `store/savedCafeVisits.ts`

- Classification: **MANUAL_REVIEW_REQUIRED**
- Confidence: low
- Migration note: Do not tighten /users/{uid} for this path until the target uid and fields are manually classified.

| line | nearby user/read code |
|---:|---|
| 838 | `doc(` |
| 839 | `db,` |
| 840 | `'users',` |
| 841 | `expectedUid,` |
| 842 | `);` |
| 843 | `` |
| 844 | `const snapshot =` |
| 845 | `await withTimeout(` |
| 846 | `getDoc(userRef),` |
| 847 | `SAVED_CAFE_VISIT_READ_TIMEOUT_MS,` |
| 848 | `'SAVED_CAFE_VISIT_FIRESTORE_READ_TIMEOUT',` |
| 849 | `);` |

## V1.2D5 decision

- Do not deploy the self-only `/users/{uid}` target yet.
- Stage A adds a separate `rootUserPublicProfiles/{uid}` projection while preserving the current signed-in cross-user `/users/{uid}` read.
- The target rules demonstrate the final self-only private user rule and are emulator-tested only.
- Runtime reads must be migrated candidate-by-candidate before the target is eligible for production deploy.

