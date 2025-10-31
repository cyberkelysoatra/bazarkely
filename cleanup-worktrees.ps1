# CLEANUP SCRIPT - Nettoyer les worktrees après test
Write-Host "Nettoyage des worktrees..." -ForegroundColor Yellow

Set-Location "D:\bazarkely-2"

# Supprimer les worktrees
git worktree remove "D:\\bazarkely-fix-filter" --force
git worktree remove "D:\\bazarkely-loading" --force
git worktree remove "D:\\bazarkely-export" --force

# Supprimer les branches
git branch -D fix-category-filter-conservative
git branch -D feature-loading-indicator
git branch -D feature-csv-export

Write-Host "✅ Nettoyage terminé!" -ForegroundColor Green
