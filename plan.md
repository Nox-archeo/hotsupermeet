# Plan de Développement - Site HotMeet

## Architecture Technique

### Stack Technologique
- **Front-end** : HTML5, CSS3, JavaScript (Vanilla)
- **Back-end** : Node.js + Express.js
- **Base de données** : MongoDB avec Mongoose
- **Authentification** : JWT (JSON Web Tokens)
- **Paiements** : PayPal API + préparation Segpay
- **WebRTC** : Pour fonctionnalité cam-to-cam
- **Hébergement** : Infomaniak (compatible Node.js/MongoDB)

### Structure du Projet
```
hotmeet-deepsitev3/
├── public/                 # Front-end statique
│   ├── css/
│   ├── js/
│   ├── images/
│   └── pages/             # Pages HTML principales
├── server/                 # Back-end Node.js
│   ├── models/            # Modèles MongoDB
│   ├── routes/            # Routes API
│   ├── middleware/        # Middleware JWT, etc.
│   ├── controllers/       # Logique métier
│   └── config/            # Configuration DB, PayPal
├── uploads/               # Photos utilisateurs
└── docs/                  # Documentation
```

## Modèles de Données MongoDB

### Utilisateur (User)
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashé),
  profile: {
    nom: String,
    age: Number,
    sexe: String,
    localisation: String,
    bio: String,
    pratiques: [String],
    photos: [String], // URLs des photos
    tenuePreferee: String,
    disponibilite: String
  },
  premium: {
    isPremium: Boolean,
    expiration: Date,
    paypalSubscriptionId: String
  },
  preferences: {
    ageMin: Number,
    ageMax: Number,
    sexeRecherche: String,
    pratiquesRecherchees: [String]
  },
  createdAt: Date,
  lastLogin: Date
}
```

### Message (Message)
```javascript
{
  _id: ObjectId,
  fromUserId: ObjectId,
  toUserId: ObjectId,
  content: String,
  provenance: String, // "annuaire", "annonces", "ce-soir"
  originalPostId: ObjectId, // Lien vers l'annonce originale
  read: Boolean,
  createdAt: Date
}
```

### Annonce (Ad)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: String, // "fantasme", "soiree", "service", "contenu"
  title: String,
  description: String,
  location: String,
  date: Date,
  criteria: {
    ageMin: Number,
    ageMax: Number,
    sexe: String,
    pratiques: [String]
  },
  premiumOnly: Boolean,
  createdAt: Date
}
```

### Rencontre "Ce Soir" (TonightMeet)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  location: String,
  tenue: String,
  messageCode: String,
  visibilityCriteria: {
    ageMin: Number,
    ageMax: Number,
    sexe: String,
    orientation: String,
    preferences: [String]
  },
  responses: [{
    userId: ObjectId,
    avis: String, // "plait", "non", "pourquoi-pas"
    createdAt: Date
  }],
  active: Boolean,
  createdAt: Date
}
```

## API RESTful Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/verify-age` - Vérification âge
- `GET /api/auth/me` - Profil utilisateur

### Utilisateurs
- `GET /api/users` - Liste utilisateurs (avec filtres)
- `GET /api/users/:id` - Profil utilisateur
- `PUT /api/users/profile` - Modifier profil

### Messages
- `GET /api/messages` - Messages reçus
- `POST /api/messages` - Envoyer message (premium)

### Annonces
- `GET /api/ads` - Liste annonces
- `POST /api/ads` - Créer annonce (premium)
- `GET /api/ads/:id` - Détail annonce

### Ce Soir
- `POST /api/tonight` - Créer rencontre
- `GET /api/tonight/active` - Rencontres actives
- `POST /api/tonight/:id/response` - Répondre

### Paiements
- `POST /api/payments/create-subscription` - Créer abonnement
- `POST /api/payments/webhook` - Webhook PayPal

## Pages Front-end

1. **index.html** - Page d'accueil
2. **auth.html** - Inscription/Connexion
3. **profile.html** - Profil utilisateur
4. **directory.html** - Annuaire membres
5. **messages.html** - Messagerie
6. **ads.html** - Annonces érotiques
7. **tonight.html** - Rencontres "Ce soir"
8. **cam.html** - Cam-to-cam
9. **premium.html** - Abonnement premium
10. **legal.html** - Mentions légales

## Fonctionnalités Détaillées

### Système Premium
- Abonnement 5.75 CHF/mois via PayPal
- Gratuit pour femmes (vérification back-end)
- Débloque messagerie, annonces, "Ce soir", cam-to-cam

### Sécurité
- Vérification âge 18+ obligatoire
- Hashage mots de passe (bcrypt)
- Validation JWT pour routes protégées
- Sanitisation des entrées utilisateur

### SEO Optimization
- Meta tags optimisés par page
- Balises H1-H3 structurées
- Sitemap XML généré dynamiquement
- URLs propres et descriptives

## Profils de Démonstration

Génération automatique de 20 profils réalistes :
- 10 hommes, 10 femmes
- Photos placeholder réalistes
- Descriptions et préférences variées
- Localisations en Suisse romande

## Déploiement Infomaniak

- Configuration serveur Node.js
- Base de données MongoDB
- Variables d'environnement (.env)
- Scripts de déploiement

## Prochaines Étapes

1. Créer la structure des dossiers
2. Développer les modèles MongoDB
3. Implémenter l'API Express.js
4. Créer les pages front-end
5. Intégrer les fonctionnalités dynamiques
6. Tester et optimiser