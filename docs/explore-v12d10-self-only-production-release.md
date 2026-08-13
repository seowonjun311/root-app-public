# ROOT Explore V1.2D10 — Self-Only Production Release

Baseline: `74aac6a40b1b59296d477299ed223f2ef8dbe674`

## Release decision

The user explicitly requested proceeding without the post-D9.2 physical
guest/member regression and without the ROOT USER SELF-ONLY DEVICE DIAGNOSTIC.

This is a deliberate risk acceptance, not a successful device-diagnostic result.

## Pre-release proofs retained

- V1.2D9.1A whole-runtime stale Firebase Auth audit previously reached zero unreviewed risks.
- V1.2D9.2 removed the final private `/users` collection list query.
- `PRIVATE_USERS_LIST_QUERY = 0`.
- `rootUserPublicProfiles` is the public cross-user projection.
- `rootNicknames` is live, list-denied, and backfilled.
- D9.2 production Rules SHA before D10:
  `168EEFD138D2B731D9AF2B102BA13640B5934B447D67958755348A1EFD99C8BD`
- D10 reviewed self-only target SHA:
  `FA578EC3374BF692E4EFAB783511287EFEBCC5D39DB606CD7A3C34C1CB69470F`

## D10 production behavior

Private `users/{uid}` access is released using the already-reviewed self-only
candidate. Cross-user presentation must use `rootUserPublicProfiles/{uid}`.
Nickname uniqueness remains on `rootNicknames/{nickname}`.

## V2 readiness correction

V1 safely stopped before any production mutation because it invoked the
historical `verify-explore-v12d8-self-only-readiness.mjs`. That verifier was
written specifically for the old V1.2D7 Stage A SHA and old D5 self-only
candidate, and explicitly described the real V1.2D10 release as deferred.
After D9.2, those historical SHA assumptions are intentionally obsolete.

V2 replaced the obsolete D8 verifier with the correct current-era hash/readiness
checks, but safely stopped before production mutation because two explanatory
comment blocks were written with `/* ... */` syntax directly inside the
PowerShell installer. PowerShell interpreted `/*` as a command. V3 changes
those two executable-script comments to PowerShell `#` comments only; the D10
release logic and safety gates are otherwise unchanged.

V2 does not weaken the release gate. It replaces the obsolete D8 baseline
assertion with current D10-era proofs:

- exact D9.2 production/live source SHA;
- exact D9.2 rollback source SHA;
- exact reviewed D9.2 self-only candidate SHA;
- public-profile consistency;
- rootNicknames consistency;
- `PRIVATE_USERS_LIST_QUERY = 0`;
- whole-runtime stale Firebase Auth audit;
- D9.1A guest-scope structural verifier;
- D9.2 nickname-registry verifier;
- TypeScript and Rules dry-runs.

## Skipped gate

The following runtime proof was skipped by explicit user instruction:

- post-D9.2 physical guest regression;
- post-D9.2 physical authenticated-member regression;
- `ROOT USER SELF-ONLY DEVICE DIAGNOSTIC`.

Therefore a missed runtime path could still surface as `PERMISSION_DENIED` only
after production self-only Rules are active.

## Rollback

The exact D9.2 Stage A + nickname-registry Rules are frozen at:

`firebase/firestore-v12d92-stage-a-nickname-registry.rules`

Normalized SHA:

`168EEFD138D2B731D9AF2B102BA13640B5934B447D67958755348A1EFD99C8BD`

If post-release automated verification fails before commit, the installer
automatically redeploys this frozen rollback source and verifies the live SHA.

## Completion

Successful D10 requires:

- exact D9.2 Git baseline;
- exact D9.2 live production SHA before release;
- public-profile consistency;
- nickname-registry consistency;
- zero private `/users` list queries;
- stale-auth/guest-scope/self-only-readiness regression gates;
- TypeScript PASS;
- target Rules CLI dry-run PASS;
- exact local release hash;
- exact live post-deploy hash;
- clean commit/push.

Physical diagnostics remain marked **SKIPPED BY USER**, not PASS.
