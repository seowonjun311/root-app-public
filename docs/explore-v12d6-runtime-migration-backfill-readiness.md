# ROOT Explore V1.2D6 — runtime migration + backfill readiness

## Baseline

Exact baseline:

`2185c54e1dbad8e0f244176a2de1c0d1ee3d4361`

Production Firestore Rules must remain:

`26530898D2740729CAE75EF125E28E61E9F18678964666B5519A2E7DF6A80944`

Active local V1.2D4 hardened Rules:

`FD74B90DD9FEC2919CA9BB3868116A6A9C3294B23F511F0807FB25BBD5BB059A`

V1.2D5 Stage A candidate:

`5B8666F3DDFA1F3BE438F1BE26CF9E7FD57F30596D9B6A7A011F7C2623768732`

V1.2D5 self-only target:

`28BAB9FCA79E720FF5A0DAEBD008ADA08EED4B884F49D00D6EB0FEF3D1BEFF8A`

## Why V1.2D6 does not wire dual-write yet

The production Rules still do not contain
`rootUserPublicProfiles/{uid}`.

Therefore a mobile/web client write to that collection would currently be
denied by the production catch-all rule.

V1.2D6 prepares the runtime sync adapter but deliberately leaves it unimported
and activation-gated until Stage A has actually been released.

## Prepared client adapter

`store/rootUserPublicProfileSync.ts`

The adapter:

- only builds/syncs the authenticated user's own projection;
- rejects uid mismatch;
- reads public projections separately;
- catches projection write failures;
- declares activation target `V1.2D7_AFTER_STAGE_A_RELEASE`.

No existing runtime file imports it in V1.2D6.

## Prepared Admin backfill

`ops/root-place-admin/backfill-root-user-public-profiles.mjs`

Default mode is DRY_RUN.

It scans top-level user documents with Admin SDK but prints counts only, never
user field values.

The projection contains only the V1.2D5 allowlisted public fields.

Write mode is not used by the installer. Future explicit write mode requires:

```text
--write --confirm root-c7949:rootUserPublicProfiles
```

## Migration audit

`scripts/audit-explore-v12d6-cross-user-userdoc.mjs`

This performs a more conservative full-runtime scan for reads that touch
`/users/{uid}` and classifies each read site as:

- `LIKELY_SELF`
- `POSSIBLE_PUBLIC_PRESENTATION`
- `MANUAL_UID_FLOW_REVIEW`

The generated report is:

`docs/explore-v12d6-userdoc-migration-audit.md`

No `POSSIBLE_PUBLIC_PRESENTATION` or `MANUAL_UID_FLOW_REVIEW` site may be
silently ignored before the self-only target is released.

## Production mutation policy

V1.2D6 performs:

- production Rules read-only hash guard;
- Admin backfill DRY_RUN only;
- TypeScript and security regression verification.

It performs **no**:

- production Security Rules release;
- projection backfill write;
- runtime dual-write activation;
- cross-user read switch.

## Next activation phase

V1.2D7 should be an explicitly separated activation phase:

1. deploy the already-emulator-tested Stage A Rules;
2. verify live Rules hash/source;
3. run confirmed projection backfill;
4. activate own-profile dual-write;
5. migrate confirmed cross-user presentation reads;
6. run physical-device regression;
7. only later consider the self-only private-user target.
