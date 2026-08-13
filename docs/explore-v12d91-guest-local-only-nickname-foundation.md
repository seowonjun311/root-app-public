# ROOT Explore V1.2D9.1 — Guest Local-Only Boundary + Nickname Registry Foundation

Baseline: `14c4e8837de5599f5e9188448c2f992fc753e7cf`

This step does not deploy production Security Rules.

Guest session rule:
- local ROOT `loginType === "guest"` or `isGuest === true` forces cloud uid to `null`;
- guest nickname duplicate lookup is skipped;
- guest onboarding Firestore user save is skipped;
- saved-cafe sync remains local-only even if Firebase Auth temporarily exposes a uid.

Expected guest logs:
- `NICKNAME DUPLICATE CHECK SKIPPED GUEST LOCAL ONLY`
- `SAVED CAFE SYNC LOCAL ONLY`

Nickname registry foundation:
- `store/rootNicknameRegistry.ts`
- `firebase/firestore-v12d91-stage-a-with-nickname-registry.rules`
- `firebase/firestore-v12d91-self-only-with-nickname-registry.rules`

These are inactive in V1.2D9.1.

The list-query audit must find exactly one known blocker:
authenticated onboarding still queries the private `users` collection for nickname duplication.
That is migrated in V1.2D9.2.

Device test:
1. Guest login.
2. Finish nickname.
3. No nickname timeout popup.
4. Open saved cafes.
5. No `SAVED_CAFE_FIRESTORE_READ_TIMEOUT`.
6. Restart app and confirm guest remains local-only.

Next: V1.2D9.2 nickname registry activation/backfill/migration, then require zero private-users list queries before V1.2D10.
