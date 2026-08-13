# ROOT Explore V1.2D3 — Firestore Deploy Readiness

## Reviewed source hashes

Current deployed rules captured from `root-c7949`:

`26530898D2740729CAE75EF125E28E61E9F18678964666B5519A2E7DF6A80944`

Reviewed moderation candidate:

`5CD42FD91B09AAD9F91EC02052C7FF7A53369C2683D396EF4242046A9846111B`

## Exact structural diff result

The uploaded candidate was compared against the uploaded current rules.

Removing the block beginning with:

`ROOT_EXPLORE_V12D2_MERGED_MODERATION_RULES`

and restoring the original closing braces reconstructs the current rules
byte-for-byte.

No existing rule, function, match path, or allow condition was modified by the
candidate.

The candidate adds only these moderation/public-community paths:

- `rootPlaceModerationInbox`
- `rootPlaceApprovedCommunityRecords`
- `rootPlacePublicCommunityDistricts`
- `rootPlaceCommunityReports`
- `rootPlaceModerationAudit`

plus `isRootPlaceModerator()`.

## Existing privacy finding — not introduced by V1.2D

The live rules already contain:

```rules
match /users/{uid} {
  allow read: if signedIn();
  allow create, update, delete: if isSelf(uid);
}
```

Therefore any authenticated Firebase user can read any top-level user
document.

ROOT pending community data is stored as fields inside the user document, so
this existing access model needs a compatibility/privacy audit before
production moderation rollout.

Do not tighten it blindly because crew/profile flows may depend on cross-user
reads.

## Existing catch-all

The live rules keep:

```rules
match /{document=**} {
  allow read, write: if false;
}
```

The moderation paths are explicit sibling matches inside the same Firestore
documents scope.

## Repository config

V1.2D3 adds:

- `firestore.rules`
- `firebase.json`
- `scripts/run-explore-v12d3-firestore-dry-run.ps1`
- `scripts/verify-explore-v12d3-firestore-deploy-readiness.mjs`
- `docs/explore-v12d3-firestore-deploy-readiness.md`

`.firebaserc` is intentionally not created. The workflow always passes
`--project root-c7949`.

## Dry-run safety

The dry-run script:

1. verifies the reviewed candidate SHA256;
2. re-exports live rules;
3. refuses to continue if the live SHA256 has changed;
4. runs Firebase CLI with `--dry-run`;
5. re-exports live rules after validation;
6. proves the live SHA256 remained unchanged.

No normal production deploy is included.

## Next — V1.2D4

Before a real deploy:

- audit cross-user `/users/{uid}` read dependencies;
- harden the moderator custom-claim model;
- add Firestore Emulator allow/deny tests;
- test unauthenticated, normal user, contributor and moderator access;
- then create a separately confirmed production deploy step.
