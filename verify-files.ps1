# 🔍 BazarKELY - Pre-Deployment File Verification Script
# This script verifies all required files exist and are properly configured
# before attempting deployment to Netlify

param(
    [switch]$Detailed = $false,
    [switch]$CheckTypeScript = $false
)

# Color functions for better output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "⚠️ $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "ℹ️ $Message" -ForegroundColor Cyan }
function Write-Step { param($Message) Write-Host "🔄 $Message" -ForegroundColor Blue }

Write-Host "🔍 BazarKELY - Pre-Deployment Verification" -ForegroundColor Magenta
Write-Host "===========================================" -ForegroundColor Magenta
Write-Host ""

$ScriptDir = $PSScriptRoot
$FrontendDir = Join-Path $ScriptDir "frontend"
$Errors = 0
$Warnings = 0

# Step 1: Verify directory structure
Write-Step "Verifying directory structure..."
$RequiredDirs = @(
    "frontend",
    "frontend\src",
    "frontend\src\components",
    "frontend\src\utils"
)

foreach ($dir in $RequiredDirs) {
    $FullPath = Join-Path $ScriptDir $dir
    if (Test-Path $FullPath) {
        Write-Success "Directory exists: $dir"
    } else {
        Write-Error "Missing directory: $dir"
        $Errors++
    }
}

# Step 2: Verify required files
Write-Step "Verifying required files..."
$RequiredFiles = @{
    "frontend\package.json" = "Package configuration"
    "frontend\src\App.tsx" = "Main application component"
    "frontend\src\components\InstallPrompt.tsx" = "PWA install prompt component"
    "frontend\src\utils\browserDetection.ts" = "Browser detection utilities"
    "frontend\src\components\InstallPromptDebug.tsx" = "Debug component"
}

foreach ($file in $RequiredFiles.Keys) {
    $FullPath = Join-Path $ScriptDir $file
    if (Test-Path $FullPath) {
        $fileInfo = Get-Item $FullPath
        Write-Success "$($RequiredFiles[$file]): $($fileInfo.Length) bytes"
        
        if ($Detailed) {
            Write-Info "  Path: $FullPath"
            Write-Info "  Modified: $($fileInfo.LastWriteTime)"
        }
    } else {
        Write-Error "Missing file: $file ($($RequiredFiles[$file]))"
        $Errors++
    }
}

# Step 3: Verify App.tsx contains InstallPrompt import
Write-Step "Verifying App.tsx integration..."
$AppTsxPath = Join-Path $FrontendDir "src\App.tsx"
if (Test-Path $AppTsxPath) {
    $AppContent = Get-Content $AppTsxPath -Raw
    
    $Checks = @{
        "InstallPrompt import" = $AppContent -match "import.*InstallPrompt"
        "InstallPrompt component" = $AppContent -match "<InstallPrompt"
        "InstallPromptDebug import" = $AppContent -match "import.*InstallPromptDebug"
        "InstallPromptDebug component" = $AppContent -match "<InstallPromptDebug"
    }
    
    foreach ($check in $Checks.Keys) {
        if ($Checks[$check]) {
            Write-Success "App.tsx contains: $check"
        } else {
            Write-Warning "App.tsx missing: $check"
            $Warnings++
        }
    }
} else {
    Write-Error "App.tsx not found"
    $Errors++
}

# Step 4: Verify InstallPrompt.tsx structure
Write-Step "Verifying InstallPrompt.tsx structure..."
$InstallPromptPath = Join-Path $FrontendDir "src\components\InstallPrompt.tsx"
if (Test-Path $InstallPromptPath) {
    $InstallPromptContent = Get-Content $InstallPromptPath -Raw
    
    $Checks = @{
        "React import" = $InstallPromptContent -match "import React"
        "Lucide icons import" = $InstallPromptContent -match "from 'lucide-react'"
        "browserDetection import" = $InstallPromptContent -match "from.*browserDetection"
        "InstallPromptProps interface" = $InstallPromptContent -match "interface InstallPromptProps"
        "Export default" = $InstallPromptContent -match "export default InstallPrompt"
    }
    
    foreach ($check in $Checks.Keys) {
        if ($Checks[$check]) {
            Write-Success "InstallPrompt.tsx contains: $check"
        } else {
            Write-Warning "InstallPrompt.tsx missing: $check"
            $Warnings++
        }
    }
} else {
    Write-Error "InstallPrompt.tsx not found"
    $Errors++
}

# Step 5: Verify browserDetection.ts exports
Write-Step "Verifying browserDetection.ts exports..."
$BrowserDetectionPath = Join-Path $FrontendDir "src\utils\browserDetection.ts"
if (Test-Path $BrowserDetectionPath) {
    $BrowserDetectionContent = Get-Content $BrowserDetectionPath -Raw
    
    $RequiredExports = @(
        "isStandalone",
        "isIOS",
        "isSafari",
        "isChrome",
        "isEdge",
        "isFirefox",
        "isMobile",
        "supportsPWAInstall",
        "getInstallationMethod",
        "shouldShowInstallPrompt",
        "getInstallationInstructions",
        "getDebugInfo"
    )
    
    foreach ($export in $RequiredExports) {
        if ($BrowserDetectionContent -match "export.*$export") {
            Write-Success "Exports: $export"
        } else {
            Write-Warning "Missing export: $export"
            $Warnings++
        }
    }
} else {
    Write-Error "browserDetection.ts not found"
    $Errors++
}

# Step 6: Check TypeScript compilation (optional)
if ($CheckTypeScript) {
    Write-Step "Checking TypeScript compilation..."
    Set-Location $FrontendDir
    
    try {
        Write-Info "Running: npm run typecheck"
        $typecheckOutput = npm run typecheck 2>&1
        $typecheckExitCode = $LASTEXITCODE
        
        if ($typecheckExitCode -eq 0) {
            Write-Success "TypeScript compilation successful"
        } else {
            Write-Warning "TypeScript compilation has issues"
            if ($Detailed) {
                Write-Host "TypeScript output:" -ForegroundColor Yellow
                Write-Host $typecheckOutput -ForegroundColor Yellow
            }
            $Warnings++
        }
    } catch {
        Write-Warning "Could not run TypeScript check: $($_.Exception.Message)"
        $Warnings++
    }
    
    Set-Location $ScriptDir
}

# Step 7: Check package.json scripts
Write-Step "Verifying package.json scripts..."
$PackageJsonPath = Join-Path $FrontendDir "package.json"
if (Test-Path $PackageJsonPath) {
    try {
        $packageJson = Get-Content $PackageJsonPath | ConvertFrom-Json
        
        $RequiredScripts = @("build", "preview", "typecheck")
        foreach ($script in $RequiredScripts) {
            if ($packageJson.scripts.PSObject.Properties.Name -contains $script) {
                Write-Success "Script available: $script"
            } else {
                Write-Warning "Missing script: $script"
                $Warnings++
            }
        }
    } catch {
        Write-Warning "Could not parse package.json: $($_.Exception.Message)"
        $Warnings++
    }
} else {
    Write-Error "package.json not found"
    $Errors++
}

# Step 8: Check Netlify CLI
Write-Step "Verifying Netlify CLI..."
try {
    $netlifyVersion = netlify --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Netlify CLI available: $netlifyVersion"
    } else {
        Write-Error "Netlify CLI not working"
        $Errors++
    }
} catch {
    Write-Error "Netlify CLI not found"
    Write-Info "Install with: npm install -g netlify-cli"
    $Errors++
}

# Step 9: Check authentication
Write-Step "Checking Netlify authentication..."
try {
    $netlifyStatus = netlify status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Netlify CLI authenticated"
    } else {
        Write-Warning "Not authenticated with Netlify CLI"
        Write-Info "Run: netlify login"
        $Warnings++
    }
} catch {
    Write-Warning "Could not check Netlify authentication"
    $Warnings++
}

# Step 10: Summary
Write-Host ""
Write-Host "📊 VERIFICATION SUMMARY" -ForegroundColor Magenta
Write-Host "======================" -ForegroundColor Magenta

if ($Errors -eq 0) {
    Write-Success "No critical errors found"
} else {
    Write-Error "$Errors critical errors found"
}

if ($Warnings -eq 0) {
    Write-Success "No warnings"
} else {
    Write-Warning "$Warnings warnings found"
}

Write-Host ""
if ($Errors -eq 0) {
    Write-Success "✅ Ready for deployment!"
    Write-Info "Run: .\deploy-to-netlify.ps1"
} else {
    Write-Error "❌ Fix errors before deployment"
    Write-Info "Address the issues above and run verification again"
}

Write-Host ""
Write-Info "Verification completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
