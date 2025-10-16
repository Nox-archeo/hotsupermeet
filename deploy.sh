#!/bin/bash

# Script de déploiement automatique pour HotSuperMeet sur Infomaniak
echo "🚀 Déploiement de HotSuperMeet sur Infomaniak..."

# Arrêter le serveur local s'il est en cours
echo "⏹️  Arrêt du serveur local..."
pkill -f "node server.js" || true

# Vérifier si les outils nécessaires sont installés
if ! command -v lftp &> /dev/null; then
    echo "❌ LFTP n'est pas installé. Installation en cours..."
    brew install lftp || sudo apt-get install lftp || echo "⚠️  Veuillez installer lftp manuellement"
fi

# Configuration FTP
FTP_HOST="al6rd7.ftp.infomaniak.com"
FTP_USER="al6rd7_system"
FTP_PASS="Lilith66.666"
REMOTE_PATH="/hotsupermeet.com//"

# Copier .env.production vers .env pour la production
echo "📝 Configuration de l'environnement de production..."
cp .env.production .env

# Créer la liste des fichiers à ignorer
echo "📋 Création de la liste des fichiers à ignorer..."
cat > .deploy-ignore << EOF
.vscode/
.git/
node_modules/
package-lock.json
.env.example
deploy.sh
.deploy-ignore
test-ftp.sh
EOF

# Synchroniser les fichiers avec LFTP avec vérification d'erreur
echo "📤 Upload des fichiers vers Infomaniak..."
if ! lftp -c "
open ftp://$FTP_USER:$FTP_PASS@$FTP_HOST
mirror -R -v -x .git/ -x node_modules/ -x .vscode/ -x package-lock.json -x .env.example -x deploy.sh -x .deploy-ignore -x test-ftp.sh . $REMOTE_PATH
bye
"; then
    echo "❌ ERREUR: Échec de l'upload FTP"
    exit 1
fi

# Vérifier que les fichiers clés sont bien uploadés
echo "🔍 Vérification des fichiers uploadés..."
if ! lftp -c "
open ftp://$FTP_USER:$FTP_PASS@$FTP_HOST
ls $REMOTE_PATH/public/css/style.css
ls $REMOTE_PATH/public/pages/index.html
ls $REMOTE_PATH/server.js
bye
" > /dev/null 2>&1; then
    echo "❌ ERREUR: Fichiers manquants après déploiement"
    exit 1
fi

echo "✅ Vérification FTP réussie"

# Nettoyer
rm -f .deploy-ignore
rm -f .env  # Supprimer le .env local après déploiement

echo "✅ Déploiement terminé !"
echo "🌐 Vérifiez votre site sur https://hotsupermeet.com"
echo "🔧 Pensez à redémarrer l'application dans votre panneau Infomaniak"