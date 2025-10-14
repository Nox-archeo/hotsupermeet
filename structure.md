# Structure des Dossiers HotMeet

## Arborescence Complète

```
hotmeet-deepsitev3/
├── public/                          # Front-end statique
│   ├── css/                        # Styles CSS
│   │   ├── style.css               # Style principal
│   │   ├── responsive.css          # Media queries
│   │   └── animations.css          # Animations
│   ├── js/                         # JavaScript
│   │   ├── app.js                  # Logique principale
│   │   ├── auth.js                 # Authentification
│   │   ├── directory.js            # Annuaire membres
│   │   ├── messages.js             # Messagerie
│   │   ├── ads.js                  # Annonces
│   │   ├── tonight.js              # Rencontres "Ce soir"
│   │   ├── cam.js                  # Cam-to-cam
│   │   └── premium.js              # Système premium
│   ├── images/                     # Images statiques
│   │   ├── logos/
│   │   ├── icons/
│   │   └── placeholders/           # Photos de démonstration
│   └── pages/                      # Pages HTML
│       ├── index.html              # Accueil
│       ├── auth.html               # Authentification
│       ├── profile.html            # Profil utilisateur
│       ├── directory.html          # Annuaire
│       ├── messages.html           # Messagerie
│       ├── ads.html                # Annonces
│       ├── tonight.html            # Rencontres "Ce soir"
│       ├── cam.html                # Cam-to-cam
│       ├── premium.html            # Abonnement
│       └── legal.html              # Mentions légales
├── server/                         # Back-end Node.js
│   ├── models/                     # Modèles MongoDB
│   │   ├── User.js                 # Utilisateur
│   │   ├── Message.js              # Message
│   │   ├── Ad.js                   # Annonce
│   │   └── TonightMeet.js          # Rencontre "Ce soir"
│   ├── routes/                     # Routes API
│   │   ├── auth.js                 # Authentification
│   │   ├── users.js                # Utilisateurs
│   │   ├── messages.js             # Messages
│   │   ├── ads.js                  # Annonces
│   │   ├── tonight.js              # Rencontres "Ce soir"
│   │   └── payments.js             # Paiements
│   ├── middleware/                 # Middleware
│   │   ├── auth.js                 # Vérification JWT
│   │   ├── validation.js           # Validation données
│   │   └── errorHandler.js         # Gestion erreurs
│   ├── controllers/                # Contrôleurs
│   │   ├── authController.js       # Authentification
│   │   ├── userController.js       # Utilisateurs
│   │   ├── messageController.js    # Messages
│   │   ├── adController.js         # Annonces
│   │   ├── tonightController.js    # Rencontres "Ce soir"
│   │   └── paymentController.js    # Paiements
│   ├── config/                     # Configuration
│   │   ├── database.js             # Connexion MongoDB
│   │   ├── paypal.js               # Configuration PayPal
│   │   └── webrtc.js               # Configuration WebRTC
│   ├── utils/                      # Utilitaires
│   │   ├── generateDemoData.js     # Génération profils démo
│   │   ├── emailService.js         # Service email
│   │   └── security.js             # Fonctions sécurité
│   └── app.js                      # Application principale
├── uploads/                        # Uploads utilisateurs
│   ├── profiles/                   # Photos de profil
│   └── ads/                        # Images annonces
├── docs/                           # Documentation
│   ├── deployment.md               # Déploiement Infomaniak
│   ├── api.md                      # Documentation API
│   └── seo.md                      # Guide SEO
├── .env.example                    # Variables d'environnement exemple
├── package.json                    # Dépendances Node.js
├── server.js                       Point d'entrée serveur
└── README.md                       Documentation projet
```

## Fichiers de Configuration Clés

### package.json
Dépendances principales :
- express (framework web)
- mongoose (ODM MongoDB)
- jsonwebtoken (JWT)
- bcryptjs (hashage mots de passe)
- cors (Cross-Origin Resource Sharing)
- dotenv (variables d'environnement)
- paypal-rest-sdk (intégration PayPal)

### .env.example
Variables d'environnement :
```
MONGODB_URI=mongodb://localhost:27017/hotmeet
JWT_SECRET=votre_secret_jwt
PAYPAL_CLIENT_ID=votre_client_id_paypal
PAYPAL_CLIENT_SECRET=votre_secret_paypal
PORT=3000
NODE_ENV=development
```

## Workflow de Développement

1. **Setup initial** : Créer structure + configuration
2. **Back-end** : Modèles → Routes → Contrôleurs → Middleware
3. **Front-end** : Pages HTML → CSS → JavaScript → Intégration API
4. **Fonctionnalités** : Authentification → Annuaire → Messagerie → Annonces → "Ce soir" → Cam
5. **Paiements** : Intégration PayPal → Système premium
6. **SEO** : Optimisation meta tags → Sitemap
7. **Tests** : Validation fonctionnalités → Correction bugs
8. **Déploiement** : Configuration Infomaniak → Mise en production

## Points d'Intégration API

### Front-end → Back-end
- Authentification JWT
- Appels AJAX vers endpoints REST
- Gestion état utilisateur (localStorage)
- Upload fichiers (photos)

### Back-end → Services Externes
- PayPal API (paiements)
- WebRTC (cam-to-cam)
- Service email (notifications)

Cette structure permet un développement modulaire et maintenable avec une séparation claire entre front-end et back-end.