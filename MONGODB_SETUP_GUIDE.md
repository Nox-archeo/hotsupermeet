# Guide de Configuration MongoDB Atlas pour HotMeet

## Étape 1 : Créer un compte MongoDB Atlas

1. Allez sur https://www.mongodb.com/cloud/atlas
2. Créez un compte gratuit (cluster M0 - 512MB gratuit)
3. Répondez aux questions d'orientation (choisissez "JavaScript" et "Application web")

## Étape 2 : Configurer le cluster

1. Créez un nouveau cluster (gratuit M0)
2. Choisissez la région la plus proche (Europe de l'Ouest)
3. Attendez que le cluster soit créé (5-10 minutes)

## Étape 3 : Obtenir la chaîne de connexion

1. Cliquez sur "Connect" sur votre cluster
2. Choisissez "Connect your application"
3. Copiez la chaîne de connexion qui ressemble à :

```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## Étape 4 : Configurer les variables d'environnement

Remplacez dans le fichier `.env` la ligne MONGODB_URI par votre vraie chaîne de connexion :

```env
MONGODB_URI=mongodb+srv://votre_utilisateur:votre_mot_de_passe@cluster0.xxxxx.mongodb.net/hotmeet?retryWrites=true&w=majority
```

## Étape 5 : Configurer la sécurité

1. Dans Atlas, allez dans "Network Access"
2. Ajoutez votre IP (0.0.0.0/0 pour toutes les IPs temporairement)
3. Dans "Database Access", créez un utilisateur avec mot de passe

## Étape 6 : Activer MongoDB dans le serveur

Une fois la configuration terminée, redémarrez le serveur :

```bash
npm run dev
```

## Vérification

Le serveur devrait maintenant afficher :

```
✅ MongoDB connecté avec succès
```

Au lieu de :

```
🚀 Mode démo activé - MongoDB désactivé
```

## Problèmes courants

- **Erreur de connexion** : Vérifiez que votre IP est autorisée dans Network Access
- **Authentification échouée** : Vérifiez le nom d'utilisateur/mot de passe
- **Cluster non démarré** : Attendez que le cluster soit complètement créé

## Support

- Documentation MongoDB Atlas : https://docs.atlas.mongodb.com/
- Guide de connexion : https://docs.atlas.mongodb.com/tutorial/connect-to-your-cluster/
