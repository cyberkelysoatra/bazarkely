# RETIRER-FICHE.ps1 (FICHE-CC-01)
# Takes one supplier sheet offline: deletes its key from the Cloudflare KV namespace
# "fiches-1sakely", then checks that https://1sakely.org/f/<key>.html answers 404.
#   -Adresse <adresse ou clé> : no question (automation)
#   -SansPause                : do not wait for Enter at the end (automation)
param(
  [string]$Adresse,
  [switch]$SansPause
)

$ErrorActionPreference = 'Stop'
$NamespaceId = 'f4e46071d2e3476d894c34798ac996c6'
$AccountId   = 'c68b661aab7c30c86d7f0f079bdcfd46'
$Site        = 'https://1sakely.org/f/'
$Journal     = Join-Path $env:USERPROFILE 'Documents\1sakely-fiches\journal.csv'

function Fin([int]$code) {
  if (-not $SansPause) {
    Write-Host ''
    Read-Host 'Appuie sur Entrée pour fermer cette fenêtre' | Out-Null
  }
  exit $code
}

function Erreur([string]$message) {
  Write-Host ''
  Write-Host "  PROBLÈME : $message" -ForegroundColor Red
  Fin 1
}

Write-Host ''
Write-Host '  Retirer une fiche fournisseur de 1sakely.org' -ForegroundColor Cyan
Write-Host '  --------------------------------------------' -ForegroundColor Cyan

if (-not $Adresse) { $Adresse = Read-Host '  Colle l''adresse de la fiche (ou sa clé de 32 caractères)' }
$m = [regex]::Match(($Adresse.Trim().ToLower()), '([0-9a-f]{32})')
if (-not $m.Success) { Erreur 'je ne trouve pas de clé de 32 caractères dans ce que tu as collé.' }
$cle = $m.Groups[1].Value
$adresseFiche = "$Site$cle.html"
Write-Host "  Fiche : $adresseFiche"

$env:CLOUDFLARE_ACCOUNT_ID = $AccountId
Write-Host '  Suppression chez Cloudflare...'
Push-Location $env:USERPROFILE
try {
  $sortie = & npx.cmd --yes wrangler@4 kv key delete --namespace-id $NamespaceId $cle --remote 2>&1
  $codeSuppr = $LASTEXITCODE
} finally {
  Pop-Location
}
if ($codeSuppr -ne 0) {
  $sortie | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
  Erreur 'la suppression a échoué. Si le message parle de connexion, lance « npx wrangler login » puis recommence.'
}

# Cloudflare may keep the old copy up to about a minute: check for up to 2 minutes
$ferme = $false
for ($i = 1; $i -le 24; $i++) {
  $code = & curl.exe -s -o NUL -w '%{http_code}' $adresseFiche
  if ($code -eq '404') { $ferme = $true; break }
  Start-Sleep -Seconds 5
}

if (Test-Path -LiteralPath $Journal) {
  $etat = if ($ferme) { 'retrait' } else { 'retrait-non-verifie' }
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss');$etat;;$adresseFiche" | Out-File -LiteralPath $Journal -Encoding utf8 -Append
}

if (-not $ferme) { Erreur "la fiche est supprimée mais l'adresse répond encore (code $code). Réessaie l'adresse dans quelques minutes." }

Write-Host ''
Write-Host '  ==========================================================================' -ForegroundColor Green
Write-Host '   FICHE RETIRÉE : l''adresse répond maintenant « Fiche introuvable »' -ForegroundColor Green
Write-Host '  ==========================================================================' -ForegroundColor Green
Fin 0
