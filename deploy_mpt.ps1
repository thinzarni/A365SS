<#
.SYNOPSIS
Deploys the A365SS web application to the remote server.

.DESCRIPTION
This script builds the React project locally with the MPT flavor (VITE_APP_ENV=mpt, IP-based URLs)
using '.env.mpt', then securely copies only the required files to the server using SCP.
Finally, it uses SSH to restart NGINX on the server so the new files go live.
#>

$ErrorActionPreference = "Stop"

# ==========================================
# CONFIGURATION - CHANGE THESE BEFORE RUNNING
# ==========================================
$SERVER_USER  = "root"
$SERVER_IP    = "10.112.16.2"
$SSH_PASSWORD = "Admin@1234"  
$REMOTE_DIR   = "/var/www/a365ss"
# ==========================================

# --- Auto-detect plink.exe (PuTTY) ---
$_plinkCmd = Get-Command plink -ErrorAction SilentlyContinue
$PLINK = if ($_plinkCmd) { $_plinkCmd.Source } else { $null }
if (-not $PLINK) {
    $PLINK = @(
        "$env:ProgramFiles\PuTTY\plink.exe",
        "${env:ProgramFiles(x86)}\PuTTY\plink.exe",
        "$env:LOCALAPPDATA\Programs\PuTTY\plink.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $PLINK) {
    Write-Host "ERROR: plink.exe not found. Install PuTTY: winget install PuTTY.PuTTY" -ForegroundColor Red
    exit 1
}
Write-Host "Using plink: $PLINK" -ForegroundColor DarkGray

$SERVER_HOST = "${SERVER_USER}@${SERVER_IP}"

Write-Host "========================================="      -ForegroundColor Cyan
Write-Host "Starting A365SS MPT Flavor Deployment..."       -ForegroundColor Cyan
Write-Host "Flavor      : mpt  (IP-based, reads .env.mpt)" -ForegroundColor Cyan
Write-Host "Target Server: $SERVER_HOST"                    -ForegroundColor Cyan
Write-Host "Target Directory: $REMOTE_DIR"                  -ForegroundColor Cyan
Write-Host "=========================================`n"    -ForegroundColor Cyan

# 1. Build the project locally with the MPT flavor
# '--mode mpt' tells Vite to load .env.mpt which sets VITE_APP_ENV=mpt
Write-Host "-> 1. Building the project with MPT flavor (--mode mpt)..." -ForegroundColor Yellow
npm run build:mpt
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

# 2. Ensure host key is cached (prevents 'Cannot confirm a host key in batch mode' error)
Write-Host "`n-> 2. Checking and caching server host key..." -ForegroundColor Yellow
cmd.exe /c "echo y | `"$PLINK`" -ssh -pw `"$SSH_PASSWORD`" $SERVER_HOST `"exit`" 2>nul"

# 3. Upload and Apply the assets to NGINX
Write-Host "`n-> 3. Uploading and Deploying in a single step... (no password prompt)" -ForegroundColor Yellow
cmd.exe /c "cd dist && tar.exe -czf - . | `"$PLINK`" -batch -ssh -pw `"$SSH_PASSWORD`" $SERVER_HOST `"mkdir -p $REMOTE_DIR && rm -rf $REMOTE_DIR/* && cd $REMOTE_DIR && tar -xzf - && systemctl restart nginx`""
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed! Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
