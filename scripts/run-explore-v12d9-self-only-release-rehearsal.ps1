param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ExpectedStageASha = '5B8666F3DDFA1F3BE438F1BE26CF9E7FD57F30596D9B6A7A011F7C2623768732'
$ExpectedSelfOnlySha = '28BAB9FCA79E720FF5A0DAEBD008ADA08EED4B884F49D00D6EB0FEF3D1BEFF8A'

function Get-UpperSha([string]$Path) {
  return (
    Get-FileHash `
      -Algorithm SHA256 `
      -LiteralPath $Path
  ).Hash.ToUpperInvariant()
}

function Get-NormalizedLfUpperSha([string]$Path) {
  $content =
    [System.IO.File]::ReadAllText(
      (Resolve-Path -LiteralPath $Path).Path,
      [System.Text.Encoding]::UTF8
    )

  $lf =
    $content.Replace(
      "`r`n",
      "`n"
    ).Replace(
      "`r",
      "`n"
    )

  $bytes =
    [System.Text.UTF8Encoding]::new($false).GetBytes($lf)

  $sha =
    [System.Security.Cryptography.SHA256]::Create()

  try {
    return (
      (
        $sha.ComputeHash($bytes) |
          ForEach-Object {
            $_.ToString('X2')
          }
      ) -join ''
    )
  }
  finally {
    $sha.Dispose()
  }
}

function Assert-LastExit([string]$Message) {
  if ($LASTEXITCODE -ne 0) {
    throw $Message
  }
}

$tempCandidateConfig =
  '.firebase-v12d9-v2-self-only-rehearsal.json'

$tempRollbackConfig =
  '.firebase-v12d9-v2-stage-a-rollback-rehearsal.json'

$guardDir =
  Join-Path `
    '.\tmp\firebase-live-rules' `
    ('v12d9-v2-rehearsal-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))

New-Item `
  -ItemType Directory `
  -Path $guardDir `
  -Force |
  Out-Null

$liveBefore =
  Join-Path `
    $guardDir `
    'firestore.rules.live-stage-a'

try {
  Write-Host ''
  Write-Host '===== ROOT Explore V1.2D9 v2 self-only release REHEARSAL ====='

  if (
    -not $env:GOOGLE_APPLICATION_CREDENTIALS -or
    -not (Test-Path -LiteralPath $env:GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    throw 'GOOGLE_APPLICATION_CREDENTIALS is missing or invalid.'
  }

  if (
    (Get-NormalizedLfUpperSha 'firebase/firestore-v12d9-self-only-release-candidate.rules') -ne
    $ExpectedSelfOnlySha
  ) {
    throw 'Self-only release candidate SHA mismatch.'
  }

  if (
    (Get-NormalizedLfUpperSha 'firebase/firestore-v12d9-stage-a-rollback.rules') -ne
    $ExpectedStageASha
  ) {
    throw 'Stage A rollback source SHA mismatch.'
  }

  node `
    '.\ops\root-place-admin\export-current-firestore-rules.mjs' `
    --project 'root-c7949' `
    --output $liveBefore

  Assert-LastExit 'Live production Rules export failed.'

  if (
    (Get-UpperSha $liveBefore) -ne
    $ExpectedStageASha
  ) {
    throw 'Production is not exact Stage A before rehearsal.'
  }

  Write-Host 'PASS - production is exact Stage A before rehearsal'

  & '.\scripts\run-explore-v12d5-emulator-tests.ps1'
  Assert-LastExit 'Stage A/self-only Emulator suite failed.'

  [System.IO.File]::WriteAllText(
    $tempCandidateConfig,
    "{
  `"firestore`": {
    `"rules`": `"firebase/firestore-v12d9-self-only-release-candidate.rules`"
  }
}
",
    [System.Text.UTF8Encoding]::new($false)
  )

  firebase deploy `
    --only 'firestore:rules' `
    --project 'root-c7949' `
    --config $tempCandidateConfig `
    --dry-run

  Assert-LastExit 'Self-only candidate dry-run failed.'
  Write-Host 'PASS - self-only candidate production-safe dry-run compiled'

  [System.IO.File]::WriteAllText(
    $tempRollbackConfig,
    "{
  `"firestore`": {
    `"rules`": `"firebase/firestore-v12d9-stage-a-rollback.rules`"
  }
}
",
    [System.Text.UTF8Encoding]::new($false)
  )

  firebase deploy `
    --only 'firestore:rules' `
    --project 'root-c7949' `
    --config $tempRollbackConfig `
    --dry-run

  Assert-LastExit 'Stage A rollback dry-run failed.'
  Write-Host 'PASS - Stage A rollback production-safe dry-run compiled'

  node `
    '.\ops\root-place-admin\verify-root-user-public-profiles.mjs' `
    --project 'root-c7949' `
    --report (Join-Path $guardDir 'projection-rehearsal.json')

  Assert-LastExit 'Public profile projection verification failed.'

  Write-Host 'PASS - production public-profile projections remain complete and allowlisted'
  Write-Host 'SAFE - no production Rules release was performed'
  Write-Host 'SAFE - current production Rules remain Stage A'
  Write-Host 'DEVICE GATE - physical-device diagnostic must be confirmed before V1.2D10'
}
finally {
  foreach (
    $path in @(
      $tempCandidateConfig,
      $tempRollbackConfig,
      'firestore-debug.log',
      'firebase-debug.log'
    )
  ) {
    if (Test-Path -LiteralPath $path) {
      $tracked =
        @(git ls-files -- $path | Where-Object { $_ })

      if ($tracked.Count -eq 0) {
        Remove-Item `
          -LiteralPath $path `
          -Force `
          -ErrorAction SilentlyContinue
      }
    }
  }
}
