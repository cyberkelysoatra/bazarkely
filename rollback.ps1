# 🔄 BazarKELY - Deployment Rollback Script
# This script provides rollback functionality for Netlify deployments
# Allows reverting to previous deployment if issues are detected

param(
    [string]$SiteId = "",
    [string]$DeploymentId = "",
    [switch]$ListDeployments = $false,
    [switch]$Force = $false
)

# Color functions for better output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "⚠️ $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "ℹ️ $Message" -ForegroundColor Cyan }
function Write-Step { param($Message) Write-Host "🔄 $Message" -ForegroundColor Blue }

Write-Host "🔄 BazarKELY - Deployment Rollback" -ForegroundColor Magenta
Write-Host "===================================" -ForegroundColor Magenta
Write-Host ""

$ScriptDir = $PSScriptRoot

# Step 1: Check Netlify CLI authentication
Write-Step "Checking Netlify CLI authentication..."
try {
    $netlifyStatus = netlify status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Not authenticated with Netlify CLI"
        Write-Info "Please run: netlify login"
        exit 1
    }
    Write-Success "Netlify CLI authenticated"
} catch {
    Write-Error "Netlify CLI not found or not working"
    Write-Info "Install with: npm install -g netlify-cli"
    exit 1
}

# Step 2: Get site information
Write-Step "Getting site information..."
try {
    if ($SiteId) {
        Write-Info "Using provided site ID: $SiteId"
    } else {
        # Try to get site ID from current directory
        $netlifyStatus = netlify status --json 2>&1
        if ($LASTEXITCODE -eq 0) {
            try {
                $statusJson = $netlifyStatus | ConvertFrom-Json
                $SiteId = $statusJson.site.id
                Write-Success "Found site ID: $SiteId"
            } catch {
                Write-Warning "Could not parse site ID from netlify status"
            }
        }
        
        if (-not $SiteId) {
            Write-Error "No site ID provided and could not detect from current directory"
            Write-Info "Please provide site ID with: -SiteId <your-site-id>"
            exit 1
        }
    }
} catch {
    Write-Error "Could not get site information: $($_.Exception.Message)"
    exit 1
}

# Step 3: List deployments (if requested)
if ($ListDeployments) {
    Write-Step "Listing recent deployments..."
    try {
        $deploymentsCmd = "netlify api listSiteDeploys --data=`"{\`"site_id\`": \`"$SiteId\`"}`""
        Write-Info "Running: $deploymentsCmd"
        
        $deploymentsOutput = Invoke-Expression $deploymentsCmd 2>&1
        if ($LASTEXITCODE -eq 0) {
            try {
                $deployments = $deploymentsOutput | ConvertFrom-Json
                Write-Host ""
                Write-Host "📋 RECENT DEPLOYMENTS" -ForegroundColor Cyan
                Write-Host "====================" -ForegroundColor Cyan
                
                $deployments | Select-Object -First 10 | ForEach-Object {
                    $deploy = $_
                    $date = [DateTime]::Parse($deploy.created_at).ToString("yyyy-MM-dd HH:mm:ss")
                    $state = $deploy.state
                    $url = $deploy.deploy_url
                    
                    $color = switch ($state) {
                        "ready" { "Green" }
                        "building" { "Yellow" }
                        "error" { "Red" }
                        default { "White" }
                    }
                    
                    Write-Host "🆔 $($deploy.id)" -ForegroundColor $color
                    Write-Host "   📅 $date" -ForegroundColor $color
                    Write-Host "   📊 $state" -ForegroundColor $color
                    Write-Host "   🔗 $url" -ForegroundColor $color
                    Write-Host ""
                }
                
                Write-Info "Use -DeploymentId <id> to rollback to a specific deployment"
            } catch {
                Write-Warning "Could not parse deployments JSON"
                Write-Host "Raw output:" -ForegroundColor Yellow
                Write-Host $deploymentsOutput -ForegroundColor Yellow
            }
        } else {
            Write-Error "Could not list deployments"
            Write-Host "Error output:" -ForegroundColor Red
            Write-Host $deploymentsOutput -ForegroundColor Red
        }
    } catch {
        Write-Error "Failed to list deployments: $($_.Exception.Message)"
    }
    
    exit 0
}

# Step 4: Get deployment ID (if not provided)
if (-not $DeploymentId) {
    Write-Step "Getting latest deployment..."
    try {
        $deploymentsCmd = "netlify api listSiteDeploys --data=`"{\`"site_id\`": \`"$SiteId\`"}`""
        $deploymentsOutput = Invoke-Expression $deploymentsCmd 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            try {
                $deployments = $deploymentsOutput | ConvertFrom-Json
                $latestDeploy = $deployments | Where-Object { $_.state -eq "ready" } | Select-Object -First 1
                
                if ($latestDeploy) {
                    $DeploymentId = $latestDeploy.id
                    Write-Success "Found latest deployment: $DeploymentId"
                    Write-Info "Deployment URL: $($latestDeploy.deploy_url)"
                } else {
                    Write-Error "No ready deployments found"
                    exit 1
                }
            } catch {
                Write-Error "Could not parse deployments"
                exit 1
            }
        } else {
            Write-Error "Could not get deployments"
            exit 1
        }
    } catch {
        Write-Error "Failed to get latest deployment: $($_.Exception.Message)"
        exit 1
    }
}

# Step 5: Confirm rollback
if (-not $Force) {
    Write-Warning "⚠️ ROLLBACK CONFIRMATION ⚠️"
    Write-Host "This will rollback to deployment: $DeploymentId"
    Write-Host "This action cannot be easily undone."
    Write-Host ""
    
    $confirmation = Read-Host "Are you sure you want to proceed? (yes/no)"
    if ($confirmation -ne "yes" -and $confirmation -ne "y") {
        Write-Info "Rollback cancelled"
        exit 0
    }
}

# Step 6: Perform rollback
Write-Step "Performing rollback..."
try {
    $rollbackCmd = "netlify rollback --site=$SiteId --deploy=$DeploymentId"
    Write-Info "Running: $rollbackCmd"
    
    $rollbackOutput = Invoke-Expression $rollbackCmd 2>&1
    $rollbackExitCode = $LASTEXITCODE
    
    if ($rollbackExitCode -eq 0) {
        Write-Success "Rollback completed successfully!"
        Write-Host "Rollback output:" -ForegroundColor Green
        Write-Host $rollbackOutput -ForegroundColor Green
        
        # Extract new deployment URL if available
        $newUrl = ""
        $rollbackLines = $rollbackOutput -split "`n"
        foreach ($line in $rollbackLines) {
            if ($line -match "https://.*\.netlify\.app") {
                $newUrl = $line.Trim()
                break
            }
        }
        
        if ($newUrl) {
            Write-Success "New deployment URL: $newUrl"
        }
        
    } else {
        Write-Error "Rollback failed with exit code: $rollbackExitCode"
        Write-Host "Rollback output:" -ForegroundColor Red
        Write-Host $rollbackOutput -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Error "Rollback failed with exception: $($_.Exception.Message)"
    exit 1
}

# Step 7: Verify rollback
Write-Step "Verifying rollback..."
if ($newUrl) {
    try {
        Write-Info "Testing rolled back deployment: $newUrl"
        $response = Invoke-WebRequest -Uri $newUrl -Method Head -TimeoutSec 30
        
        if ($response.StatusCode -eq 200) {
            Write-Success "Rollback verification successful (HTTP $($response.StatusCode))"
        } else {
            Write-Warning "Rollback verification returned status: $($response.StatusCode)"
        }
    } catch {
        Write-Warning "Could not verify rollback: $($_.Exception.Message)"
    }
}

# Step 8: Save rollback information
$rollbackInfo = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    SiteId = $SiteId
    DeploymentId = $DeploymentId
    NewUrl = $newUrl
    Success = $rollbackExitCode -eq 0
}

$rollbackInfo | ConvertTo-Json | Out-File "rollback-info.json" -Encoding UTF8
Write-Info "Rollback information saved to: rollback-info.json"

# Step 9: Summary
Write-Host ""
Write-Host "🔄 ROLLBACK SUMMARY" -ForegroundColor Magenta
Write-Host "==================" -ForegroundColor Magenta

if ($rollbackExitCode -eq 0) {
    Write-Success "✅ Rollback completed successfully"
    Write-Success "✅ Site ID: $SiteId"
    Write-Success "✅ Deployment ID: $DeploymentId"
    if ($newUrl) {
        Write-Success "✅ New URL: $newUrl"
    }
    Write-Success "✅ Info saved: rollback-info.json"
} else {
    Write-Error "❌ Rollback failed"
    Write-Error "❌ Check the error messages above"
}

Write-Host ""
Write-Info "Next steps:"
Write-Info "1. Test the rolled back deployment"
Write-Info "2. Run test-deployment.ps1 to verify functionality"
Write-Info "3. Check for any issues with the previous version"
Write-Host ""

Write-Info "Rollback completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
