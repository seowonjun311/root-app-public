# ROOT Explore V1.2D9.2 — Nickname Registry Activation

Baseline: `ecd989e628730a2332adb00c023a339fbc85175c`

## V2 compatibility correction

V1 correctly stopped before any production mutation because 2 of 5 historical member nicknames did not match the new strict nickname allowlist. There were zero collisions and the registry was still empty. That strict allowlist is appropriate for NEW nickname claims, but it was too restrictive as a migration rule for older Google/default member nicknames.

V2 separates these concepts:
- historical registry identity: NFKC + trim + Firestore document-ID safety;
- new nickname claim: ROOT strict 2~12 Korean/English/number/underscore rule.

If the 2 historical values canonicalize to safe, unique Firestore document IDs, they can be backfilled without changing the visible/private/public nickname strings. If they collide after canonicalization or are not valid Firestore document IDs, V2 still stops before production mutation.

V2 then passed the legacy-compatible backfill preflight with all 5 users,
`unsafeDocumentIds: 0`, `collisions: 0`, and `blocked: false`. It also reached
`PRIVATE_USERS_LIST_QUERY = 0` and the D9.2 verifier. TypeScript correctly
stopped before production mutation because the generated Settings nickname
flow called `saveRootOnboardingData`, a symbol this screen does not import or
use. The existing Settings screen uses `setRootOnboardingData` for local ROOT
memory updates. V3 changes only that post-transaction local mirror and adds a
verifier guard that rejects any `saveRootOnboardingData` reference in Settings.

V3 then passed the legacy backfill preflight, zero-list-query audit,
D9.2 verifier, TypeScript, Git whitespace check, and all three Rules dry-runs.
Its only stop was the exact changed-file boundary because the three temporary
Firebase CLI config files used for dry-runs were still present in the working
tree. V4 removes those transient configs before both pre-release and
post-activation boundary checks, verifies they are gone, and recreates the
exact deploy/rollback configs only after the pre-release boundary has passed.

## Purpose

- Activate deterministic `rootNicknames/{nickname}` documents.
- Remove the final private `/users` list query used for nickname duplication.
- Preserve ROOT guest local-only behavior.
- Make member nickname claims and renames transaction-based.
- Keep production `/users/{uid}` Stage A compatibility; V1.2D10 self-only remains blocked.

## Registry transaction

For authenticated members, one Firestore transaction:
1. reads the requested nickname document;
2. rejects it if owned by another uid;
3. optionally reads/releases the previous nickname owned by the same uid;
4. writes the new `rootNicknames/{nickname}` record;
5. writes the member `users/{uid}` rootData nickname;
6. writes the member `rootUserPublicProfiles/{uid}` projection.

Guest sessions never enter this transaction.

## Rules

`rootNicknames`:
- signed-in exact document `get` is allowed;
- collection `list` is denied;
- create/update must be atomic with matching `users/{uid}` and `rootUserPublicProfiles/{uid}` nickname state via `getAfter()`;
- delete must be atomic with both owner documents moving away from the released nickname;
- create/update require `uid == request.auth.uid`;
- nickname field must equal document id;
- delete requires the existing owner.

The active production rule is still Stage A for `/users/{uid}` compatibility.
Only the nickname-registry surface is added.

## Production guard

Before any production mutation:
- exact D9.1A Git baseline;
- clean main == origin/main;
- production Rules exact Stage A SHA;
- public-profile verification;
- nickname backfill dry-run;
- legacy-compatible NFKC canonicalization (without rewriting display nicknames);
- Firestore document-ID safety check;
- canonical duplicate/collision check;
- existing registry conflict/extra-doc check;
- Rules production dry-run;
- TypeScript/static/list-query verification;
- transient Firebase CLI config cleanup before boundary;
- exact changed-file boundary.

Production activation requires:
`root-c7949:V1.2D9.2:nickname-registry`

## Backfill

Admin SDK is used only after collision-free dry-run.
Server Admin libraries bypass Firestore client Security Rules, so the backfill script performs its own canonical collision, Firestore document-ID safety, conflict, and extra-document checks.

Historical member nicknames are normalized with NFKC + trim only for the registry identity. They are not rewritten in `users` or public profiles during backfill. New nickname claims still use ROOT's strict 2~12 Korean/English/number/underscore input rule.

Backfill is idempotent when the registry already exactly matches users.

## Failure behavior

If production nickname Rules were released but a later pre-commit step fails:
- production Rules are rolled back to frozen Stage A;
- local pre-commit changes are reset;
- any already-created `rootNicknames` documents are retained, but become inaccessible under the Stage A rollback and are safe for an idempotent retry.

## D9.2 completion gate

- `PRIVATE_USERS_LIST_QUERY = 0`
- registry verification `ok: true`
- TypeScript PASS
- local main == origin/main after commit/push
- production live Rules == D9.2 Stage A + nickname registry candidate

V1.2D10 remains blocked until physical guest/member regression and the ROOT user self-only device diagnostic pass.
