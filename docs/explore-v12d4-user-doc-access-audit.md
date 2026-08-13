# ROOT Explore V1.2D4 — `/users/{uid}` access dependency audit

> Generated automatically from the exact V1.2D4 baseline before any `/users/{uid}` rule tightening.

## Summary

- Runtime source roots scanned: app, components, store, hooks, utils
- Source files scanned: 176
- Files containing a user-document path/helper token: 19
- Files with a nearby Firestore read candidate: 8

This is a conservative static inventory, not proof that every candidate performs a cross-user read at runtime.
The existing production rule remains unchanged in V1.2D4; tightening is deferred until each candidate is classified.

## Candidate files

### `app/login.tsx`

- User path/helper occurrences: 2
- Firestore read-token occurrences: 1

| line | code |
|---:|---|
| 150 | `getDoc(` |
| 153 | `'users',` |

### `store/rootMemory.ts`

- Detected a read call through `getUserDocumentRef(...)`.
- User path/helper occurrences: 5
- Firestore read-token occurrences: 17

| line | code |
|---:|---|
| 46 | `'users',` |
| 61 | `getUserDocumentRef(` |
| 6553 | `getDoc(` |
| 6554 | `getUserDocumentRef(` |
| 7342 | `getDoc(` |
| 7343 | `getUserDocumentRef(` |
| 7681 | `await getDoc(` |
| 7682 | `getUserDocumentRef(` |

### `store/rootPlaceCommunity.ts`

- User path/helper occurrences: 2
- Firestore read-token occurrences: 1

| line | code |
|---:|---|
| 1521 | `return onSnapshot(` |
| 1524 | `'users',` |

### `store/savedCafeFolders.ts`

- User path/helper occurrences: 1
- Firestore read-token occurrences: 1

| line | code |
|---:|---|
| 959 | `'users',` |
| 965 | `getDoc(userRef),` |

### `store/savedCafeLocal.ts`

- User path/helper occurrences: 1
- Firestore read-token occurrences: 1

| line | code |
|---:|---|
| 997 | `'users',` |
| 1003 | `getDoc(userRef),` |

### `store/savedCafeRecommendationFeedback.ts`

- User path/helper occurrences: 1
- Firestore read-token occurrences: 1

| line | code |
|---:|---|
| 610 | `'users',` |
| 616 | `getDoc(userRef),` |

### `store/savedCafeRecommendationPreferences.ts`

- User path/helper occurrences: 1
- Firestore read-token occurrences: 1

| line | code |
|---:|---|
| 590 | `'users',` |
| 596 | `getDoc(userRef),` |

### `store/savedCafeVisits.ts`

- User path/helper occurrences: 1
- Firestore read-token occurrences: 1

| line | code |
|---:|---|
| 840 | `'users',` |
| 846 | `getDoc(userRef),` |

## Required classification before production tightening

For each candidate above, classify it as one of:

- self-only private document read;
- intentional cross-user public profile read;
- crew/ranking/social read that should move to a public projection;
- false positive / helper-only reference.

V1.2D4 intentionally does **not** change the existing `/users/{uid}` read policy.

