param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$DemoProject =
  'demo-root-explore-v12d4'

$OpsDir =
  '.\ops\root-place-rules-tests'

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

Write-Section 'ROOT Explore V1.2D4 Firestore Emulator tests'

$firebaseVersion =
  (
    firebase --version
  ).Trim()

Assert-LastExit 'Firebase CLI is required for V1.2D4 emulator tests.'

Write-Host "PASS - Firebase CLI $firebaseVersion"

# Windows PowerShell 5.1 compatibility: java -version writes its normal
# version banner to STDERR. Capture it through cmd.exe so ErrorActionPreference
# does not turn a successful Java command into NativeCommandError.
$javaLines =
  @(
    & cmd.exe /d /c "java -version 2>&1"
  )

$javaExitCode =
  $LASTEXITCODE

$javaOutput =
  (
    $javaLines |
      Out-String
  )

if (
  $javaExitCode -ne 0
) {
  throw 'Java JDK is required for the Firestore Emulator.'
}

$javaMatch =
  [regex]::Match(
    $javaOutput,
    'version\s+"(?<major>\d+)(?:\.(?<minor>\d+))?'
  )

if (
  -not $javaMatch.Success
) {
  throw (
    'Unable to determine Java version. Output: ' +
    $javaOutput.Trim()
  )
}

$javaMajor =
  [int]$javaMatch.Groups['major'].Value

if (
  $javaMajor -eq 1
) {
  $javaMajor =
    [int]$javaMatch.Groups['minor'].Value
}

if (
  $javaMajor -lt 21
) {
  throw "Firebase CLI Firestore Emulator requires Java 21 or newer. Found Java $javaMajor."
}

Write-Host "PASS - Java $javaMajor available for Firestore Emulator"

if (
  -not (
    Test-Path `
      -LiteralPath `
      (Join-Path $OpsDir 'node_modules\@firebase\rules-unit-testing')
  )
) {
  Write-Section 'Install isolated rules-test dependencies'

  npm `
    --prefix $OpsDir `
    install `
    --ignore-scripts `
    --no-package-lock `
    --no-audit `
    --no-fund

  Assert-LastExit 'Rules-test dependency installation failed.'
}

Write-Section 'Execute Firestore emulator tests with demo project'

firebase `
  emulators:exec `
  --only firestore `
  --project $DemoProject `
  --config .\firebase.json `
  'node ops/root-place-rules-tests/firestore-rules.test.mjs'

Assert-LastExit 'Firestore Emulator rule tests failed.'

Write-Host 'PASS - Firestore Emulator tests completed'
Write-Host 'SAFE - demo- project ID used; no production Firestore test data was touched'
