param(
    [ValidateSet('start', 'stop', 'status')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $projectRoot '.local\postgres'
$logPath = Join-Path $projectRoot '.local\postgres.log'
$pgCtl = (Get-Command pg_ctl -ErrorAction Stop).Source
$initDb = (Get-Command initdb -ErrorAction Stop).Source
$psql = (Get-Command psql -ErrorAction Stop).Source
$port = 55433

# This cluster trusts loopback clients. It is exclusively for local demo work.
if ($Action -eq 'start') {
    if (-not (Test-Path -LiteralPath (Join-Path $dataPath 'PG_VERSION'))) {
        if (Test-Path -LiteralPath $dataPath) {
            throw 'An unrecognized data directory already exists. Inspect it manually; nothing was removed.'
        }
        New-Item -ItemType Directory -Path (Split-Path -Parent $dataPath) -Force | Out-Null
        & $initDb -D $dataPath -U leadflow_local --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=C
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL initialization failed.' }
        Add-Content -LiteralPath (Join-Path $dataPath 'postgresql.conf') -Value "`nlisten_addresses = '127.0.0.1'`nport = $port"
    }
    & $pgCtl -D $dataPath status *> $null
    if ($LASTEXITCODE -ne 0) {
        & $pgCtl -D $dataPath -l $logPath -w start
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed. Inspect .local/postgres.log.' }
    }
    foreach ($database in @('leadflow', 'leadflow_test')) {
        $exists = & $psql -X -w -h 127.0.0.1 -p $port -U leadflow_local -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$database'"
        if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the project cluster.' }
        if ($exists -ne '1') {
            & $psql -X -w -h 127.0.0.1 -p $port -U leadflow_local -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $database"
            if ($LASTEXITCODE -ne 0) { throw "Could not create $database." }
        }
    }
    $environmentPath = Join-Path $projectRoot '.env'
    if (-not (Test-Path -LiteralPath $environmentPath)) {
        @'
DATABASE_URL=postgresql+psycopg://leadflow_local@127.0.0.1:55433/leadflow
TEST_DATABASE_URL=postgresql+psycopg://leadflow_local@127.0.0.1:55433/leadflow_test
FRONTEND_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
SESSION_TTL_HOURS=24
'@ | Set-Content -LiteralPath $environmentPath -Encoding ascii
    }
    Write-Output 'LeadFlow PostgreSQL is ready at 127.0.0.1:55433. Local trust authentication; do not expose this port.'
} elseif ($Action -eq 'stop') {
    if (-not (Test-Path -LiteralPath (Join-Path $dataPath 'PG_VERSION'))) {
        Write-Output 'Project cluster has not been initialized.'
        exit 0
    }
    & $pgCtl -D $dataPath status *> $null
    if ($LASTEXITCODE -eq 0) {
        & $pgCtl -D $dataPath -m fast -w stop
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL shutdown failed.' }
    } else {
        Write-Output 'Project cluster is already stopped.'
    }
} else {
    if (-not (Test-Path -LiteralPath (Join-Path $dataPath 'PG_VERSION'))) {
        Write-Output 'Project cluster has not been initialized.'
        exit 0
    }
    & $pgCtl -D $dataPath status
    if ($LASTEXITCODE -ne 0) { exit 1 }
}
