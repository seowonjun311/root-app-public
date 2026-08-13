param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Write-Host ''
Write-Host '===== ROOT Explore V1.2D6 projection backfill DRY RUN ====='

if (
  -not $env:GOOGLE_APPLICATION_CREDENTIALS -or
  -not (
    Test-Path `
      -LiteralPath `
      $env:GOOGLE_APPLICATION_CREDENTIALS
  )
) {
  throw 'GOOGLE_APPLICATION_CREDENTIALS is missing or invalid.'
}

node `
  '.\ops\root-place-admin\backfill-root-user-public-profiles.mjs' `
  --project `
  'root-c7949' `
  --max-docs `
  '10000'

if (
  $LASTEXITCODE -ne 0
) {
  throw 'V1.2D6 projection backfill dry-run failed.'
}

Write-Host 'PASS - V1.2D6 backfill dry-run completed'
Write-Host 'SAFE - no projection documents were written'
Write-Host 'BLOCKED - write mode requires explicit --write plus --confirm root-c7949:rootUserPublicProfiles'
