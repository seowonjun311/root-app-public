$ErrorActionPreference = 'Stop'

function Assert-LastExit([string]$Message) {
  if ($LASTEXITCODE -ne 0) {
    throw $Message
  }
}

Write-Host ''
Write-Host '===== CHARACTER V94 PC PREFLIGHT ====='

Write-Host ''
Write-Host '===== Git ====='

$branch =
  (git branch --show-current).Trim()

if ($branch -ne 'main') {
  throw "Expected main branch, found: $branch"
}

git fetch origin main
Assert-LastExit 'git fetch failed.'

$local =
  (git rev-parse HEAD).Trim()

$origin =
  (git rev-parse origin/main).Trim()

Write-Host "Local : $local"
Write-Host "Origin: $origin"

if ($local -ne $origin) {
  throw 'Local main and origin/main do not match.'
}

if ((git status --porcelain -uall).Count -ne 0) {
  throw 'Working tree is not clean.'
}

Write-Host 'PASS - Git clean and synchronized'

Write-Host ''
Write-Host '===== Asset contracts ====='

npm run verify:character-assets
Assert-LastExit 'Character asset validation failed.'

Write-Host 'PASS - Asset contracts'

Write-Host ''
Write-Host '===== Source integration ====='

node scripts/verify-character-v94-integration.mjs
Assert-LastExit 'V94 source integration verifier failed.'

Write-Host 'PASS - Source integration'

Write-Host ''
Write-Host '===== TypeScript ====='

npx tsc --noEmit --pretty false
Assert-LastExit 'TypeScript check failed.'

Write-Host 'PASS - TypeScript'

Write-Host ''
Write-Host '===== Git whitespace ====='

git diff --check
Assert-LastExit 'Git whitespace check failed.'

Write-Host 'PASS - Git whitespace'

Write-Host ''
Write-Host '===== CHARACTER V94 PC PREFLIGHT PASS ====='
Write-Host 'NEXT - Complete docs/character-v94-seven-character-device-validation-checklist.md on the phone.'
