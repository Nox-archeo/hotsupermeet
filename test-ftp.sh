#!/bin/bash

# Script de test de connexion FTP pour Infomaniak
echo "🔍 Test de connexion FTP vers Infomaniak..."

# Configuration FTP
FTP_HOST="al6rd7.ftp.infomaniak.com"
FTP_USER="al6rd7_system"
FTP_PASS="Lilith66.666"

echo "📡 Tentative de connexion à $FTP_HOST..."

# Test avec curl (méthode simple)
if command -v curl &> /dev/null; then
    echo "✅ Curl disponible - test en cours..."
    curl -u "$FTP_USER:$FTP_PASS" "ftp://$FTP_HOST/" --list-only --connect-timeout 10
    if [ $? -eq 0 ]; then
        echo "✅ Connexion FTP réussie avec curl"
    else
        echo "❌ Échec de la connexion avec curl"
    fi
fi

# Test avec ftp (méthode classique)
if command -v ftp &> /dev/null; then
    echo "📡 Test avec la commande ftp..."
    ftp -n $FTP_HOST << EOF
user $FTP_USER $FTP_PASS
ls
quit
EOF
    if [ $? -eq 0 ]; then
        echo "✅ Connexion FTP réussie avec ftp"
    else
        echo "❌ Échec de la connexion avec ftp"
    fi
fi

# Test avec lftp (méthode avancée)
if command -v lftp &> /dev/null; then
    echo "🔧 Test avec lftp..."
    lftp -c "
    set ftp:ssl-allow no
    open -u $FTP_USER,$FTP_PASS $FTP_HOST
    ls
    bye
    "
    if [ $? -eq 0 ]; then
        echo "✅ Connexion FTP réussie avec lftp"
    else
        echo "❌ Échec de la connexion avec lftp"
    fi
fi

echo "📊 Résumé du test de connexion FTP terminé"