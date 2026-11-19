# DEPOSER-FICHE.ps1 (FICHE-CC-01)
# Puts one HTML supplier sheet online at https://1sakely.org/f/<32 hex>.html
# The sheet is stored in the Cloudflare KV namespace "fiches-1sakely" (never in git:
# the repository is public). Double-click "Deposer une fiche fournisseur.cmd" on the Desktop.
#   -Fichier <chemin>  : no file dialog (automation)
#   -SansPause         : do not wait for Enter at the end (automation)
param(
  [string]$Fichier,
  [switch]$SansPause
)

$ErrorActionPreference = 'Stop'
$NamespaceId = 'f4e46071d2e3476d894c34798ac996c6'
$AccountId   = 'c68b661aab7c30c86d7f0f079bdcfd46'
$Site        = 'https://1sakely.org/f/'
$TailleMax   = 5MB
$DossierJournal = Join-Path $env:USERPROFILE 'Documents\1sakely-fiches'
$Journal     = Join-Path $DossierJournal 'journal.csv'

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
Write-Host '  Déposer une fiche fournisseur sur 1sakely.org' -ForegroundColor Cyan
Write-Host '  ---------------------------------------------' -ForegroundColor Cyan

# 1. Choose the file
if (-not $Fichier) {
  Add-Type -AssemblyName System.Windows.Forms
  $boite = New-Object System.Windows.Forms.OpenFileDialog
  $boite.Title = 'Choisis la fiche à mettre en ligne (fichier .html)'
  $boite.Filter = 'Fiche HTML (*.html)|*.html'
  $boite.Multiselect = $false
  if ($boite.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
    Write-Host '  Aucun fichier choisi : rien n''a été mis en ligne.' -ForegroundColor Yellow
    Fin 0
  }
  $Fichier = $boite.FileName
}

if (-not (Test-Path -LiteralPath $Fichier -PathType Leaf)) { Erreur "fichier introuvable : $Fichier" }
$info = Get-Item -LiteralPath $Fichier
if ($info.Extension -ne '.html') { Erreur 'seuls les fichiers .html sont acceptés.' }
if ($info.Length -gt $TailleMax) { Erreur 'le fichier dépasse 5 Mo.' }
if ($info.Length -eq 0) { Erreur 'le fichier est vide.' }
Write-Host "  Fichier : $($info.Name)"

# 2. Warn when the "noindex" tag is missing
$texte = [System.IO.File]::ReadAllText($info.FullName, [System.Text.Encoding]::UTF8)
if ($texte -notmatch '<meta[^>]+name\s*=\s*["'']robots["''][^>]*noindex') {
  Write-Host '  ATTENTION : la balise <meta name="robots" content="noindex"> manque dans la fiche.' -ForegroundColor Yellow
  Write-Host '  La fiche reste privée (adresse secrète, en-tête noindex envoyé par le site), on continue.' -ForegroundColor Yellow
}

# 3. Random key: 16 cryptographic bytes = 32 hex characters
$octets = New-Object byte[] 16
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($octets)
$rng.Dispose()
$cle = -join ($octets | ForEach-Object { $_.ToString('x2') })
$adresse = "$Site$cle.html"

# 4. Upload (copy to an ASCII temp name first: npx mangles accented paths)
$tmp = Join-Path $env:TEMP "fiche-$cle.html"
Copy-Item -LiteralPath $info.FullName -Destination $tmp -Force
$env:CLOUDFLARE_ACCOUNT_ID = $AccountId
Write-Host '  Envoi vers Cloudflare...'
Push-Location $env:USERPROFILE
try {
  $sortie = & npx.cmd --yes wrangler@4 kv key put --namespace-id $NamespaceId $cle --path $tmp --remote 2>&1
  $codeEnvoi = $LASTEXITCODE
} finally {
  Pop-Location
}
if ($codeEnvoi -ne 0) {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  $sortie | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
  Erreur 'l''envoi a échoué. Si le message parle de connexion, lance « npx wrangler login » puis recommence.'
}

# 5. Check the published page: 200 and same SHA-256
$empreinte = (Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash
$recu = Join-Path $env:TEMP "fiche-$cle-recue.html"
$ok = $false
for ($i = 1; $i -le 12; $i++) {
  $code = & curl.exe -s -o $recu -w '%{http_code}' $adresse
  if ($code -eq '200' -and (Test-Path -LiteralPath $recu) -and ((Get-FileHash -LiteralPath $recu -Algorithm SHA256).Hash -eq $empreinte)) { $ok = $true; break }
  Start-Sleep -Seconds 5
}
Remove-Item -LiteralPath $tmp, $recu -Force -ErrorAction SilentlyContinue
if (-not $ok) { Erreur "la fiche a été envoyée mais l'adresse ne la montre pas encore (dernier code : $code). Réessaie l'adresse dans une minute : $adresse" }

# 6. Clipboard, big display, journal
Set-Clipboard -Value $adresse
if (-not (Test-Path -LiteralPath $DossierJournal)) { New-Item -ItemType Directory -Path $DossierJournal -Force | Out-Null }
if (-not (Test-Path -LiteralPath $Journal)) { 'date;action;fichier;adresse' | Out-File -LiteralPath $Journal -Encoding utf8 }
"$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss');depot;$($info.Name);$adresse" | Out-File -LiteralPath $Journal -Encoding utf8 -Append

Write-Host ''
Write-Host '  ==========================================================================' -ForegroundColor Green
Write-Host '   FICHE EN LIGNE' -ForegroundColor Green
Write-Host ''
Write-Host "   $adresse" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ''
Write-Host '   Adresse copiée : colle-la dans WhatsApp' -ForegroundColor Green
Write-Host '  ==========================================================================' -ForegroundColor Green
Write-Host "  (noté dans $Journal)"
Fin 0
