param(
    [ValidateSet('setup', 'migrate', 'run', 'test', 'check', 'audit')]
    [string]$Action = 'run'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot '.venv\Scripts\python.exe'
Set-Location -LiteralPath $projectRoot

function Invoke-ProjectPython {
    & $python @args
    if ($LASTEXITCODE -ne 0) { throw "Python command failed (exit $LASTEXITCODE)." }
}

if ($Action -eq 'setup') {
    if (-not (Test-Path -LiteralPath $python)) {
        & python -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the project virtual environment.' }
    }
    Invoke-ProjectPython -m pip install -r backend/requirements.lock
} else {
    if (-not (Test-Path -LiteralPath $python)) { throw 'Run scripts/backend.ps1 setup first.' }
    switch ($Action) {
        'migrate' { Invoke-ProjectPython -m alembic -c backend/alembic.ini upgrade head }
        'run' { Invoke-ProjectPython -m uvicorn app.main:create_app --factory --app-dir backend --host 127.0.0.1 --port 8000 }
        'test' { Invoke-ProjectPython -m pytest -c backend/pyproject.toml backend/tests -q }
        'check' {
            Invoke-ProjectPython -m ruff check backend
            Invoke-ProjectPython -m ruff format --check backend
            Invoke-ProjectPython -m pip check
        }
        'audit' { Invoke-ProjectPython -m pip_audit }
    }
}
