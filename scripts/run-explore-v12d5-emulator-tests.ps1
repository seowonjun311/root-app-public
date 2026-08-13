param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

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

function Get-JavaMajor {
  $lines =
    @(
      & cmd.exe /d /c "java -version 2>&1"
    )

  $exitCode =
    $LASTEXITCODE

  if (
    $exitCode -ne 0
  ) {
    throw 'Java is required for Firestore Emulator.'
  }

  $output =
    (
      $lines |
        Out-String
    )

  $match =
    [regex]::Match(
      $output,
      'version\s+"(?<major>\d+)(?:\.(?<minor>\d+))?'
    )

  if (
    -not $match.Success
  ) {
    throw 'Unable to parse java -version.'
  }

  $major =
    [int]$match.Groups['major'].Value

  if (
    $major -eq 1
  ) {
    $major =
      [int]$match.Groups['minor'].Value
  }

  return $major
}

Write-Section 'ROOT Explore V1.2D5 projection emulator tests'

$javaMajor =
  Get-JavaMajor

if (
  $javaMajor -lt 21
) {
  throw "Java 21 or newer is required. Found Java $javaMajor."
}

Write-Host "PASS - Java $javaMajor available"

firebase emulators:exec `
  --only firestore `
  --project 'demo-root-explore-v12d5' `
  --config .\firebase.json `
  'node ops/root-place-rules-tests/firestore-v12d5-user-projection.test.mjs'

Assert-LastExit 'V1.2D5 Firestore Emulator tests failed.'

Write-Host 'PASS - V1.2D5 Firestore Emulator tests completed'
Write-Host 'SAFE - demo-root-explore-v12d5 used; no production test data was touched'
