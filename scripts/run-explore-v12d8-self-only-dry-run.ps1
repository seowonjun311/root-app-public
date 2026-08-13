param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$tempConfig =
  '.firebase-v12d8-self-only-dry-run.json'

try {
  [System.IO.File]::WriteAllText(
    $tempConfig,
    "{
  `"firestore`": {
    `"rules`": `"firebase/firestore-v12d5-self-only-target.rules`"
  }
}
",
    [System.Text.UTF8Encoding]::new(
      $false
    )
  )

  Write-Host ''
  Write-Host '===== ROOT Explore V1.2D8 self-only target DRY RUN ====='

  firebase deploy `
    --only 'firestore:rules' `
    --project 'root-c7949' `
    --config $tempConfig `
    --dry-run

  if (
    $LASTEXITCODE -ne
    0
  ) {
    throw 'V1.2D8 self-only Rules dry-run failed.'
  }

  Write-Host 'PASS - self-only target compiled in production-safe dry-run mode'
  Write-Host 'SAFE - production Stage A remains live; no Rules release was performed'
}
finally {
  if (
    Test-Path `
      -LiteralPath `
      $tempConfig
  ) {
    Remove-Item `
      -LiteralPath `
      $tempConfig `
      -Force `
      -ErrorAction SilentlyContinue
  }
}
