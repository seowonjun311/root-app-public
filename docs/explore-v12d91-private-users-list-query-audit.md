# ROOT Explore V1.2D9.1 — private users list-query audit

- Runtime files scanned: 180
- Private users collection/list query sites: 1
- Known onboarding nickname migration blockers: 1
- Unexpected private users list queries: 0

- `app/onboarding.tsx:277` — **NAMESPACED_USERS_COLLECTION_QUERY**

## Decision

- **PASS D9.1:** exactly one known list-query blocker remains: authenticated onboarding nickname duplicate lookup.
- **BLOCKED D10:** migrate that lookup to `rootNicknames/{nickname}` in V1.2D9.2 before self-only release.
- Guest onboarding skips the query because its cloud uid is forced to `null`.
