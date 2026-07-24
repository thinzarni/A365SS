<#
.SYNOPSIS
Deploys the A365SS web application to the remote server.

.DESCRIPTION
This script builds the React project locally in the 'dist' folder, then securely copies only the required files to the server using SCP. Finally, it uses SSH to restart the Docker container on the server so the new files go live.
#>

$ErrorActionPreference = "Stop"

# ==========================================
# CONFIGURATION - CHANGE THESE BEFORE RUNNING
# ==========================================
$SERVER_USER = "mit"
$SERVER_IP   = "4.193.192.86"
# $SERVER_IP = "4.193.126.166"
$SSH_PASSWORD = "5tgb%TGB3edc#EDC"
# Using the home directory of the 'mit' user. Change if needed.
$REMOTE_DIR = "/home/mit/a365ss_app"
# Fingerprint of the server's SSH host key (from first connection attempt)
$SERVER_HOSTKEY = "SHA256:MtEeJlcxw9GTNXYl/+Lkt29pipqAxrCk04cprV2iWyg"
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

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Starting A365SS Deployment..." -ForegroundColor Cyan
Write-Host "Target Server: $SERVER_HOST" -ForegroundColor Cyan
Write-Host "Target Directory: $REMOTE_DIR" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# 1. Build the project locally
Write-Host "-> 1. Building the project locally..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

Write-Host "`n-> 2. Uploading and Deploying in a single step... (no password prompt)" -ForegroundColor Yellow
cmd.exe /c "tar.exe -czf - dist Dockerfile docker-compose.yml nginx.conf | `"$PLINK`" -batch -ssh -pw `"$SSH_PASSWORD`" -hostkey `"$SERVER_HOSTKEY`" $SERVER_HOST `"mkdir -p $REMOTE_DIR && cd $REMOTE_DIR && tar -xzf - && docker rm -f a365ss_react_app || true && docker compose up --build -d`""
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed! Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
