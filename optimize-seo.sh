#!/bin/bash

# Script d'optimisation SEO automatique pour HotSuperMeet
echo "🚀 SCRIPT D'OPTIMISATION SEO - HotSuperMeet"
echo "============================================="

# 1. Minification CSS
echo "📦 Minification des fichiers CSS..."
cleancss -o public/css/style.min.css public/css/style.css
cleancss -o public/css/animations.min.css public/css/animations.css  
cleancss -o public/css/responsive.min.css public/css/responsive.css

# 2. Calcul des gains de taille
STYLE_ORIGINAL=$(stat -f%z public/css/style.css)
STYLE_MINI=$(stat -f%z public/css/style.min.css)
GAIN_STYLE=$((($STYLE_ORIGINAL - $STYLE_MINI) * 100 / $STYLE_ORIGINAL))

echo "✅ CSS minifié avec succès !"
echo "   - style.css: ${STYLE_ORIGINAL} → ${STYLE_MINI} bytes (-${GAIN_STYLE}%)"

# 3. Audit Lighthouse automatique
echo "🔍 Lancement de l'audit SEO..."
lighthouse https://www.hotsupermeet.com --output json --output-path lighthouse-latest.json --chrome-flags="--headless" --no-enable-error-reporting --quiet

# 4. Affichage des scores
if [ -f "lighthouse-latest.json" ]; then
    echo "📊 Nouveaux scores :"
    node -e "
    const fs = require('fs');
    const report = JSON.parse(fs.readFileSync('lighthouse-latest.json', 'utf8'));
    console.log('   📈 PERFORMANCE:', Math.round(report.categories.performance.score * 100) + '/100');
    console.log('   🔍 SEO:', Math.round(report.categories.seo.score * 100) + '/100');
    console.log('   ♿ ACCESSIBILITÉ:', Math.round(report.categories.accessibility.score * 100) + '/100');
    console.log('   ✅ BONNES PRATIQUES:', Math.round(report.categories['best-practices'].score * 100) + '/100');
    "
fi

echo "🎯 Optimisation terminée !"
echo "Pour déployer les changements : git add . && git commit -m 'SEO: Optimisations automatiques' && git push"