param(
    [ValidateSet('setup', 'run', 'test', 'browser', 'check')]
    [string]$Action = 'run'
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path (Split-Path -Parent $PSScriptRoot) 'frontend')
function Invoke-Frontend {
    & npm.cmd @args
    if ($LASTEXITCODE -ne 0) { throw "Frontend command failed (exit $LASTEXITCODE)." }
}
switch ($Action) {
    'setup' { Invoke-Frontend ci }
    'run' { Invoke-Frontend run dev }
    'test' { Invoke-Frontend run test:run }
    'browser' { Invoke-Frontend run test:e2e }
    'check' {
        Invoke-Frontend run lint
        Invoke-Frontend run format:check
        Invoke-Frontend run build
        Invoke-Frontend audit
    }
}
