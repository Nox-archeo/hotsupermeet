# Configuration MongoDB pour Render - Variables d'Environnement

## Variables d'environnement REQUISES dans Render :

### 1. MONGODB_URI (URI de connexion principale)

```
# ⚠️ ATTENTION: Ne jamais exposer la vraie URI MongoDB dans ce fichier !
# Utiliser uniquement des variables d'environnement dans Render

# Format: mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/DATABASE?retryWrites=true&w=majority
# Exemple sécurisé (pour documentation seulement):
mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/YOUR_DATABASE?retryWrites=true&w=majority
```

### 2. Variables de base

```
NODE_ENV=production
PORT=10000
CLIENT_URL=https://hotsupermeet.onrender.com
```

### 3. Sécurité

```
# ⚠️ ATTENTION: Générer un JWT_SECRET unique et sécurisé (32+ caractères)
JWT_SECRET=YOUR_STRONG_JWT_SECRET_HERE_AT_LEAST_32_CHARS_LONG
TOKEN_EXPIRY=7d
BCRYPT_ROUNDS=12
```

### 4. Uploads

```
UPLOAD_PATH=/tmp/uploads
MAX_FILE_SIZE=5242880
```

## Comment configurer dans Render :

1. Allez sur https://dashboard.render.com
2. Sélectionnez votre service "hotsupermeet"
3. Cliquez sur "Environment" dans le menu de gauche
4. Ajoutez ces variables EXACTEMENT comme indiqué ci-dessus
5. Redéployez le service

## Vérification dans MongoDB Atlas :

1. Connectez-vous à https://cloud.mongodb.com
2. Vérifiez que votre cluster "Cluster0" est actif
3. Dans "Network Access" → Assurez-vous que "0.0.0.0/0" est autorisé
4. Dans "Database Access" → Vérifiez que l'utilisateur "sebchappss_db_user" existe avec le bon mot de passe

## Test de connexion :

Une fois configuré, le log devrait afficher :

```
✅ MongoDB Atlas connecté avec succès
✅ Activation des routes API avec MongoDB
```

Si ça ne marche toujours pas, le problème vient de MongoDB Atlas, pas du code.
