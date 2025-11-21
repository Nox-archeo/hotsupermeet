# Variables d'Environnement - Bonnes Pratiques

## ⚠️ RÈGLES IMPORTANTES

### 🚫 À NE JAMAIS FAIRE

- ❌ Commiter le fichier `.env` sur GitHub
- ❌ Pousser des vraies valeurs dans `.env.example`
- ❌ Partager des clés API dans la documentation
- ❌ Stocker des mots de passe en plain text

### ✅ BONNES PRATIQUES

#### 1. Environnement Local (VS Code)

```bash
# 1. Copier le template
cp .env.example .env

# 2. Remplir avec vos vraies valeurs
# Éditer .env avec vos vraies clés (ce fichier reste local)
```

#### 2. Déploiement Render

- Utiliser le dashboard Render → Environment Variables
- Ne jamais mettre de `.env` sur Render
- Render gère automatiquement les variables d'environnement

#### 3. Génération de Secrets Sécurisés

```bash
# JWT Secret (64+ caractères)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# UUID pour webhook IDs
node -e "console.log(require('crypto').randomUUID())"
```

## 📁 Structure Recommandée

```
project/
├── .env.example          # ✅ Template générique (committé)
├── .env                  # ❌ Vraies valeurs (dans .gitignore)
├── .env.production       # ❌ Prod secrets (dans .gitignore)
└── .gitignore           # ✅ Contient .env*
```

## 🔒 Variables Critiques

### MongoDB

- **Local**: `mongodb://localhost:27017/dbname`
- **Atlas**: `mongodb+srv://user:password@cluster.mongodb.net/db`

### JWT Secret

- **Minimum**: 32 caractères aléatoires
- **Recommandé**: 64+ caractères hex

### Cloudinary

- Dashboard: https://cloudinary.com/console
- Ne jamais exposer API_SECRET

### PayPal

- Sandbox: https://developer.paypal.com/
- Production: Différentes clés client/secret

## 🚀 Configuration Render

Dans le dashboard Render, ajouter ces variables :

- `NODE_ENV=production`
- `MONGODB_URI=mongodb+srv://...`
- `JWT_SECRET=votre_secret_64_chars`
- `CLOUDINARY_*=vos_clés`
- `PAYPAL_*=vos_clés_prod`

## ✅ Vérification Sécurité

```bash
# Vérifier qu'aucun secret n'est committé
git log --oneline | head -5
grep -r "mongodb+srv://" . --exclude-dir=node_modules
grep -r "sk_" . --exclude-dir=node_modules  # Clés Stripe
grep -r "AIza" . --exclude-dir=node_modules # Clés Google
```
