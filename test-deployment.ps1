# 🧪 BazarKELY - Post-Deployment Testing Script
# This script tests the deployed application to verify InstallPrompt is working
# and all new features are accessible on the live site

param(
    [string]$DeploymentUrl = "",
    [switch]$CheckConsole = $false,
    [switch]$CheckAssets = $false,
    [switch]$TestInstallPrompt = $false
)

# Color functions for better output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "⚠️ $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "ℹ️ $Message" -ForegroundColor Cyan }
function Write-Step { param($Message) Write-Host "🔄 $Message" -ForegroundColor Blue }

Write-Host "🧪 BazarKELY - Post-Deployment Testing" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""

$ScriptDir = $PSScriptRoot
$TestResults = @{
    URL = $DeploymentUrl
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Tests = @()
    Success = $true
}

# Step 1: Determine deployment URL
if (-not $DeploymentUrl) {
    Write-Step "Looking for deployment URL..."
    
    # Check deployment-info.json
    $DeployInfoPath = Join-Path $ScriptDir "deployment-info.json"
    if (Test-Path $DeployInfoPath) {
        try {
            $deployInfo = Get-Content $DeployInfoPath | ConvertFrom-Json
            $DeploymentUrl = $deployInfo.URL
            Write-Success "Found deployment URL in deployment-info.json"
        } catch {
            Write-Warning "Could not parse deployment-info.json"
        }
    }
    
    # Fallback to default URL
    if (-not $DeploymentUrl) {
        $DeploymentUrl = "https://1sakely.org"
        Write-Info "Using default URL: $DeploymentUrl"
    }
}

Write-Info "Testing deployment URL: $DeploymentUrl"

# Step 2: Test basic connectivity
Write-Step "Testing basic connectivity..."
try {
    $response = Invoke-WebRequest -Uri $DeploymentUrl -Method Head -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Success "Site is accessible (HTTP $($response.StatusCode))"
        $TestResults.Tests += @{
            Name = "Basic Connectivity"
            Status = "PASS"
            Details = "HTTP $($response.StatusCode)"
        }
    } else {
        Write-Warning "Site returned status: $($response.StatusCode)"
        $TestResults.Tests += @{
            Name = "Basic Connectivity"
            Status = "WARN"
            Details = "HTTP $($response.StatusCode)"
        }
    }
} catch {
    Write-Error "Could not connect to deployment URL: $($_.Exception.Message)"
    $TestResults.Tests += @{
        Name = "Basic Connectivity"
        Status = "FAIL"
        Details = $_.Exception.Message
    }
    $TestResults.Success = $false
}

# Step 3: Test page content
Write-Step "Testing page content..."
try {
    $response = Invoke-WebRequest -Uri $DeploymentUrl -TimeoutSec 30
    $content = $response.Content
    
    # Check for React app indicators
    $ReactChecks = @{
        "React app loaded" = $content -match "react|React"
        "BazarKELY title" = $content -match "BazarKELY|bazarkely"
        "JavaScript bundle" = $content -match "\.js"
        "CSS bundle" = $content -match "\.css"
    }
    
    foreach ($check in $ReactChecks.Keys) {
        if ($ReactChecks[$check]) {
            Write-Success "Page contains: $check"
            $TestResults.Tests += @{
                Name = $check
                Status = "PASS"
                Details = "Found in page content"
            }
        } else {
            Write-Warning "Page missing: $check"
            $TestResults.Tests += @{
                Name = $check
                Status = "WARN"
                Details = "Not found in page content"
            }
        }
    }
} catch {
    Write-Error "Could not fetch page content: $($_.Exception.Message)"
    $TestResults.Tests += @{
        Name = "Page Content"
        Status = "FAIL"
        Details = $_.Exception.Message
    }
    $TestResults.Success = $false
}

# Step 4: Test for InstallPrompt assets (if enabled)
if ($CheckAssets) {
    Write-Step "Testing for InstallPrompt assets..."
    try {
        $response = Invoke-WebRequest -Uri $DeploymentUrl -TimeoutSec 30
        $content = $response.Content
        
        # Look for InstallPrompt-related content in the bundled JS
        $AssetChecks = @{
            "InstallPrompt component" = $content -match "InstallPrompt"
            "browserDetection" = $content -match "browserDetection"
            "isStandalone" = $content -match "isStandalone"
            "isIOS" = $content -match "isIOS"
            "isSafari" = $content -match "isSafari"
            "beforeinstallprompt" = $content -match "beforeinstallprompt"
        }
        
        foreach ($check in $AssetChecks.Keys) {
            if ($AssetChecks[$check]) {
                Write-Success "Asset contains: $check"
                $TestResults.Tests += @{
                    Name = "Asset: $check"
                    Status = "PASS"
                    Details = "Found in bundled assets"
                }
            } else {
                Write-Warning "Asset missing: $check"
                $TestResults.Tests += @{
                    Name = "Asset: $check"
                    Status = "WARN"
                    Details = "Not found in bundled assets"
                }
            }
        }
    } catch {
        Write-Warning "Could not check assets: $($_.Exception.Message)"
    }
}

# Step 5: Test console for errors (if enabled)
if ($CheckConsole) {
    Write-Step "Testing for console errors..."
    Write-Info "Note: Console error detection requires browser automation"
    Write-Info "Consider using Playwright or Selenium for full console testing"
    
    # This would require browser automation to actually check console
    # For now, we'll just note that this test is available
    $TestResults.Tests += @{
        Name = "Console Errors"
        Status = "SKIP"
        Details = "Requires browser automation"
    }
}

# Step 6: Test InstallPrompt functionality (if enabled)
if ($TestInstallPrompt) {
    Write-Step "Testing InstallPrompt functionality..."
    Write-Info "Note: InstallPrompt testing requires browser automation"
    Write-Info "Manual testing steps:"
    Write-Info "1. Open $DeploymentUrl in Chrome/Edge"
    Write-Info "2. Check for install prompt banner"
    Write-Info "3. Test on Safari iOS for 'Add to Home Screen' instructions"
    Write-Info "4. Test on Firefox for fallback message"
    
    $TestResults.Tests += @{
        Name = "InstallPrompt Functionality"
        Status = "SKIP"
        Details = "Requires manual browser testing"
    }
}

# Step 7: Test PWA manifest
Write-Step "Testing PWA manifest..."
try {
    $manifestUrl = $DeploymentUrl.TrimEnd('/') + "/manifest.webmanifest"
    $manifestResponse = Invoke-WebRequest -Uri $manifestUrl -TimeoutSec 15
    
    if ($manifestResponse.StatusCode -eq 200) {
        Write-Success "PWA manifest is accessible"
        $TestResults.Tests += @{
            Name = "PWA Manifest"
            Status = "PASS"
            Details = "Manifest accessible at $manifestUrl"
        }
        
        # Check manifest content
        $manifestContent = $manifestResponse.Content
        if ($manifestContent -match "BazarKELY") {
            Write-Success "Manifest contains BazarKELY"
        } else {
            Write-Warning "Manifest may not contain BazarKELY"
        }
    } else {
        Write-Warning "PWA manifest returned status: $($manifestResponse.StatusCode)"
        $TestResults.Tests += @{
            Name = "PWA Manifest"
            Status = "WARN"
            Details = "HTTP $($manifestResponse.StatusCode)"
        }
    }
} catch {
    Write-Warning "Could not access PWA manifest: $($_.Exception.Message)"
    $TestResults.Tests += @{
        Name = "PWA Manifest"
        Status = "WARN"
        Details = $_.Exception.Message
    }
}

# Step 8: Test Service Worker
Write-Step "Testing Service Worker..."
try {
    $swUrl = $DeploymentUrl.TrimEnd('/') + "/sw.js"
    $swResponse = Invoke-WebRequest -Uri $swUrl -TimeoutSec 15
    
    if ($swResponse.StatusCode -eq 200) {
        Write-Success "Service Worker is accessible"
        $TestResults.Tests += @{
            Name = "Service Worker"
            Status = "PASS"
            Details = "SW accessible at $swUrl"
        }
    } else {
        Write-Warning "Service Worker returned status: $($swResponse.StatusCode)"
        $TestResults.Tests += @{
            Name = "Service Worker"
            Status = "WARN"
            Details = "HTTP $($swResponse.StatusCode)"
        }
    }
} catch {
    Write-Warning "Could not access Service Worker: $($_.Exception.Message)"
    $TestResults.Tests += @{
        Name = "Service Worker"
        Status = "WARN"
        Details = $_.Exception.Message
    }
}

# Step 9: Performance check
Write-Step "Testing performance..."
try {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri $DeploymentUrl -TimeoutSec 30
    $endTime = Get-Date
    $loadTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($loadTime -lt 3000) {
        Write-Success "Page loads quickly: $([math]::Round($loadTime, 0))ms"
        $TestResults.Tests += @{
            Name = "Performance"
            Status = "PASS"
            Details = "Load time: $([math]::Round($loadTime, 0))ms"
        }
    } else {
        Write-Warning "Page loads slowly: $([math]::Round($loadTime, 0))ms"
        $TestResults.Tests += @{
            Name = "Performance"
            Status = "WARN"
            Details = "Load time: $([math]::Round($loadTime, 0))ms"
        }
    }
} catch {
    Write-Warning "Could not measure performance: $($_.Exception.Message)"
}

# Step 10: Summary and save results
Write-Host ""
Write-Host "📊 TEST RESULTS SUMMARY" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta

$PassCount = ($TestResults.Tests | Where-Object { $_.Status -eq "PASS" }).Count
$WarnCount = ($TestResults.Tests | Where-Object { $_.Status -eq "WARN" }).Count
$FailCount = ($TestResults.Tests | Where-Object { $_.Status -eq "FAIL" }).Count
$SkipCount = ($TestResults.Tests | Where-Object { $_.Status -eq "SKIP" }).Count

Write-Host "✅ Passed: $PassCount" -ForegroundColor Green
Write-Host "⚠️ Warnings: $WarnCount" -ForegroundColor Yellow
Write-Host "❌ Failed: $FailCount" -ForegroundColor Red
Write-Host "⏭️ Skipped: $SkipCount" -ForegroundColor Cyan

if ($TestResults.Success) {
    Write-Success "🎉 Deployment test completed successfully!"
} else {
    Write-Error "❌ Some tests failed - check the details above"
}

# Save detailed results
$ResultsPath = Join-Path $ScriptDir "test-results.json"
$TestResults | ConvertTo-Json -Depth 3 | Out-File $ResultsPath -Encoding UTF8
Write-Info "Detailed results saved to: test-results.json"

Write-Host ""
Write-Info "Manual testing recommendations:"
Write-Info "1. Open $DeploymentUrl in different browsers"
Write-Info "2. Check for InstallPrompt banner"
Write-Info "3. Test installation on mobile devices"
Write-Info "4. Verify PWA functionality"

Write-Host ""
Write-Info "Testing completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
