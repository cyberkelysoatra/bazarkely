# CURSOR 2.0 - MULTI-AGENT WORKTREES SETUP
# Script PowerShell pour BazarKELY
# Date: 31 octobre 2025
# Usage: .\setup-multiagent-test.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CURSOR 2.0 - MULTI-AGENT PARALLEL TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$projectPath = "D:\bazarkely-2"
$parentDir = "D:\"

# Vérifier qu'on est dans le bon répertoire
Write-Host "📂 Vérification du répertoire projet..." -ForegroundColor Yellow
if (-not (Test-Path $projectPath)) {
    Write-Host "❌ ERREUR: Le projet n'existe pas à $projectPath" -ForegroundColor Red
    exit 1
}

Set-Location $projectPath
Write-Host "✅ Répertoire projet trouvé: $projectPath" -ForegroundColor Green
Write-Host ""

# Vérifier qu'on est dans un dépôt Git
Write-Host "🔍 Vérification dépôt Git..." -ForegroundColor Yellow
$gitCheck = git rev-parse --git-dir 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERREUR: Pas un dépôt Git valide" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dépôt Git valide" -ForegroundColor Green
Write-Host ""

# Vérifier qu'il n'y a pas de modifications non commitées
Write-Host "🔍 Vérification état Git..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  ATTENTION: Vous avez des modifications non commitées" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Modifications détectées:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $continue = Read-Host "Voulez-vous continuer quand même ? (O/N)"
    if ($continue -ne "O" -and $continue -ne "o") {
        Write-Host "❌ Opération annulée" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Aucune modification non commitée" -ForegroundColor Green
}
Write-Host ""

# Définir les 3 tâches parallèles
$task1 = @{
    Name = "fix-category-filter"
    Branch = "fix-category-filter-conservative"
    Path = "$parentDir\bazarkely-fix-filter"
    Description = "Fix bug filtrage catégorie (approche conservative)"
    Color = "Green"
}

$task2 = @{
    Name = "add-loading-indicator"
    Branch = "feature-loading-indicator"
    Path = "$parentDir\bazarkely-loading"
    Description = "Ajouter indicateur chargement TransactionsPage"
    Color = "Blue"
}

$task3 = @{
    Name = "add-csv-export"
    Branch = "feature-csv-export"
    Path = "$parentDir\bazarkely-export"
    Description = "Ajouter bouton export CSV transactions"
    Color = "Magenta"
}

$tasks = @($task1, $task2, $task3)

# Nettoyer les worktrees existants si présents
Write-Host "🧹 Nettoyage des worktrees existants..." -ForegroundColor Yellow
foreach ($task in $tasks) {
    if (Test-Path $task.Path) {
        Write-Host "  → Suppression de $($task.Path)" -ForegroundColor Gray
        git worktree remove $task.Path --force 2>$null
        if (Test-Path $task.Path) {
            Remove-Item -Path $task.Path -Recurse -Force
        }
    }
    # Supprimer la branche si elle existe
    git branch -D $task.Branch 2>$null
}
Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
Write-Host ""

# Créer les 3 worktrees
Write-Host "🌳 Création des 3 Git Worktrees..." -ForegroundColor Cyan
Write-Host ""

foreach ($task in $tasks) {
    Write-Host "[$($task.Name)]" -ForegroundColor $task.Color
    Write-Host "  Description: $($task.Description)" -ForegroundColor Gray
    Write-Host "  Branche: $($task.Branch)" -ForegroundColor Gray
    Write-Host "  Chemin: $($task.Path)" -ForegroundColor Gray
    
    # Créer le worktree avec nouvelle branche
    $result = git worktree add -b $task.Branch $task.Path 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Worktree créé avec succès" -ForegroundColor Green
    } else {
        Write-Host "  ❌ ERREUR lors de la création du worktree" -ForegroundColor Red
        Write-Host "  $result" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

Write-Host "✅ Les 3 worktrees ont été créés avec succès!" -ForegroundColor Green
Write-Host ""

# Afficher les worktrees créés
Write-Host "📋 Liste des worktrees actifs:" -ForegroundColor Cyan
git worktree list
Write-Host ""

# Lancer les 3 instances Cursor
Write-Host "🚀 Lancement des 3 instances Cursor..." -ForegroundColor Cyan
Write-Host ""

foreach ($task in $tasks) {
    Write-Host "  → Lancement Cursor pour: $($task.Name)" -ForegroundColor $task.Color
    
    # Lancer Cursor en arrière-plan
    Start-Process "cursor" -ArgumentList $task.Path -WindowStyle Normal
    
    # Petit délai pour éviter de surcharger le système
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "✅ Les 3 instances Cursor ont été lancées!" -ForegroundColor Green
Write-Host ""

# Générer les prompts pour chaque tâche
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📝 PROMPTS POUR CHAQUE AGENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "AGENT 1 - FIX CATEGORY FILTER" -ForegroundColor Green
Write-Host "Fenêtre Cursor: $($task1.Path)" -ForegroundColor Gray
Write-Host ""
Write-Host "PROMPT À COPIER:" -ForegroundColor Yellow
Write-Host @"
CONTEXT: Fix category filtering bug in TransactionsPage. The issue is a race condition in useEffect (lines 26-67 in frontend/src/pages/TransactionsPage.tsx). URL cleanup executes before filterCategory state is applied, causing filter to reset to 'all'. Project: BazarKELY (React + TypeScript + Supabase).

OBJECTIVE: Implement CONSERVATIVE approach - remove URL cleanup entirely, keep category parameter in URL for bookmarkability. Minimal code changes, maximum backward compatibility.

CONSTRAINTS:
- Modify ONLY useEffect hook (lines 26-67)
- Remove URL cleanup block (lines 59-66)
- Keep all other logic identical
- Test that clicking budget cards filters transactions correctly

CRITICAL SAFETY CONSTRAINTS:
- DO NOT modify filtering logic (lines 120-139)
- DO NOT change state declarations
- PRESERVE all existing filters (search, type, account)

OUTPUT FORMAT: Modified useEffect code ready to replace lines 26-67.

TESTING: Verify clicking budget card in BudgetsPage correctly filters transactions by category.
"@ -ForegroundColor White
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

Write-Host "AGENT 2 - LOADING INDICATOR" -ForegroundColor Blue
Write-Host "Fenêtre Cursor: $($task2.Path)" -ForegroundColor Gray
Write-Host ""
Write-Host "PROMPT À COPIER:" -ForegroundColor Yellow
Write-Host @"
CONTEXT: Add loading indicator to TransactionsPage while transactions are being fetched from database. Currently no visual feedback during data loading. Project: BazarKELY (React + TypeScript + Supabase).

OBJECTIVE: Add a loading state and spinner component that displays while transactions are being loaded from the database. Use Lucide React icons for spinner.

IMPLEMENTATION:
1. Add loading state: const [loading, setLoading] = useState(true)
2. Set loading to true before fetching transactions
3. Set loading to false after transactions loaded
4. Display spinner component while loading is true
5. Use existing design system colors and styling

CONSTRAINTS:
- File to modify: frontend/src/pages/TransactionsPage.tsx
- Use Lucide React Loader2 icon for spinner
- Spinner should be centered on page
- Keep existing layout and components
- Add spinner BEFORE the transactions list, not replace it

CRITICAL SAFETY CONSTRAINTS:
- DO NOT modify existing transaction fetching logic
- DO NOT change filtering functionality
- PRESERVE all existing features

OUTPUT FORMAT: Complete implementation with loading state and spinner component.

TESTING: Verify spinner shows briefly on page load, then disappears when transactions display.
"@ -ForegroundColor White
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

Write-Host "AGENT 3 - CSV EXPORT" -ForegroundColor Magenta
Write-Host "Fenêtre Cursor: $($task3.Path)" -ForegroundColor Gray
Write-Host ""
Write-Host "PROMPT À COPIER:" -ForegroundColor Yellow
Write-Host @"
CONTEXT: Add CSV export functionality to TransactionsPage allowing users to download filtered transactions as CSV file. Project: BazarKELY (React + TypeScript + Supabase).

OBJECTIVE: Add an "Export CSV" button that downloads the currently filtered transactions as a CSV file with proper formatting.

IMPLEMENTATION:
1. Add Export button in the header area next to Filter button
2. Create exportToCSV function that converts filteredTransactions to CSV format
3. CSV columns: Date, Description, Category, Type, Amount, Account
4. Use proper CSV escaping for commas and quotes in data
5. Trigger download with filename: transactions-YYYY-MM-DD.csv
6. Use Lucide React Download icon for button

CONSTRAINTS:
- File to modify: frontend/src/pages/TransactionsPage.tsx
- Export ONLY the filtered transactions (respect all active filters)
- Format dates as YYYY-MM-DD
- Format amounts with 2 decimals
- Button should match existing button styling (Filter, Sort buttons)

CRITICAL SAFETY CONSTRAINTS:
- DO NOT modify existing transaction data or state
- DO NOT change filtering functionality
- PRESERVE all existing features
- Ensure exported data matches displayed data

OUTPUT FORMAT: Complete implementation with Export button and CSV generation function.

TESTING: Verify clicking Export button downloads CSV with correct filtered data.
"@ -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Instructions finales
Write-Host "📋 INSTRUCTIONS D'UTILISATION:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Tu as maintenant 3 fenêtres Cursor ouvertes" -ForegroundColor Yellow
Write-Host "2. Dans chaque fenêtre:" -ForegroundColor Yellow
Write-Host "   - Ouvre un agent (Ctrl+I)" -ForegroundColor Gray
Write-Host "   - Copie le prompt correspondant ci-dessus" -ForegroundColor Gray
Write-Host "   - Lance l'agent" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Les 3 agents travailleront en PARALLÈLE!" -ForegroundColor Green
Write-Host ""
Write-Host "4. Après que les 3 agents ont terminé:" -ForegroundColor Yellow
Write-Host "   - Compare les résultats" -ForegroundColor Gray
Write-Host "   - Choisis les meilleures implémentations" -ForegroundColor Gray
Write-Host "   - Merge les branches dans main" -ForegroundColor Gray
Write-Host ""

# Créer le script de cleanup
$cleanupScript = @"
# CLEANUP SCRIPT - Nettoyer les worktrees après test
Write-Host "Nettoyage des worktrees..." -ForegroundColor Yellow

Set-Location "$projectPath"

# Supprimer les worktrees
git worktree remove "$($task1.Path)" --force
git worktree remove "$($task2.Path)" --force
git worktree remove "$($task3.Path)" --force

# Supprimer les branches
git branch -D $($task1.Branch)
git branch -D $($task2.Branch)
git branch -D $($task3.Branch)

Write-Host "✅ Nettoyage terminé!" -ForegroundColor Green
"@

$cleanupScript | Out-File -FilePath "$projectPath\cleanup-worktrees.ps1" -Encoding UTF8
Write-Host "💾 Script de nettoyage créé: cleanup-worktrees.ps1" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ SETUP MULTI-AGENT TERMINÉ!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Bon développement parallèle! 🚀" -ForegroundColor Magenta
