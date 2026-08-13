param(
  [string]$ProjectId = 'root-c7949'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ExpectedCurrentSha =
  '26530898D2740729CAE75EF125E28E61E9F18678964666B5519A2E7DF6A80944'

$ExpectedCandidateSha =
  '5CD42FD91B09AAD9F91EC02052C7FF7A53369C2683D396EF4242046A9846111B'

function Write-Section(
  [string]$Title
) {
  Write-Host ''
  Write-Host ('===== ' + $Title + ' =====')
}

function Assert-LastExit(
  [string]$Message
) {
  if (
    $LASTEXITCODE -ne 0
  ) {
    throw $Message
  }
}

function Get-UpperSha(
  [string]$Path
) {
  return (
    Get-FileHash `
      -Algorithm SHA256 `
      -LiteralPath $Path
  ).Hash.ToUpperInvariant()
}

Write-Section 'ROOT Explore V1.2D3 Firestore rules dry-run verification'

if (
  -not $env:GOOGLE_APPLICATION_CREDENTIALS
) {
  throw 'GOOGLE_APPLICATION_CREDENTIALS is not set.'
}

if (
  -not (
    Test-Path `
      -LiteralPath `
      $env:GOOGLE_APPLICATION_CREDENTIALS
  )
) {
  throw 'GOOGLE_APPLICATION_CREDENTIALS points to a missing file.'
}

foreach (
  $requiredPath in @(
    '.\firestore.rules',
    '.\firebase.json',
    '.\ops\root-place-admin\export-current-firestore-rules.mjs'
  )
) {
  if (
    -not (
      Test-Path `
        -LiteralPath `
        $requiredPath
    )
  ) {
    throw "Missing required file: $requiredPath"
  }
}

$localCandidateSha =
  Get-UpperSha `
    '.\firestore.rules'

if (
  $localCandidateSha -ne
  $ExpectedCandidateSha
) {
  throw (
    'Local firestore.rules hash mismatch. Expected ' +
    $ExpectedCandidateSha +
    ' but found ' +
    $localCandidateSha
  )
}

Write-Host 'PASS - Local candidate SHA256 matches reviewed candidate'

$timestamp =
  Get-Date `
    -Format 'yyyyMMdd-HHmmss'

$verifyDir =
  Join-Path `
    '.\tmp\firebase-live-rules' `
    ('v12d3-dry-run-' + $timestamp)

New-Item `
  -ItemType Directory `
  -Path $verifyDir `
  -Force |
  Out-Null

$beforePath =
  Join-Path `
    $verifyDir `
    'firestore.rules.before'

$afterPath =
  Join-Path `
    $verifyDir `
    'firestore.rules.after'

Write-Section 'Re-export live rules before dry-run'

node `
  '.\ops\root-place-admin\export-current-firestore-rules.mjs' `
  --project `
  $ProjectId `
  --output `
  $beforePath

Assert-LastExit 'Live Firestore rules export before dry-run failed.'

$beforeSha =
  Get-UpperSha `
    $beforePath

if (
  $beforeSha -ne
  $ExpectedCurrentSha
) {
  throw (
    'LIVE RULES CHANGED since the approved capture. Expected ' +
    $ExpectedCurrentSha +
    ' but found ' +
    $beforeSha +
    '. Stop and re-review current rules.'
  )
}

Write-Host 'PASS - Live rules still match reviewed current SHA256'

Write-Section 'Firebase CLI dry-run'

firebase deploy `
  --only 'firestore:rules' `
  --project $ProjectId `
  --dry-run

Assert-LastExit 'Firebase Firestore rules dry-run failed.'

Write-Host 'PASS - Firebase CLI Firestore rules dry-run'

Write-Section 'Re-export live rules after dry-run'

node `
  '.\ops\root-place-admin\export-current-firestore-rules.mjs' `
  --project `
  $ProjectId `
  --output `
  $afterPath

Assert-LastExit 'Live Firestore rules export after dry-run failed.'

$afterSha =
  Get-UpperSha `
    $afterPath

if (
  $afterSha -ne
  $ExpectedCurrentSha
) {
  throw (
    'Unexpected live rules change detected after dry-run. Expected ' +
    $ExpectedCurrentSha +
    ' but found ' +
    $afterSha
  )
}

if (
  $afterSha -ne
  $beforeSha
) {
  throw 'Live rules hash changed across dry-run.'
}

Write-Host 'PASS - Live rules unchanged after dry-run'
Write-Host "LIVE SHA256 - $afterSha"
Write-Host "CANDIDATE SHA256 - $localCandidateSha"
Write-Host 'SAFE - No production Firestore rules release was performed.'
Write-Host 'BLOCKED - Do not run a non-dry-run deploy yet; V1.2D4 access/emulator audit comes first.'
