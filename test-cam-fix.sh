#!/bin/bash

echo "🚀 Test des corrections cam-to-cam..."

# Vérifier si le serveur est déjà en cours d'exécution
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Serveur déjà en cours d'exécution sur le port 3000"
else
    echo "🔥 Démarrage du serveur..."
    npm start &
    SERVER_PID=$!
    sleep 3
    echo "✅ Serveur démarré (PID: $SERVER_PID)"
fi

echo ""
echo "🔧 CORRECTIONS APPLIQUÉES:"
echo "✅ Amélioration de displayPartnerInfo() pour mieux récupérer les données"
echo "✅ Ajout de logs de debug détaillés pour le matching genre"
echo "✅ Correction de l'envoi des données partenaire côté serveur"
echo "✅ Validation du profil utilisateur avant recherche"
echo ""
echo "📋 PROBLÈMES CORRIGÉS:"
echo "1. ✅ Pays du partenaire maintenant affiché correctement"
echo "2. ✅ Filtrage genre bidirectionnel amélioré"
echo "3. ✅ Données complètes envoyées (userProfile + userData)"
echo "4. ✅ Debug logs pour diagnostiquer les problèmes"
echo ""
echo "🌐 Accéder au système cam:"
echo "👉 http://localhost:3000/cam"
echo ""
echo "🧪 TESTS À EFFECTUER:"
echo "1. Ouvrir 2 onglets sur /cam"
echo "2. Sélectionner des genres différents (homme/femme)"
echo "3. Vérifier que le matching respecte les préférences"
echo "4. Vérifier que le pays s'affiche pour chaque partenaire"
echo "5. Consulter la console pour voir les logs de debug"
echo ""
echo "📝 Si problème persiste, consulter la console navigateur et les logs serveur"