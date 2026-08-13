# ROOT Explore V1.2D9 V2 — zero-cross-user audit + release rehearsal

## Baseline

- V1.2D8 baseline: `dfd42fd2c574d34607e9746e9d8f4c6bbf74bad0`
- Production/local Stage A SHA256: `5B8666F3DDFA1F3BE438F1BE26CF9E7FD57F30596D9B6A7A011F7C2623768732`
- Reviewed self-only SHA256: `28BAB9FCA79E720FF5A0DAEBD008ADA08EED4B884F49D00D6EB0FEF3D1BEFF8A`

## V1 failure finding

V1 correctly blocked six sites.

Five were saved-cafe cloud-sync reads whose `expectedUid` came from the active
sync scope but whose Firebase Auth identity check happened only after the
Firestore read.

V2 adds the same auth equality check before the read, while retaining the
existing post-read and post-write checks.

The sixth V1 site was a scanner false positive:
`readRootUserPublicProfile(...)` reads `rootUserPublicProfiles`, not private
top-level `users`.

## V2 runtime hardening

These stores gain a pre-read Firebase Auth uid equality gate:

- `store/savedCafeFolders.ts`
- `store/savedCafeLocal.ts`
- `store/savedCafeRecommendationFeedback.ts`
- `store/savedCafeRecommendationPreferences.ts`
- `store/savedCafeVisits.ts`

## Fresh precise audit

The V2 scanner resolves the actual Firestore read argument and local document
reference variables such as `userRef`.

It separately classifies the public profile projection collection and blocks
any unresolved or collection-wide private users read.

## Frozen release package

- `firebase/firestore-v12d9-self-only-release-candidate.rules`
- `firebase/firestore-v12d9-stage-a-rollback.rules`

The first must match `28BAB9FCA79E720FF5A0DAEBD008ADA08EED4B884F49D00D6EB0FEF3D1BEFF8A`.
The second must match `5B8666F3DDFA1F3BE438F1BE26CF9E7FD57F30596D9B6A7A011F7C2623768732`.

Both are compiled with `firebase deploy --dry-run` only.

## Production mutation policy

V1.2D9 V2 performs no real Security Rules release and no public-profile
backfill write.

Production must remain Stage A before and after.

## Device gate

Before V1.2D10, confirm on a physical device:

`ROOT USER SELF-ONLY DEVICE DIAGNOSTIC`

with:

```text
ok: true
authenticated: true
authMatchesRequestedUid: true
privateUserReadable: true
publicProfileReadable: true
publicProjectionMatchesPrivateSource: true
unexpectedPublicFieldCount: 0
```

Also test sign-out/sign-in, app restart, saved-cafe sync, and
Explore/community without permission-denied errors.

Successful V1.2D9 plus successful device gate is the prerequisite for the
V1.2D10 production self-only release.
