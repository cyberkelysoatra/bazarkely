# DEPLOYER.ps1 - BazarKELY
# Lancer depuis C:\bazarkely-2 avec : .\DEPLOYER.ps1

$ErrorActionPreference = "Stop"

if ($PSScriptRoot -and $PSScriptRoot -ne "") {
    $projectRoot = $PSScriptRoot
} else {
    $projectRoot = "C:\bazarkely-2"
}

$frontendDir = Join-Path $projectRoot "frontend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BAZARKELY - Deploiement en cours...  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. TypeScript check
Write-Host "[1/4] Verification TypeScript..." -ForegroundColor Yellow
Set-Location $frontendDir
& npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR TypeScript - deploiement annule." -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}
Write-Host "  OK TypeScript" -ForegroundColor Green

# 2. Build production
Write-Host "[2/4] Build de production..." -ForegroundColor Yellow
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR build - deploiement annule." -ForegroundColor Red
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}
Write-Host "  OK Build" -ForegroundColor Green

# 3. Git commit
Write-Host "[3/4] Commit Git..." -ForegroundColor Yellow
Set-Location $projectRoot
& git add -A

$gitStatus = & git status --porcelain
if (-not $gitStatus) {
    Write-Host "  Aucune modification a committer" -ForegroundColor Gray
} else {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    & git commit -m "deploy: update $timestamp"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR commit Git." -ForegroundColor Red
        Read-Host "Appuie sur Entree pour fermer"
        exit 1
    }
    Write-Host "  OK Commit cree" -ForegroundColor Green
}

# 4. Push GitHub -> Netlify auto-deploy
Write-Host "[4/4] Push GitHub -> Netlify..." -ForegroundColor Yellow
& git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR push GitHub." -ForegroundColor Red
    Write-Host ""
    Write-Host "Si probleme d'auth, configure ton token GitHub :" -ForegroundColor Yellow
    Write-Host "  git remote set-url origin https://TON_TOKEN@github.com/cyberkelysoatra/bazarkely.git"
    Read-Host "Appuie sur Entree pour fermer"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOIEMENT LANCE AVEC SUCCES !      " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Netlify deploie automatiquement..." -ForegroundColor Cyan
Write-Host "  Site : https://1sakely.org" -ForegroundColor Cyan
Write-Host "  Suivi : https://app.netlify.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "  (environ 2-3 minutes avant mise en ligne)" -ForegroundColor Gray
Write-Host ""
Read-Host "Appuie sur Entree pour fermer"
