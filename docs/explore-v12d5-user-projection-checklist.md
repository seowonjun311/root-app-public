# ROOT Explore V1.2D5 — public user projection / self-only target

## Baseline

Exact repository baseline:

`1e467e4391cb1f101c8e9071ef28c59f1211e401`

Production Firestore rules must remain:

`26530898D2740729CAE75EF125E28E61E9F18678964666B5519A2E7DF6A80944`

Local V1.2D4 hardened rules remain:

`FD74B90DD9FEC2919CA9BB3868116A6A9C3294B23F511F0807FB25BBD5BB059A`

## Why a separate projection

Firestore reads are document-level. Security Rules cannot expose only selected
fields from a `/users/{uid}` document while hiding private fields in that same
document.

V1.2D5 therefore prepares a separate signed-in-readable collection:

`rootUserPublicProfiles/{uid}`

The first allowlisted schema is intentionally narrow:

- version
- uid
- displayName
- nickname
- photoURL
- representativeBadgeId
- updatedAt

Fields such as email, private ROOT state, pending community data, ledger,
health/daily data, or other user document payloads are not allowed in this
projection.

## Stage A candidate

`firebase/firestore-v12d5-public-projection-stage-a.rules`

SHA256:

`5B8666F3DDFA1F3BE438F1BE26CF9E7FD57F30596D9B6A7A011F7C2623768732`

Stage A adds the projection but deliberately preserves the current:

```rules
match /users/{uid} {
  allow read: if signedIn();
}
```

This is migration-safe but does **not** fix the existing privacy exposure by
itself.

## Self-only target

`firebase/firestore-v12d5-self-only-target.rules`

SHA256:

`28BAB9FCA79E720FF5A0DAEBD008ADA08EED4B884F49D00D6EB0FEF3D1BEFF8A`

The target changes top-level private user reads to:

```rules
match /users/{uid} {
  allow read: if isSelf(uid);
  allow create, update, delete: if isSelf(uid);
}
```

The target is emulator-tested only and is **not eligible for production deploy**
until every cross-user read candidate is migrated.

## Runtime foundation

`store/rootUserPublicProfile.ts` adds a pure projection builder only.

It performs no Firestore writes and is not imported into current screens or
stores. Runtime dual-write/read migration belongs to a later step after the
classification report is reviewed.

## V1.2D5 classification

`scripts/audit-explore-v12d5-user-read-classification.mjs` parses the eight
V1.2D4 candidates from the existing audit and generates:

`docs/explore-v12d5-user-read-classification.md`

The categories are conservative heuristics:

- LIKELY_SELF_AUTH_BOOTSTRAP
- LIKELY_SELF_ROOT_DOCUMENT
- PUBLIC_PROJECTION_MIGRATION_CANDIDATE
- MANUAL_REVIEW_REQUIRED

They are migration guidance, not proof of safety.

## Emulator

Both Stage A and the self-only target are loaded into the Firestore Emulator
under demo project:

`demo-root-explore-v12d5`

The test proves:

- anonymous private-user reads fail;
- own private-user reads work;
- Stage A still allows the known cross-user private read;
- self-only target denies that same read;
- signed-in cross-user public-profile reads work;
- anonymous public-profile reads fail;
- users can write only their own public profile;
- extra fields such as `email` are denied;
- uid spoofing is denied;
- rootModerator moderation privilege remains intact.

## Production safety

No production Rules release exists in V1.2D5.

The installer dry-run compiles both candidate files against `root-c7949` using
temporary Firebase config files, then re-exports the live production Rules and
requires the production SHA256 to remain unchanged.

## Next

V1.2D6 should use the generated classification to migrate actual cross-user
presentation reads to `rootUserPublicProfiles/{uid}` and add a migration-safe
dual-write/backfill path.

Only after runtime migration and physical-device regression should the
self-only target be considered for a real Rules release.
