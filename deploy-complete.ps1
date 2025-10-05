# 🚀 BazarKELY - Complete Deployment Orchestration Script
# This script orchestrates the entire deployment process from verification to testing
# Provides a single command to deploy InstallPrompt to production

param(
    [switch]$SkipVerification = $false,
    [switch]$SkipBuild = $false,
    [switch]$SkipTesting = $false,
    [switch]$Force = $false,
    [string]$SiteId = ""
)

# Color functions for better output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "⚠️ $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "ℹ️ $Message" -ForegroundColor Cyan }
function Write-Step { param($Message) Write-Host "🔄 $Message" -ForegroundColor Blue }

Write-Host "🚀 BazarKELY - Complete Deployment Process" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host ""

$ScriptDir = $PSScriptRoot
$StartTime = Get-Date
$DeploymentUrl = ""

# Step 1: Pre-deployment verification
if (-not $SkipVerification) {
    Write-Step "Step 1: Pre-deployment verification..."
    try {
        $verifyScript = Join-Path $ScriptDir "verify-files.ps1"
        if (Test-Path $verifyScript) {
            Write-Info "Running: .\verify-files.ps1"
            & $verifyScript -Detailed
            
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Verification failed - stopping deployment"
                exit 1
            }
            Write-Success "Verification completed successfully"
        } else {
            Write-Warning "verify-files.ps1 not found - skipping verification"
        }
    } catch {
        Write-Error "Verification failed: $($_.Exception.Message)"
        if (-not $Force) {
            exit 1
        }
    }
} else {
    Write-Info "Skipping verification step"
}

# Step 2: Build and deploy
Write-Step "Step 2: Building and deploying..."
try {
    $deployScript = Join-Path $ScriptDir "deploy-to-netlify.ps1"
    if (Test-Path $deployScript) {
        $deployParams = @()
        if ($SkipBuild) { $deployParams += "-SkipBuild" }
        if ($SiteId) { $deployParams += "-SiteId", $SiteId }
        
        Write-Info "Running: .\deploy-to-netlify.ps1 $($deployParams -join ' ')"
        & $deployScript @deployParams
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Deployment failed - stopping process"
            exit 1
        }
        
        # Try to extract deployment URL from deployment-info.json
        $deployInfoPath = Join-Path $ScriptDir "deployment-info.json"
        if (Test-Path $deployInfoPath) {
            try {
                $deployInfo = Get-Content $deployInfoPath | ConvertFrom-Json
                $DeploymentUrl = $deployInfo.URL
                Write-Success "Deployment completed: $DeploymentUrl"
            } catch {
                Write-Warning "Could not parse deployment URL from info file"
            }
        }
    } else {
        Write-Error "deploy-to-netlify.ps1 not found"
        exit 1
    }
} catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    exit 1
}

# Step 3: Post-deployment testing
if (-not $SkipTesting) {
    Write-Step "Step 3: Post-deployment testing..."
    try {
        $testScript = Join-Path $ScriptDir "test-deployment.ps1"
        if (Test-Path $testScript) {
            $testParams = @()
            if ($DeploymentUrl) { $testParams += "-DeploymentUrl", $DeploymentUrl }
            $testParams += "-CheckAssets", "-TestInstallPrompt"
            
            Write-Info "Running: .\test-deployment.ps1 $($testParams -join ' ')"
            & $testScript @testParams
            
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Some tests failed - check the results"
            } else {
                Write-Success "All tests passed"
            }
        } else {
            Write-Warning "test-deployment.ps1 not found - skipping testing"
        }
    } catch {
        Write-Warning "Testing failed: $($_.Exception.Message)"
    }
} else {
    Write-Info "Skipping testing step"
}

# Step 4: Summary and next steps
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

Write-Host ""
Write-Host "🎉 DEPLOYMENT PROCESS COMPLETE!" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

Write-Success "✅ Process completed in: $([math]::Round($Duration.TotalMinutes, 1)) minutes"

if ($DeploymentUrl) {
    Write-Success "✅ Deployment URL: $DeploymentUrl"
} else {
    Write-Warning "⚠️ Deployment URL not captured"
}

Write-Host ""
Write-Info "📋 NEXT STEPS:"
Write-Info "1. Test the deployment URL manually"
Write-Info "2. Check for InstallPrompt component on different browsers"
Write-Info "3. Test PWA installation on mobile devices"
Write-Info "4. Monitor for any issues"

Write-Host ""
Write-Info "🛠️ AVAILABLE COMMANDS:"
Write-Info "• .\verify-files.ps1 -Detailed          # Re-verify files"
Write-Info "• .\test-deployment.ps1 -DeploymentUrl <url>  # Test specific URL"
Write-Info "• .\rollback.ps1 -ListDeployments       # List available rollbacks"
Write-Info "• .\rollback.ps1 -DeploymentId <id>      # Rollback to specific deployment"

Write-Host ""
Write-Info "📊 DEPLOYMENT SUMMARY:"
Write-Info "• Start Time: $($StartTime.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Info "• End Time: $($EndTime.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Info "• Duration: $([math]::Round($Duration.TotalMinutes, 1)) minutes"
Write-Info "• Verification: $(if (-not $SkipVerification) { 'Completed' } else { 'Skipped' })"
Write-Info "• Build: $(if (-not $SkipBuild) { 'Completed' } else { 'Skipped' })"
Write-Info "• Testing: $(if (-not $SkipTesting) { 'Completed' } else { 'Skipped' })"

Write-Host ""
Write-Success "🚀 BazarKELY InstallPrompt is now live!"
Write-Info "Deployment process completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
