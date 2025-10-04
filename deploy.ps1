# Script de déploiement BazarKELY pour Hostinger (PowerShell)
# Usage: .\deploy.ps1

Write-Host "🚀 Déploiement de BazarKELY sur Hostinger..." -ForegroundColor Green

# Configuration
$FRONTEND_DIR = "frontend\dist"
$BACKEND_DIR = "backend\dist"
$DEPLOY_DIR = "dist"
$BASE_PATH = "/bazarkely"

# Nettoyer le répertoire de déploiement
Write-Host "🧹 Nettoyage du répertoire de déploiement..." -ForegroundColor Yellow
if (Test-Path $DEPLOY_DIR) {
    Remove-Item -Recurse -Force $DEPLOY_DIR
}
New-Item -ItemType Directory -Path $DEPLOY_DIR | Out-Null

# Copier le frontend
Write-Host "📦 Copie du frontend..." -ForegroundColor Yellow
Copy-Item -Recurse -Path "$FRONTEND_DIR\*" -Destination $DEPLOY_DIR

# Copier les fichiers de configuration
Write-Host "⚙️ Copie des fichiers de configuration..." -ForegroundColor Yellow
Copy-Item "package.json" $DEPLOY_DIR

# Créer le répertoire backend
Write-Host "🔧 Préparation du backend..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$DEPLOY_DIR\backend" | Out-Null
Copy-Item -Recurse -Path "$BACKEND_DIR\*" -Destination "$DEPLOY_DIR\backend"
Copy-Item "backend\package.json" "$DEPLOY_DIR\backend"

# Copier la base de données SQLite
Write-Host "🗄️ Copie de la base de données..." -ForegroundColor Yellow
if (Test-Path "backend\bazarkely.db") {
    Copy-Item "backend\bazarkely.db" "$DEPLOY_DIR\backend"
}

# Créer le script de démarrage du backend
Write-Host "📝 Création du script de démarrage..." -ForegroundColor Yellow
$startScript = @"
#!/bin/bash
cd backend
npm install --production
node index.js &
echo `$! > backend.pid
"@
$startScript | Out-File -FilePath "$DEPLOY_DIR\start-backend.sh" -Encoding UTF8

# Créer le script d'arrêt du backend
$stopScript = @"
#!/bin/bash
if [ -f backend/backend.pid ]; then
    kill `$(cat backend/backend.pid)
    rm backend/backend.pid
    echo "Backend arrêté"
fi
"@
$stopScript | Out-File -FilePath "$DEPLOY_DIR\stop-backend.sh" -Encoding UTF8

# Créer le fichier de configuration de production
Write-Host "🔐 Création de la configuration de production..." -ForegroundColor Yellow
$envConfig = @"
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=bazarkely_user
DB_PASSWORD=secure_password_here
DB_NAME=bazarkely_db
JWT_SECRET=ultra_secure_jwt_secret_256_bits_minimum_for_bazarkely_production
JWT_REFRESH_SECRET=ultra_secure_refresh_secret_256_bits_minimum_for_bazarkely_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=encryption_key_for_sensitive_data_32_chars
CORS_ORIGIN=https://votre-domaine.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
SESSION_SECRET=session_secret_for_express_sessions_bazarkely_production
API_VERSION=v1
API_PREFIX=/api
LOG_LEVEL=info
LOG_FORMAT=combined
SYNC_BATCH_SIZE=50
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY=5000
MOBILE_MONEY_UPDATE_INTERVAL=86400000
MOBILE_MONEY_CACHE_TTL=3600000
"@
$envConfig | Out-File -FilePath "$DEPLOY_DIR\backend\.env" -Encoding UTF8

# Créer le README de déploiement
Write-Host "📚 Création de la documentation de déploiement..." -ForegroundColor Yellow
$readmeContent = @"
# Déploiement BazarKELY sur Hostinger

## 📋 Prérequis
- Compte Hostinger avec accès SSH
- Node.js installé sur le serveur
- Base de données MySQL configurée

## 🚀 Installation

### 1. Upload des fichiers
Uploadez tous les fichiers du répertoire `deploy/` vers `/public_html/bazarkely/`

### 2. Configuration de la base de données
```bash
# Se connecter au serveur
ssh votre-utilisateur@votre-domaine.com

# Aller dans le répertoire
cd public_html/bazarkely

# Démarrer le backend
./start-backend.sh

# Vérifier que le backend fonctionne
curl http://localhost:3001/api/health
```

### 3. Configuration Apache
Le fichier `.htaccess` est déjà configuré pour :
- Redirection HTTPS
- Base path `/bazarkely/`
- Proxy API vers le backend Node.js
- Cache et compression
- Headers de sécurité

### 4. Configuration de la base de données
Modifiez le fichier `backend/.env` avec vos paramètres de base de données :
```env
DB_HOST=votre-host-mysql
DB_USER=votre-utilisateur-mysql
DB_PASSWORD=votre-mot-de-passe-mysql
DB_NAME=bazarkely_db
```

### 5. Initialisation de la base de données
```bash
cd backend
node scripts/init-db.js
```

## 🔧 Gestion du Backend

### Démarrer le backend
```bash
./start-backend.sh
```

### Arrêter le backend
```bash
./stop-backend.sh
```

### Vérifier le statut
```bash
ps aux | grep node
```

## 🌐 URLs d'accès
- **Frontend** : https://votre-domaine.com/bazarkely/
- **API** : https://votre-domaine.com/bazarkely/api/
- **Health Check** : https://votre-domaine.com/bazarkely/api/health

## 🔍 Dépannage

### Logs du backend
```bash
cd backend
npm start
```

### Vérifier la base de données
```bash
cd backend
node scripts/test-db.js
```

### Redémarrer Apache
```bash
sudo systemctl restart apache2
```

## 📞 Support
En cas de problème, vérifiez :
1. Les logs du backend
2. La configuration de la base de données
3. Les permissions des fichiers
4. La configuration Apache
"@
$readmeContent | Out-File -FilePath "$DEPLOY_DIR\DEPLOYMENT.md" -Encoding UTF8

# Calculer la taille du déploiement
$deploySize = (Get-ChildItem -Recurse $DEPLOY_DIR | Measure-Object -Property Length -Sum).Sum
$deploySizeMB = [math]::Round($deploySize / 1MB, 2)

Write-Host "✅ Déploiement préparé dans le répertoire '$DEPLOY_DIR'" -ForegroundColor Green
Write-Host "📁 Taille du déploiement : $deploySizeMB MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Prochaines étapes :" -ForegroundColor Yellow
Write-Host "1. Uploadez le contenu de 'dist' vers votre serveur Hostinger" -ForegroundColor White
Write-Host "2. Configurez la base de données MySQL" -ForegroundColor White
Write-Host "3. Modifiez le fichier backend/.env avec vos paramètres" -ForegroundColor White
Write-Host "4. Démarrez le backend avec ./start-backend.sh" -ForegroundColor White
Write-Host "5. Testez l'application sur https://votre-domaine.com/bazarkely/" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Déploiement prêt !" -ForegroundColor Green
