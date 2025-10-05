# 🚀 BazarKELY - Automated Netlify Deployment Script
# This script builds and deploys the React app directly to Netlify
# Bypasses GitHub upload issues by deploying from local build

param(
    [switch]$SkipBuild = $false,
    [switch]$SkipVerification = $false,
    [string]$SiteId = ""
)

# Color functions for better output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "⚠️ $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "ℹ️ $Message" -ForegroundColor Cyan }
function Write-Step { param($Message) Write-Host "🔄 $Message" -ForegroundColor Blue }

# Script configuration
$ScriptDir = $PSScriptRoot
$FrontendDir = Join-Path $ScriptDir "frontend"
$DistDir = Join-Path $FrontendDir "dist"
$BackupDir = Join-Path $ScriptDir "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "🚀 BazarKELY - Automated Netlify Deployment" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta
Write-Host ""

# Step 1: Verify we're in the correct directory
Write-Step "Verifying directory structure..."
if (-not (Test-Path $FrontendDir)) {
    Write-Error "Frontend directory not found: $FrontendDir"
    Write-Info "Please run this script from the project root (D:\bazarkely-2)"
    exit 1
}

if (-not (Test-Path (Join-Path $FrontendDir "package.json"))) {
    Write-Error "package.json not found in frontend directory"
    exit 1
}

Write-Success "Directory structure verified"

# Step 2: Check Netlify CLI authentication
Write-Step "Checking Netlify CLI authentication..."
try {
    $netlifyStatus = netlify status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Not authenticated with Netlify CLI"
        Write-Info "Please run: netlify login"
        Write-Info "Then run this script again"
        exit 1
    }
    Write-Success "Netlify CLI authenticated"
} catch {
    Write-Error "Netlify CLI not found or not working"
    Write-Info "Install with: npm install -g netlify-cli"
    exit 1
}

# Step 3: Verify new files exist (unless skipping verification)
if (-not $SkipVerification) {
    Write-Step "Verifying new PWA files..."
    
    $RequiredFiles = @(
        "frontend\src\components\InstallPrompt.tsx",
        "frontend\src\utils\browserDetection.ts",
        "frontend\src\components\InstallPromptDebug.tsx"
    )
    
    $MissingFiles = @()
    foreach ($file in $RequiredFiles) {
        $FullPath = Join-Path $ScriptDir $file
        if (-not (Test-Path $FullPath)) {
            $MissingFiles += $file
        }
    }
    
    if ($MissingFiles.Count -gt 0) {
        Write-Error "Missing required files:"
        foreach ($file in $MissingFiles) {
            Write-Host "  - $file" -ForegroundColor Red
        }
        exit 1
    }
    
    # Check if App.tsx contains InstallPrompt import
    $AppTsxPath = Join-Path $FrontendDir "src\App.tsx"
    if (Test-Path $AppTsxPath) {
        $AppContent = Get-Content $AppTsxPath -Raw
        if ($AppContent -notmatch "InstallPrompt") {
            Write-Warning "App.tsx may not contain InstallPrompt import"
        } else {
            Write-Success "App.tsx contains InstallPrompt import"
        }
    }
    
    Write-Success "All required files verified"
}

# Step 4: Create backup (optional)
Write-Step "Creating backup of current build..."
if (Test-Path $DistDir) {
    try {
        Copy-Item $DistDir $BackupDir -Recurse -Force
        Write-Success "Backup created: $BackupDir"
    } catch {
        Write-Warning "Could not create backup: $($_.Exception.Message)"
    }
}

# Step 5: Build the application (unless skipping build)
if (-not $SkipBuild) {
    Write-Step "Building React application..."
    Set-Location $FrontendDir
    
    # Clean previous build
    if (Test-Path $DistDir) {
        Remove-Item $DistDir -Recurse -Force
        Write-Info "Cleaned previous build"
    }
    
    # Run build
    Write-Info "Running: npm run build"
    $buildOutput = npm run build 2>&1
    $buildExitCode = $LASTEXITCODE
    
    if ($buildExitCode -ne 0) {
        Write-Error "Build failed with exit code: $buildExitCode"
        Write-Host "Build output:" -ForegroundColor Red
        Write-Host $buildOutput -ForegroundColor Red
        Set-Location $ScriptDir
        exit 1
    }
    
    # Verify build output
    if (-not (Test-Path $DistDir)) {
        Write-Error "Build directory not created: $DistDir"
        Set-Location $ScriptDir
        exit 1
    }
    
    $buildFiles = Get-ChildItem $DistDir -Recurse | Measure-Object
    Write-Success "Build completed successfully ($($buildFiles.Count) files generated)"
    
    Set-Location $ScriptDir
} else {
    Write-Info "Skipping build step"
    if (-not (Test-Path $DistDir)) {
        Write-Error "Build directory not found: $DistDir"
        Write-Info "Run build first or remove -SkipBuild flag"
        exit 1
    }
}

# Step 6: Deploy to Netlify
Write-Step "Deploying to Netlify..."
Write-Info "Deploying from: $DistDir"

try {
    # Prepare deployment command
    $deployCmd = "netlify deploy --prod --dir=`"$DistDir`""
    if ($SiteId) {
        $deployCmd += " --site=$SiteId"
    }
    
    Write-Info "Running: $deployCmd"
    
    # Execute deployment
    $deployOutput = Invoke-Expression $deployCmd 2>&1
    $deployExitCode = $LASTEXITCODE
    
    if ($deployExitCode -ne 0) {
        Write-Error "Deployment failed with exit code: $deployExitCode"
        Write-Host "Deployment output:" -ForegroundColor Red
        Write-Host $deployOutput -ForegroundColor Red
        exit 1
    }
    
    # Extract deployment URL from output
    $deploymentUrl = ""
    $deployLines = $deployOutput -split "`n"
    foreach ($line in $deployLines) {
        if ($line -match "https://.*\.netlify\.app") {
            $deploymentUrl = $line.Trim()
            break
        }
    }
    
    if ($deploymentUrl) {
        Write-Success "Deployment successful!"
        Write-Success "URL: $deploymentUrl"
        
        # Save deployment info
        $deployInfo = @{
            Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            URL = $deploymentUrl
            SiteId = $SiteId
            BackupDir = $BackupDir
        }
        $deployInfo | ConvertTo-Json | Out-File "deployment-info.json" -Encoding UTF8
        
        Write-Info "Deployment info saved to: deployment-info.json"
    } else {
        Write-Warning "Deployment completed but URL not found in output"
        Write-Host "Deployment output:" -ForegroundColor Yellow
        Write-Host $deployOutput -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Deployment failed with exception: $($_.Exception.Message)"
    exit 1
}

# Step 7: Post-deployment verification
Write-Step "Verifying deployment..."
if ($deploymentUrl) {
    try {
        Write-Info "Testing deployment URL: $deploymentUrl"
        $response = Invoke-WebRequest -Uri $deploymentUrl -Method Head -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Success "Deployment URL is accessible (HTTP $($response.StatusCode))"
        } else {
            Write-Warning "Deployment URL returned status: $($response.StatusCode)"
        }
    } catch {
        Write-Warning "Could not verify deployment URL: $($_.Exception.Message)"
    }
}

# Step 8: Summary
Write-Host ""
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
if ($deploymentUrl) {
    Write-Host "✅ URL: $deploymentUrl" -ForegroundColor Green
}
Write-Host "✅ Build: $DistDir" -ForegroundColor Green
if ($BackupDir -and (Test-Path $BackupDir)) {
    Write-Host "✅ Backup: $BackupDir" -ForegroundColor Green
}
Write-Host "✅ Info: deployment-info.json" -ForegroundColor Green
Write-Host ""
Write-Info "Next steps:"
Write-Info "1. Test the deployment URL"
Write-Info "2. Check for InstallPrompt component"
Write-Info "3. Run test-deployment.ps1 for verification"
Write-Host ""

# Cleanup
Set-Location $ScriptDir
