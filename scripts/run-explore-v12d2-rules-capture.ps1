param(
  [string]$ProjectId = 'root-c7949'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Section(
  [string]$Title
) {
  Write-Host ''
  Write-Host ('===== ' + $Title + ' =====')
}

Write-Section 'ROOT Explore V1.2D2 current Firestore rules capture'

if (
  -not $env:GOOGLE_APPLICATION_CREDENTIALS
) {
  throw (
    'GOOGLE_APPLICATION_CREDENTIALS is not set. ' +
    'Point it to a service-account JSON outside the repository before running this capture.'
  )
}

if (
  -not (
    Test-Path `
      -LiteralPath `
      $env:GOOGLE_APPLICATION_CREDENTIALS
  )
) {
  throw (
    'GOOGLE_APPLICATION_CREDENTIALS points to a file that does not exist: ' +
    $env:GOOGLE_APPLICATION_CREDENTIALS
  )
}

$opsDir =
  'ops/root-place-admin'

if (
  -not (
    Test-Path `
      -LiteralPath `
      (Join-Path $opsDir 'node_modules/firebase-admin/package.json')
  )
) {
  Write-Section 'Install isolated Firebase Admin dependency'

  npm `
    --prefix `
    $opsDir `
    install `
    --ignore-scripts `
    --no-package-lock

  if (
    $LASTEXITCODE -ne 0
  ) {
    throw 'npm install for ops/root-place-admin failed.'
  }

  Write-Host 'PASS - Firebase Admin dependency installed'
}

$timestamp =
  Get-Date `
    -Format 'yyyyMMdd-HHmmss'

$outputDir =
  Join-Path `
    'tmp/firebase-live-rules' `
    $timestamp

New-Item `
  -ItemType Directory `
  -Path $outputDir `
  -Force |
  Out-Null

$currentPath =
  Join-Path `
    $outputDir `
    'firestore.rules.current'

$candidatePath =
  Join-Path `
    $outputDir `
    'firestore.rules.candidate'

Write-Section 'Export current deployed Firestore rules'

node `
  '.\ops\root-place-admin\export-current-firestore-rules.mjs' `
  --project `
  $ProjectId `
  --output `
  $currentPath

if (
  $LASTEXITCODE -ne 0
) {
  throw 'Current Firestore rules export failed.'
}

Write-Section 'Prepare local moderation candidate'

node `
  '.\ops\root-place-admin\prepare-firestore-rules-candidate.mjs' `
  --current `
  $currentPath `
  --fragment `
  '.\firebase\root-place-moderation.rules.fragment' `
  --output `
  $candidatePath

if (
  $LASTEXITCODE -ne 0
) {
  throw 'Firestore rules candidate preparation failed.'
}

$currentHash =
  (
    Get-FileHash `
      -Algorithm SHA256 `
      -LiteralPath $currentPath
  ).Hash

$candidateHash =
  (
    Get-FileHash `
      -Algorithm SHA256 `
      -LiteralPath $candidatePath
  ).Hash

Write-Section 'Capture completed'

Write-Host "PASS - Live rules backup: $currentPath"
Write-Host "PASS - Candidate rules: $candidatePath"
Write-Host "CURRENT SHA256 - $currentHash"
Write-Host "CANDIDATE SHA256 - $candidateHash"
Write-Host 'SAFE - No Firebase rules were deployed.'
Write-Host 'NEXT - Review/diff these two files before creating firestore.rules or firebase.json.'
