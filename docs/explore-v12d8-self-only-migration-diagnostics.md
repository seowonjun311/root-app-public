# ROOT Explore V1.2D8 V2 — manual UID-flow hardening + physical-device diagnostics

## Baseline

- Exact V1.2D7 commit: `f08d800ee7045f47e1a37ce712d80eb21ea90316`
- Live/local Stage A SHA256: `5B8666F3DDFA1F3BE438F1BE26CF9E7FD57F30596D9B6A7A011F7C2623768732`
- Self-only target SHA256: `28BAB9FCA79E720FF5A0DAEBD008ADA08EED4B884F49D00D6EB0FEF3D1BEFF8A`

## Why V1 failed

V1 used a line-proximity and call-name heuristic. It safely stopped because:

- `loadServerData(user.uid)` from settings was not proven by the heuristic;
- the rootPlaceCommunity manual read could not be relocated as a `getDoc` site;
- `readRootUserPublicProfile(...)`, which reads the public projection collection, was incorrectly selected as the nearest old manual site.

V2 replaces those heuristic assumptions with enforceable runtime contracts.

## V2 hardening

### Login

`loadServerData(uid)` now rejects any uid that is not the current Firebase Auth uid before reading `/users/{uid}`.

### Root place community

Every direct `doc(..., 'users', uid)` reference in `store/rootPlaceCommunity.ts` is wrapped by `assertOwnRootPlaceCommunityUid(...)`.

The assertion verifies the requested uid matches Firebase Auth before a private user document reference can be created.

### Public profile sync

The existing private-source builder already rejects `currentUid !== normalizedUid` before reading `/users/{uid}`.

`readRootUserPublicProfile(...)` is explicitly treated as a read of `rootUserPublicProfiles`, not a private `/users` read.

## Physical-device diagnostic

After successful own public-profile sync, `__DEV__` logs:

`ROOT USER SELF-ONLY DEVICE DIAGNOSTIC`

Healthy output:

- `ok: true`
- `authenticated: true`
- `authMatchesRequestedUid: true`
- `privateUserReadable: true`
- `publicProfileReadable: true`
- `publicProjectionMatchesPrivateSource: true`
- `unexpectedPublicFieldCount: 0`

Only booleans/counts are logged.

## Device regression

After install:

1. sign out and sign in;
2. confirm the diagnostic reports `ok: true`;
3. change nickname/profile presentation if available;
4. change representative badge;
5. force-close and reopen;
6. verify Explore/community has no permission-denied errors.

No new native dependency is added.

## Release status

V1.2D8 reruns the Stage A/self-only Emulator suite and production-safe self-only Rules dry-run.

It does not deploy the self-only target.

V1.2D9 is the fresh whole-project zero-cross-user audit + release rehearsal.

V1.2D10 is the actual production self-only Rules release.
