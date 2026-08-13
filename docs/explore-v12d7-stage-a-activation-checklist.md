# ROOT Explore V1.2D7 — Stage A production activation

## Exact baseline

`1127ef9d646fe10da0d0b333f52f73f2982f3ff3`

## Production mutation in this phase

V1.2D7 is the first phase that intentionally changes production Firestore
Security Rules for the ROOT public-user projection migration.

The reviewed Stage A source is:

`firebase/firestore-v12d5-public-projection-stage-a.rules`

SHA256:

`5B8666F3DDFA1F3BE438F1BE26CF9E7FD57F30596D9B6A7A011F7C2623768732`

The previous production Rules SHA256 is:

`26530898D2740729CAE75EF125E28E61E9F18678964666B5519A2E7DF6A80944`

The self-only target remains inactive:

`28BAB9FCA79E720FF5A0DAEBD008ADA08EED4B884F49D00D6EB0FEF3D1BEFF8A`

## Activation sequence

1. require explicit operator confirmation;
2. prove exact V1.2D6 Git baseline;
3. re-export and hash-check the pre-Stage-A production Rules;
4. prove `rootUserPublicProfiles` is empty;
5. prepare all runtime and verifier changes locally;
6. run V1.2D5 Emulator tests and TypeScript/regression checks;
7. dry-run compile active Stage A;
8. release Stage A only;
9. re-export production Rules and require the Stage A SHA;
10. run a single atomic confirmed Admin backfill;
11. verify every current `/users/{uid}` document has one allowlisted projection;
12. commit and push the matching local Stage A/runtime source.

## Dual-write activation

V1.2D7 activates public-profile synchronization at two existing own-user write
boundaries:

- login merged-root save;
- selective `mergeUserDocument(...)` calls that contain presentation fields.

The selective merge trigger watches only presentation-source keys such as
nickname, profile image, display name, and representative badge fields. Normal
ledger, health, daily-data, or unrelated ROOT writes do not cause projection
sync traffic.

## Backfill safety

The Admin backfill:

- requires `--write`;
- requires exact `--confirm root-c7949:rootUserPublicProfiles`;
- refuses non-empty projection collections;
- refuses more than 200 source users;
- writes all current profiles in one atomic Firestore batch;
- uses `batch.create`, not overwrite;
- does not print user field values.

## Important remaining blocker

V1.2D6 found `MANUAL_UID_FLOW_REVIEW` read sites.

V1.2D7 does not switch `/users/{uid}` to self-only. The Stage A Rules retain
the existing signed-in top-level user read for migration compatibility.

The self-only target must remain blocked until those uid flows are proven and
any true cross-user presentation read is migrated.

## Failure policy

Before the production Stage A release, installer failure is rolled back to the
exact V1.2D6 Git baseline.

After Stage A has been released, the installer deliberately does not perform a
destructive local rollback. The local Stage A/runtime changes are preserved so
the repository can be reconciled with the live production state.
