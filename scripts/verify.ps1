$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot
try {
    # Both suites use the guarded disposable database, so keep them sequential.
    & (Join-Path $PSScriptRoot 'backend.ps1') test
    & (Join-Path $PSScriptRoot 'backend.ps1') check
    & (Join-Path $PSScriptRoot 'backend.ps1') audit
    & (Join-Path $PSScriptRoot 'frontend.ps1') test
    & (Join-Path $PSScriptRoot 'frontend.ps1') check
    & (Join-Path $PSScriptRoot 'frontend.ps1') browser
    Write-Output 'LeadFlow local verification passed. Production and other browsers remain unverified.'
} finally {
    Pop-Location
}
