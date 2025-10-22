# Configuration Cloudinary

## Étapes pour configurer le stockage d'images avec Cloudinary

### 1. Créer un compte Cloudinary

1. Aller sur [cloudinary.com](https://cloudinary.com)
2. Créer un compte gratuit
3. Noter vos identifiants depuis le Dashboard

### 2. Récupérer les variables d'environnement

Dans votre Dashboard Cloudinary, vous trouverez :

- **Cloud name** : votre nom de cloud unique
- **API Key** : votre clé API
- **API Secret** : votre secret API (à garder confidentiel)

### 3. Configurer les variables sur Render

Dans votre projet Render :

1. Aller dans Settings > Environment
2. Ajouter ces variables (remplacez par vos vraies valeurs) :

```
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

**⚠️ Important :** Remplacez `votre_cloud_name`, `votre_api_key` et `votre_api_secret` par vos vraies valeurs depuis votre Dashboard Cloudinary !

**Note :** Cloudinary affiche aussi `CLOUDINARY_URL=cloudinary://...` mais notre code utilise les 3 variables séparées ci-dessus.

### 4. Capacités et limites

**Plan gratuit Cloudinary :**

- 25 000 transformations/mois
- 25 GB stockage
- 25 GB bande passante
- CDN global inclus

**Pour plusieurs milliers d'utilisateurs :**

- Plan Standard (89$/mois) : 100K transformations, 100GB stockage
- Optimisations automatiques (WebP, AVIF)
- Redimensionnement à la volée
- CDN avec cache global

### 5. Fonctionnalités implémentées

- Upload automatique vers Cloudinary
- Optimisation automatique des images (800x800 max)
- Format adaptatif (WebP si supporté)
- URLs sécurisées HTTPS
- Stockage des métadonnées (taille, format, dimensions)
- Support de la suppression via public_id

### 6. Migration depuis base64

Les nouvelles photos seront automatiquement stockées sur Cloudinary.
Les anciennes photos en base64 continueront de fonctionner.
Pour migrer complètement, les utilisateurs devront re-uploader leurs photos.
