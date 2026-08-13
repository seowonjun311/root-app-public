# ROOT Explore V1.2D4 — user-document audit, emulator tests, moderator claim hardening

## Baseline

V1.2D4 requires exact baseline:

`262aa6443fce69c152486c3dccdde7ca13480747`

Production Firestore rules are still expected to be the pre-deploy rules captured in V1.2D3:

`26530898D2740729CAE75EF125E28E61E9F18678964666B5519A2E7DF6A80944`

V1.2D3 reviewed local candidate:

`5CD42FD91B09AAD9F91EC02052C7FF7A53369C2683D396EF4242046A9846111B`

V1.2D4 hardened local candidate:

`FD74B90DD9FEC2919CA9BB3868116A6A9C3294B23F511F0807FB25BBD5BB059A`

## Security change

The moderation rules previously accepted three custom claims:

- `rootModerator`
- `moderator`
- `admin`

V1.2D4 narrows the Firestore authorization boundary to:

- `rootModerator == true`

The existing Admin SDK claim setter already uses the dedicated `rootModerator` claim.

This phase does **not** set a real user's claim and does **not** deploy Firestore rules.

## `/users/{uid}` privacy finding

The existing live rule remains:

```rules
match /users/{uid} {
  allow read: if signedIn();
  allow create, update, delete: if isSelf(uid);
}
```

V1.2D4 does not tighten that rule yet.

Instead, `scripts/audit-explore-v12d4-user-doc-access.mjs` scans runtime source roots and produces:

`docs/explore-v12d4-user-doc-access-audit.md`

The result must be manually classified before a production rule change because crew/profile/ranking features may intentionally depend on cross-user reads.

## Emulator safety

The test runner uses this project ID:

`demo-root-explore-v12d4`

The Firebase Emulator Suite documentation recommends demo project IDs where possible because they have no live resources.

The suite tests:

- unauthenticated user-document denial;
- own user-document access;
- existing cross-user top-level user-document read behavior;
- cross-user user-document write denial;
- public community aggregate read;
- normal-user public aggregate write denial;
- dedicated `rootModerator` privilege;
- legacy `admin`-only and `moderator`-only denial;
- moderation inbox create/read/update boundaries;
- approved-record moderator boundary;
- community-report create/read/update boundaries;
- moderation audit append-only behavior.

## Production deploy guard

After emulator tests, V1.2D4 runs a Firebase CLI rules `--dry-run` against `root-c7949`.

The workflow re-exports the live rules before and after the dry-run and requires the production SHA256 to remain:

`26530898D2740729CAE75EF125E28E61E9F18678964666B5519A2E7DF6A80944`

No normal production rules deployment command is included.

## Next

V1.2D5 should use the generated user-document access report to choose one of:

1. split public profile/crew fields into a public projection and make `/users/{uid}` self-only; or
2. keep only a minimal explicit public-user document while moving private ROOT data elsewhere.

Only after that design and emulator coverage should a real Firestore rules release be prepared.
