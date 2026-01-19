# 🚀 Migration MongoDB M10 → M2

Script complet et sécurisé pour migrer toutes vos données MongoDB du cluster M10 vers le cluster M2.

## 📋 Prérequis

### 1. MongoDB Database Tools

Les outils `mongodump` et `mongorestore` sont requis.

**Installation automatique (recommandée):**

```bash
node install-mongo-tools.js
```

**Installation manuelle:**

- Télécharger: https://docs.mongodb.com/database-tools/installation/
- Ajouter au PATH système

### 2. Dépendances Node.js

```bash
npm install mongodb
```

## 🎯 Utilisation

### Lancement de la migration

```bash
node migrate-mongodb.js
```

### Ce que fait le script :

1. ✅ **Test connexions** - Vérifie M10 et M2
2. ✅ **Export M10** - Sauvegarde dans `backup_m10/`
3. ✅ **Import M2** - Transfère toutes les données
4. ✅ **Vérification** - Compare les totaux
5. ✅ **Rapport** - Affiche les résultats

## 🔐 Sécurité

- ❌ **Aucune suppression** sur le cluster M10
- ✅ **Backup local** conservé dans `backup_m10/`
- ✅ **Vérification d'intégrité** automatique
- ✅ **Logs détaillés** pour traçabilité

## 📊 Données migrées

Toutes vos collections seront migrées :

- 👥 **users** - Profils utilisateurs
- 💬 **messages** - Messages et conversations
- 📢 **ads** - Publicités et annonces
- 🎯 **tonightevents** - Événements "Ce Soir"
- 💳 **subscriptions** - Abonnements premium
- 📸 **uploads** - Métadonnées des photos
- ⚙️ **Toutes autres collections**

## 🔍 Vérification post-migration

Le script affiche automatiquement :

```
✅ users: 1247 → 1247
✅ messages: 8432 → 8432
✅ ads: 156 → 156
🎉 MIGRATION RÉUSSIE!
```

## 🚨 En cas de problème

1. **Vérifiez les connexions** - Les URIs sont-elles correctes ?
2. **Droits d'accès** - L'utilisateur a-t-il les permissions ?
3. **Espace disque** - Suffisant pour le backup ?
4. **MongoDB Tools** - `mongodump --version` fonctionne ?

## 📞 Support

En cas d'erreur, les logs détaillent exactement où ça bloque. Le cluster M10 reste **toujours intact**.

---

**⚠️ Important:** Ce script ne supprime JAMAIS vos données existantes. En cas de doute, faites d'abord un test sur une base de données de développement.
