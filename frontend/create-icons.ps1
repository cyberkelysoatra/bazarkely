# Script PowerShell pour créer des icônes PNG valides pour BazarKELY PWA

Write-Host "🎨 Création des icônes PWA pour BazarKELY..." -ForegroundColor Cyan

# Fonction pour créer un PNG minimal avec PowerShell
function Create-MinimalPNG {
    param(
        [int]$Width,
        [int]$Height,
        [string]$Filename
    )
    
    Write-Host "📐 Création de l'icône $Filename ($Width x $Height)" -ForegroundColor Yellow
    
    # Créer un PNG minimal avec les bonnes dimensions
    # Utiliser .NET pour créer un bitmap et le sauvegarder en PNG
    Add-Type -AssemblyName System.Drawing
    
    # Créer un bitmap avec les dimensions spécifiées
    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Créer un dégradé bleu-violet (couleurs BazarKELY)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        [System.Drawing.Point]::new(0, 0),
        [System.Drawing.Point]::new($Width, $Height),
        [System.Drawing.Color]::FromArgb(102, 126, 234),  # #667eea
        [System.Drawing.Color]::FromArgb(118, 75, 162)    # #764ba2
    )
    
    # Remplir le bitmap avec le dégradé
    $graphics.FillRectangle($brush, 0, 0, $Width, $Height)
    
    # Ajouter un cercle blanc au centre
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 255, 255, 255))
    $centerX = $Width / 2
    $centerY = $Height / 2
    $radius = [Math]::Min($Width, $Height) * 0.3
    $graphics.FillEllipse($whiteBrush, $centerX - $radius, $centerY - $radius, $radius * 2, $radius * 2)
    
    # Ajouter le texte "BK" au centre
    $font = New-Object System.Drawing.Font("Arial", [Math]::Min($Width, $Height) * 0.3, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $textFormat = New-Object System.Drawing.StringFormat
    $textFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $textFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $graphics.DrawString("BK", $font, $textBrush, $centerX, $centerY, $textFormat)
    
    # Ajouter une bordure subtile
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 255, 255, 255), 2)
    $graphics.DrawRectangle($pen, 1, 1, $Width - 2, $Height - 2)
    
    # Sauvegarder en PNG
    $filepath = Join-Path $PSScriptRoot "public\$Filename"
    $bitmap.Save($filepath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Nettoyer
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush.Dispose()
    $whiteBrush.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    $pen.Dispose()
    
    Write-Host "✅ Icône créée: $Filename" -ForegroundColor Green
}

# Créer les deux icônes
Create-MinimalPNG -Width 192 -Height 192 -Filename "icon-192x192.png"
Create-MinimalPNG -Width 512 -Height 512 -Filename "icon-512x512.png"

# Vérifier que les fichiers ont été créés
$icon192 = Join-Path $PSScriptRoot "public\icon-192x192.png"
$icon512 = Join-Path $PSScriptRoot "public\icon-512x512.png"

if (Test-Path $icon192 -and Test-Path $icon512) {
    $stats192 = Get-Item $icon192
    $stats512 = Get-Item $icon512
    
    Write-Host "📊 Vérification des icônes créées:" -ForegroundColor Cyan
    Write-Host "  icon-192x192.png: $($stats192.Length) bytes" -ForegroundColor White
    Write-Host "  icon-512x512.png: $($stats512.Length) bytes" -ForegroundColor White
    
    # Vérifier les en-têtes PNG
    $header192 = Get-Content $icon192 -Encoding Byte -TotalCount 8
    $header512 = Get-Content $icon512 -Encoding Byte -TotalCount 8
    
    $pngSignature = @(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
    
    $isValid192 = $true
    $isValid512 = $true
    
    for ($i = 0; $i -lt 8; $i++) {
        if ($header192[$i] -ne $pngSignature[$i]) { $isValid192 = $false }
        if ($header512[$i] -ne $pngSignature[$i]) { $isValid512 = $false }
    }
    
    if ($isValid192 -and $isValid512) {
        Write-Host "✅ En-têtes PNG valides détectés" -ForegroundColor Green
    } else {
        Write-Host "⚠️ En-têtes PNG non valides" -ForegroundColor Yellow
        Write-Host "Header 192: $($header192 | ForEach-Object { $_.ToString('X2') })" -ForegroundColor Yellow
        Write-Host "Header 512: $($header512 | ForEach-Object { $_.ToString('X2') })" -ForegroundColor Yellow
    }
    
    Write-Host "🎉 Icônes PWA générées avec succès !" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur: Icônes non créées" -ForegroundColor Red
    exit 1
}


