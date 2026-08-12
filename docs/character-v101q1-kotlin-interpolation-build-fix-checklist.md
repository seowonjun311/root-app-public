# CHARACTER V101Q1 — Kotlin interpolation build fix

Baseline:
`90bb1254a12d7c0b73f4452307ea0c202f3dabf9`


## Windows PowerShell 5.1 encoding note

The V101Q1 v1-v3 diagnostics used `Get-Content -Raw` without an
explicit encoding. Windows PowerShell 5.1 reads BOM-less string files
using the system default ANSI code page, while this Kotlin source is
UTF-8 without BOM. That can corrupt Korean characters during
diagnostics and falsely report zero malformed tokens.

V101Q1 v4 reads the Kotlin source with `.NET ReadAllText(..., UTF8)`
and writes UTF-8 without BOM explicitly.

## EAS failure reproduced

The V101Q EAS development build reached:

`> Task :root-floating-character:compileDebugKotlin`

and failed on 15 pending/completed string-interpolation references.

The build error reports unresolved identifiers such as `pending개`,
`pending개는`, and `completed개`. These can originate from either
unbraced forms such as `$pending개` or malformed braced forms such as
`${pending개}`.

## Fix

V101Q1 detects both forms and moves Korean counters/particles outside
the Kotlin variable expression, for example:

- `$pending개` or `${pending개}` → `${pending}개`
- `$pending개는` or `${pending개는}` → `${pending}개는`
- `$completed개` or `${completed개}` → `${completed}개`

No behavior probability, speech wording, native permission,
foreground-service policy, Home handoff, recovery state, geometry,
character asset, or AndroidManifest contract changes.

## Validation

- [ ] V101Q1 verifier passes
- [ ] existing V101P verifier passes after the interpolation-only verifier
- [ ] character asset verifier passes
- [ ] TypeScript passes
- [ ] Expo Android autolinking resolves
- [ ] git diff --check passes
- [ ] exact changed-file count is 3
- [ ] AndroidManifest untouched
- [ ] native bridge untouched
- [ ] character PNGs untouched

## Next EAS build

Run after V101Q1 commit/push:

`eas build --platform android --profile development --clear-cache`

The Expo Doctor non-CNG/app-config warning is not the Kotlin build
failure. ROOT currently keeps its Android native project and custom
native code, so `/android` must not be casually excluded from EAS.