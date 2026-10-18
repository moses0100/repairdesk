$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$repairPhp = $env:REPAIRDESK_PHP
if (-not $repairPhp) {
    $portablePhp = Join-Path (Get-Location) '../portfolio-publish/tools/php84/php.exe'
    if (Test-Path -LiteralPath $portablePhp) { $repairPhp = (Resolve-Path -LiteralPath $portablePhp).Path }
    else { $repairPhp = (Get-Command php -ErrorAction Stop).Source }
}
& $repairPhp -r 'exit(PHP_VERSION_ID >= 80400 ? 0 : 1);'
if ($LASTEXITCODE -ne 0) { throw 'PHP 8.4+ required. Set REPAIRDESK_PHP to its full executable path.' }
& $repairPhp artisan serve --host=127.0.0.1 --port=8005
