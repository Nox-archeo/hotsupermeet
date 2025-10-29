# Configuration Gmail pour l'envoi d'emails automatiques

## Étapes pour configurer Gmail avec HotMeet

### 1. Activer l'authentification à deux facteurs (2FA)

1. Allez sur [Google Account](https://myaccount.google.com/)
2. Cliquez sur "Sécurité" dans le menu de gauche
3. Sous "Connexion à Google", cliquez sur "Validation en 2 étapes"
4. Suivez les instructions pour activer la 2FA

### 2. Créer un mot de passe d'application

1. Une fois la 2FA activée, retournez sur la page "Sécurité"
2. Descendez jusqu'à "Connexion à Google"
3. Cliquez sur "Mots de passe d'application"
4. Sélectionnez "Courrier" comme application
5. Sélectionnez "Autre (Nom personnalisé)" comme appareil
6. Entrez "HotMeet Server" comme nom
7. Cliquez sur "Générer"
8. Copiez le mot de passe de 16 caractères qui s'affiche

### 3. Configurer les variables d'environnement sur Render

1. Allez sur votre dashboard Render
2. Sélectionnez votre service HotMeet
3. Cliquez sur "Environment" dans le menu de gauche
4. Ajoutez les variables suivantes :

```
GMAIL_USER=hotsupermeet@gmail.com
GMAIL_PASSWORD=votre_mot_de_passe_d_application_ici
```

### 4. Test de la configuration

Une fois configuré, testez la fonctionnalité "Mot de passe oublié" sur le site. Un email devrait être envoyé à l'adresse fournie.

## Sécurité importante

- **Ne jamais partager** votre mot de passe d'application
- Le mot de passe d'application est différent de votre mot de passe Gmail normal
- Si vous suspectez une fuite, révoquez immédiatement le mot de passe d'application et générez-en un nouveau

## Dépannage

### Erreurs courantes :

1. **"Invalid login credentials"** : Vérifiez que le mot de passe d'application est correct
2. **"Less secure app blocked"** : Assurez-vous d'utiliser un mot de passe d'application, pas votre mot de passe normal
3. **"Quota exceeded"** : Gmail a des limites d'envoi (environ 100 emails/jour pour les comptes standards)

### Augmenter les limites d'envoi :

Pour envoyer plus d'emails, envisagez d'utiliser un service professionnel comme SendGrid ou Mailgun.

## Support

Si vous rencontrez des problèmes, contactez le support technique.
