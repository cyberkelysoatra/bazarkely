# Script d'archivage des fichiers AGENT-*.md
# Date: 2026-01-19
# Agent: Agent 02

Write-Host "📁 Création de la structure de dossiers..." -ForegroundColor Cyan

# Créer les dossiers d'archivage
$folders = @(
    "docs\agent-analysis\architecture",
    "docs\agent-analysis\data-models",
    "docs\agent-analysis\services",
    "docs\agent-analysis\ui",
    "docs\agent-analysis\calculations",
    "docs\agent-analysis\lifecycle"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    Write-Host "  ✅ Créé: $folder" -ForegroundColor Green
}

Write-Host "`n📦 Déplacement des fichiers archivables..." -ForegroundColor Cyan

# Architecture
$archFiles = @{
    "AGENT-02-DEPENDENCIES-ANALYSIS.md" = "docs\agent-analysis\architecture\"
    "AGENT-2-DEPENDENCIES-ANALYSIS.md" = "docs\agent-analysis\architecture\"
    "AGENT-3-DESIGN-ANALYSIS.md" = "docs\agent-analysis\architecture\"
    
    # Data Models
    "AGENT-03-GOAL-DATA-MODEL-ANALYSIS.md" = "docs\agent-analysis\data-models\"
    "AGENT-05-DATABASE-SCHEMA-ANALYSIS.md" = "docs\agent-analysis\data-models\"
    "AGENT-3-DATABASE-SCHEMA-PERSISTENCE-ANALYSIS.md" = "docs\agent-analysis\data-models\"
    
    # Services
    "AGENT-02-GOALSERVICE-ANALYSIS.md" = "docs\agent-analysis\services\"
    "AGENT-02-TRANSACTION-DATA-ANALYSIS.md" = "docs\agent-analysis\services\"
    
    # UI
    "AGENT-02-GOALS-UI-ANALYSIS.md" = "docs\agent-analysis\ui\"
    "AGENT-03-UI-PATTERNS-ANALYSIS.md" = "docs\agent-analysis\ui\"
    "AGENT-3-RECHARTS-INTEGRATION-ANALYSIS.md" = "docs\agent-analysis\ui\"
    
    # Calculations
    "AGENT-02-CALCULATION-LOGIC-ANALYSIS.md" = "docs\agent-analysis\calculations\"
    
    # Lifecycle
    "AGENT-01-CATEGORIES-SYSTEM-IDENTIFICATION.md" = "docs\agent-analysis\lifecycle\"
    "AGENT-01-GOAL-LIFECYCLE-ANALYSIS.md" = "docs\agent-analysis\lifecycle\"
}

$moved = 0
$skipped = 0

foreach ($file in $archFiles.Keys) {
    $source = $file
    $dest = $archFiles[$file]
    
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $dest -Force
        Write-Host "  ✅ Déplacé: $file -> $dest" -ForegroundColor Green
        $moved++
    } else {
        Write-Host "  ⚠️  Introuvable: $file" -ForegroundColor Yellow
        $skipped++
    }
}

Write-Host "`n📝 Mise à jour de .gitignore..." -ForegroundColor Cyan

$gitignoreRules = @"

# Temporary agent analysis files (diagnostics/investigations)
AGENT-*-INVESTIGATION.md
AGENT-*-VERIFICATION.md
AGENT-*-PROJECTION-CHART-ANALYSIS.md
AGENT-*-CELEBRATION-INVESTIGATION.md
AGENT-*-EUR-REFERENCE-LINE-INVESTIGATION.md
AGENT-*-DOCUMENTATION-VERIFICATION.md
"@

if (Test-Path ".gitignore") {
    $content = Get-Content ".gitignore" -Raw
    if ($content -notmatch "Temporary agent analysis files") {
        Add-Content -Path ".gitignore" -Value $gitignoreRules
        Write-Host "  ✅ Règles ajoutées à .gitignore" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  Règles déjà présentes dans .gitignore" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  .gitignore introuvable" -ForegroundColor Yellow
}

Write-Host "`n📊 Résumé:" -ForegroundColor Cyan
Write-Host "  ✅ Fichiers déplacés: $moved" -ForegroundColor Green
Write-Host "  ⚠️  Fichiers introuvables: $skipped" -ForegroundColor Yellow
Write-Host "`n💡 Fichiers temporaires à supprimer manuellement (après vérification):" -ForegroundColor Cyan
Write-Host "  - AGENT-02-CELEBRATION-INVESTIGATION.md" -ForegroundColor Yellow
Write-Host "  - AGENT-02-EUR-REFERENCE-LINE-INVESTIGATION.md" -ForegroundColor Yellow
Write-Host "  - AGENT-02-PROJECTION-CHART-ANALYSIS.md" -ForegroundColor Yellow
Write-Host "  - AGENT-03-DOCUMENTATION-VERIFICATION.md" -ForegroundColor Yellow
Write-Host "  - AGENT-3-DATABASE-SCHEMA-VERIFICATION.md" -ForegroundColor Yellow

Write-Host "`n✅ Archivage terminé!" -ForegroundColor Green
