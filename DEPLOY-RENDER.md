# Guide de Déploiement HotMeet sur Render

## Configuration actuelle

Le projet est maintenant configuré pour le déploiement sur Render avec :

- ✅ Fichier `render.yaml` pour la configuration Blueprint
- ✅ `package.json` mis à jour avec les engines Node.js
- ✅ `server.js` configuré pour Render
- ✅ CSS amélioré pour toutes les pages (sauf l'accueil)

## Étapes de déploiement sur Render

### 1. Préparer le dépôt Git

```bash
git add .
git commit -m "Préparation déploiement Render"
git push origin main
```

### 2. Déployer sur Render

**Option A: Déploiement automatique avec Blueprint**

1. Allez sur [render.com](https://render.com)
2. Cliquez sur "New" → "Blueprint"
3. Connectez votre dépôt GitHub
4. Render détectera automatiquement le fichier `render.yaml`
5. Cliquez sur "Apply" pour déployer

**Option B: Déploiement manuel**

1. Allez sur [render.com](https://render.com)
2. Cliquez sur "New" → "Web Service"
3. Connectez votre dépôt GitHub
4. Configurez le service :
   - **Name**: `hotmeet`
   - **Environment**: `Node`
   - **Region**: `Frankfurt` (recommandé pour l'Europe)
   - **Branch**: `main`
   - **Root Directory**: `.`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Variables d'environnement (optionnel)

Pour la production, configurez ces variables dans Render Dashboard :

- `NODE_ENV=production`
- `CLIENT_URL=https://votre-domaine.render.com` (si vous avez un domaine personnalisé)

## Vérification du déploiement

Une fois déployé, vérifiez :

1. ✅ Le site est accessible via l'URL fournie par Render
2. ✅ La page d'accueil s'affiche correctement
3. ✅ Les pages internes (annuaire, messages, etc.) ont le nouveau design
4. ✅ Le health check (`/health`) fonctionne

## Résolution des problèmes courants

### Problème: Le site ressemble toujours à WordPress

**Solution**: Vérifiez que le CSS est bien chargé. Les pages utilisent maintenant `/css/pages.css?v=1`

### Problème: Erreurs de déploiement

**Solution**: Vérifiez les logs dans le dashboard Render. Les erreurs courantes incluent :

- Port déjà utilisé → Vérifiez la configuration du port
- Dépendances manquantes → `npm install` échoue

### Problème: Pages 404

**Solution**: Vérifiez que les routes dans `server.js` pointent vers les bons fichiers

## URLs de test après déploiement

- **Accueil**: `/`
- **Annuaire**: `/directory`
- **Messages**: `/messages`
- **Authentification**: `/auth`
- **Annonces**: `/ads`
- **Ce soir**: `/tonight`
- **Health Check**: `/health`

## Maintenance

Pour mettre à jour le site après déploiement :

```bash
git add .
git commit -m "Description des modifications"
git push origin main
```

Render déploiera automatiquement les nouvelles versions.

## Support

En cas de problème avec le déploiement, vérifiez :

1. Les logs dans le dashboard Render
2. La configuration des variables d'environnement
3. La compatibilité des versions Node.js (>=18.0.0)
