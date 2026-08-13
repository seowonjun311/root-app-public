# ROOT Explore V1.2D9.1A — Guest Scope 전수 통합

## Baseline

- Exact V1.2D9.1 commit: `700dae8b5a714cac6c5efcda163d230c19378732`
- Production Firestore Rules: Stage A unchanged
- V1.2D10: still blocked

## Why this stage exists

The V1.2D9.1 physical guest test proved the onboarding and saved-cafe
boundaries worked even while Firebase Auth still exposed an old member UID.

V1, V2, and V3 of the D9.1A installer all rolled back safely before commit.
The runtime guest-scope policy was valid, but each version unnecessarily tried
to locate a later ROOT-session-save shape inside `app/login.tsx`.

The V3 diagnostic proved the current source does not match that assumed login
shape (`handlerMatches: 0`, while the whole file contains three `finalData`
saves). V4 correctly removed that dependency and successfully patched the
existing V98D guest-to-Google handoff.

V4 then stopped at Home because the patcher still tried to parse individual
Home callbacks. V5 broadened the auth expression, but the same callback parser
still failed before it could reach the multiline current-user declaration.

V6 removes individual Home callback parsing completely. Every direct
`firebaseAuth.currentUser` / `auth().currentUser` lookup in Home is routed
through one `getRootEffectiveHomeFirebaseUser()` helper. That helper returns
`null` for ROOT guest sessions and returns the real Firebase User only when its
UID matches the ROOT effective cloud UID.

V6 successfully completed Character, Google handoff, Home, rootMemory, and
Daily hardening, then rolled back safely when the old Exploration callback
parser failed at `persistLocalExplorationData`. V7 removes Exploration
callback parsing too. The entire `explorationCloud.ts` module now routes direct
Firebase current-user access through one
`getRootEffectiveExplorationFirebaseUser()` helper.

V7 then successfully completed Exploration centralization (`after: 1`,
`outsideHelper: 0`) and rolled back safely at Media Backup because that step
still used the old callback parser. V8 removed that parser but its preflight
still assumed exactly one Media Backup current-user declaration; the live
baseline reported two. V9 stops assuming a count and centralizes the entire
`mediaBackup.ts` current-user surface behind one
`getRootEffectiveMediaBackupFirebaseUser()` helper. Place Community remains a
direct patch at the existing V1.2D8 self-only `authUid` assertion.

V9 then completed all previously targeted runtime patches and reached the first
whole-runtime audit. That audit found one structural contract failure plus 15
unreviewed auth occurrences. The structural failure was rootMemory: three
whitespace-formatted `firebaseAuth .currentUser` reads were not caught by the
old exact-string replacement. V10 makes rootMemory whitespace-robust, fully
centralizes Daily and remaining Place Community account identity, and adds
Guest Scope boundaries to action/result goals, character growth rewards, and
saved-cafe integrity repair. Settings and V51 saved-cafe diagnostics keep their
real Firebase Auth reads intentionally, but only behind exact-count + contract
review gates so future new auth reads block the audit.

V10 then passed the full stale-auth audit with `missing hardened contracts: 0`
and `unreviewed stale-auth risks: 0`, and passed the D9/D9.1 regression
verifiers. TypeScript correctly caught one installer bug in `app/login.tsx`:
the old cross-import regex inserted
`getAuthenticatedCharacterAccountScopeSnapshot` into
`@react-native-firebase/app`. V11 removes import-brace merging entirely, adds a
dedicated import from `../store/characterAccountScope`, and adds a verifier gate
that rejects the Firebase App import provenance before TypeScript.

V11 then passed the full stale-auth audit, all D9/D9.1 regressions, and
TypeScript. Its only stop was the exact changed-file boundary: the existing
V1.2D9.1 private-users-list audit script legitimately refreshes
`docs/explore-v12d91-private-users-list-query-audit.md`, so the working tree had
18 files instead of the configured 17. V12 explicitly backs up, expects, stages,
and commits that refreshed audit report. No runtime behavior changes were added
relative to V11.

The same log also showed two stale-auth leaks:

- Character account scope was classified as a user scope.
- Home exploration main badge attempted a server load.

A broader source review found the same direct Firebase-auth identity pattern in
Daily cloud sync, Exploration cloud sync, media backup, rootMemory cloud
operations, and place-community self assertions.

## V1.2D9.1A policy

ROOT local session identity is authoritative for ordinary ROOT data ownership.

When ROOT local state is guest:

```text
loginType = guest
or
isGuest = true
```

ordinary cloud/account-scoped systems must behave as guest/local-only even when
`FirebaseAuth.currentUser` is temporarily non-null.

Firebase Auth may still be used in explicit authentication, token acquisition,
moderation-control, or authenticated-self verification code, but it must not
silently choose the ROOT data owner.

## Hardened surfaces

- Character account scope
- Guest -> Google character handoff compatibility
- Home entire Firebase-current-user ownership surface via one effective-user helper
  - exploration main badge
  - completed-record save
  - general ROOT-data save
  - own-village route identity
- rootMemory cloud/account operations
- Daily cloud sync
- Exploration entire Firebase-current-user surface via one effective-user helper
  - local exploration persistence
  - authenticated uid guard
  - confirmed cloud sync
  - travel-journal server confirmation
- Media backup entire Firebase-current-user surface via one effective-user helper
- Place community V1.2D8 self-only assertion + remaining account identity
- Action-goal and result-goal cloud ownership
- Character growth ROOT-point reward ownership
- Saved-cafe integrity repair ownership
- Settings real-auth account-control reads: reviewed, exact count locked
- Saved-cafe V51 diagnostic real-auth reads: reviewed, exact count locked
- Saved cafe five-store boundary retained from V1.2D9.1
- Refreshed V1.2D9.1 private-users-list audit report included in exact commit boundary

## Physical guest test

After installation, log out and enter as guest again.

Expected:

```text
[CHARACTER V98] account scope changed
kind: guest
```

Expected main badge behavior:

```text
HOME EXPLORATION MAIN BADGE SERVER SKIPPED: ROOT GUEST OR NO CLOUD USER
```

Expected saved cafe:

```text
SAVED CAFE SYNC LOCAL ONLY
```

Expected exploration if a background sync is triggered:

```text
EXPLORATION SYNC LOCAL ONLY: ROOT GUEST OR NO CLOUD USER
```

Do not expect member UID cloud loads/writes while ROOT is guest.

Then restart the app once and repeat the check.

## Google handoff regression

After guest testing, Google login must still be able to migrate the guest
character bundle. V1.2D9.1A uses an explicit authenticated character scope only
for the existing V98D migration handoff. Normal character scope remains
guest-aware; after ROOT local state is committed as the member account, the
destination screen's normal scope refresh resolves the authenticated user.

## Remaining blocker

Authenticated onboarding still contains the single known `/users` collection
nickname query.

V1.2D9.2 remains next:

- activate `rootNicknames` Rules;
- preflight/backfill existing member nicknames;
- migrate authenticated nickname lookup;
- require private `/users` list queries = 0;
- repeat member device diagnostics.

Only then should V1.2D10 production self-only Rules release be considered.
