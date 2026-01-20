# 🚨 GUIDE DE SÉCURITÉ - INCIDENT CREDENTIALS EXPOSÉS

## ✅ ACTIONS DÉJÀ RÉALISÉES

### 1. **Nettoyage Git**

- ✅ Historique Git nettoyé avec `git filter-branch`
- ✅ Force push vers GitHub pour écraser l'historique compromis
- ✅ Plus aucune trace des credentials dans le repository

### 2. **Code Sécurisé**

- ✅ Nouveau script `migrate-mongodb.js` utilise uniquement des variables d'environnement
- ✅ Aucun credential en dur dans le code

## 🚨 ACTIONS OBLIGATOIRES À FAIRE MAINTENANT

### 1. **CHANGER LES MOTS DE PASSE MONGODB** (URGENT)

```bash
# Allez sur https://cloud.mongodb.com/
# 1. Database Access → Cliquez sur sebchappss_db_user → Edit User
# 2. Changez le mot de passe (générez un nouveau)
# 3. Database Access → Cliquez sur sebchappss_db_user_m2 → Edit User
# 4. Changez le mot de passe (générez un nouveau)
```

### 2. **VÉRIFIER LA SÉCURITÉ**

```bash
# Vérifiez que les credentials n'apparaissent plus sur GitHub
# Allez sur: https://github.com/Nox-archeo/hotsupermeet/search?q=mongodb+srv
```

### 3. **METTRE À JOUR LES VARIABLES D'ENVIRONNEMENT**

```bash
# Sur Render.com - Variables d'environnement
# Mettez à jour MONGODB_URI avec le nouveau mot de passe
MONGODB_URI=mongodb+srv://NOUVEAU_USER:NOUVEAU_PASS@cluster.mongodb.net/coolmeetv3
```

## 🔐 BONNES PRATIQUES POUR L'AVENIR

### ❌ NE JAMAIS FAIRE :

- Écrire des credentials en dur dans le code
- Committer des fichiers .env
- Pousser des URIs de base de données dans Git

### ✅ TOUJOURS FAIRE :

- Utiliser des variables d'environnement
- Ajouter .env dans .gitignore
- Vérifier le code avant commit

## 📱 UTILISATION DU SCRIPT SÉCURISÉ

```bash
# Définir les variables d'environnement
export SOURCE_MONGODB_URI="mongodb+srv://user:pass@source.mongodb.net/db"
export TARGET_MONGODB_URI="mongodb+srv://user:pass@target.mongodb.net/db"

# Lancer la migration
node migrate-mongodb.js
```

## 🔍 SURVEILLANCE

- ✅ MongoDB Atlas vous alertera si d'autres expositions surviennent
- ✅ GitHub peut scanner automatiquement pour les secrets exposés
- ✅ Activez les notifications de sécurité dans vos repositories

---

**Date incident:** $(date)  
**Résolution:** Immédiate - Historique Git nettoyé, credentials supprimés  
**Status:** ✅ Code sécurisé, ⚠️ Changement passwords requis
