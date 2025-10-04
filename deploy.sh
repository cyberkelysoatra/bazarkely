#!/bin/bash

# Script de déploiement BazarKELY pour Hostinger
# Usage: ./deploy.sh

echo "🚀 Déploiement de BazarKELY sur Hostinger..."

# Configuration
FRONTEND_DIR="frontend/dist"
BACKEND_DIR="backend/dist"
DEPLOY_DIR="deploy"
BASE_PATH="/bazarkely"

# Nettoyer le répertoire de déploiement
echo "🧹 Nettoyage du répertoire de déploiement..."
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copier le frontend
echo "📦 Copie du frontend..."
cp -r $FRONTEND_DIR/* $DEPLOY_DIR/

# Copier les fichiers de configuration
echo "⚙️ Copie des fichiers de configuration..."
cp .htaccess $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/

# Créer le répertoire backend
echo "🔧 Préparation du backend..."
mkdir -p $DEPLOY_DIR/backend
cp -r $BACKEND_DIR/* $DEPLOY_DIR/backend/
cp backend/package.json $DEPLOY_DIR/backend/
cp backend/package-lock.json $DEPLOY_DIR/backend/ 2>/dev/null || true

# Copier la base de données SQLite
echo "🗄️ Copie de la base de données..."
cp backend/bazarkely.db $DEPLOY_DIR/backend/ 2>/dev/null || true

# Créer le script de démarrage du backend
echo "📝 Création du script de démarrage..."
cat > $DEPLOY_DIR/start-backend.sh << 'EOF'
#!/bin/bash
cd backend
npm install --production
node index.js &
echo $! > backend.pid
EOF

chmod +x $DEPLOY_DIR/start-backend.sh

# Créer le script d'arrêt du backend
cat > $DEPLOY_DIR/stop-backend.sh << 'EOF'
#!/bin/bash
if [ -f backend/backend.pid ]; then
    kill $(cat backend/backend.pid)
    rm backend/backend.pid
    echo "Backend arrêté"
fi
EOF

chmod +x $DEPLOY_DIR/stop-backend.sh

# Créer le fichier de configuration de production
echo "🔐 Création de la configuration de production..."
cat > $DEPLOY_DIR/backend/.env << 'EOF'
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
EOF

# Créer le README de déploiement
echo "📚 Création de la documentation de déploiement..."
cat > $DEPLOY_DIR/DEPLOYMENT.md << 'EOF'
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
EOF

echo "✅ Déploiement préparé dans le répertoire '$DEPLOY_DIR'"
echo "📁 Taille du déploiement : $(du -sh $DEPLOY_DIR | cut -f1)"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Uploadez le contenu de '$DEPLOY_DIR' vers votre serveur Hostinger"
echo "2. Configurez la base de données MySQL"
echo "3. Modifiez le fichier backend/.env avec vos paramètres"
echo "4. Démarrez le backend avec ./start-backend.sh"
echo "5. Testez l'application sur https://votre-domaine.com/bazarkely/"
echo ""
echo "🎉 Déploiement prêt !"
