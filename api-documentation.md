# Documentation API RESTful HotMeet

## Authentification

### POST /api/auth/register
**Inscription d'un nouvel utilisateur**

**Body:**
```json
{
  "email": "utilisateur@example.com",
  "password": "motdepasse123",
  "profile": {
    "nom": "Jean Dupont",
    "age": 25,
    "sexe": "homme",
    "localisation": "Genève"
  }
}
```

**Réponse:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "utilisateur@example.com",
    "profile": {
      "nom": "Jean Dupont",
      "age": 25,
      "sexe": "homme",
      "localisation": "Genève"
    },
    "premium": {
      "isPremium": false
    }
  }
}
```

### POST /api/auth/login
**Connexion utilisateur**

**Body:**
```json
{
  "email": "utilisateur@example.com",
  "password": "motdepasse123"
}
```

**Réponse:** Même structure que register

### POST /api/auth/verify-age
**Vérification âge 18+**

**Body:**
```json
{
  "birthDate": "2000-01-01",
  "acceptedTerms": true
}
```

### GET /api/auth/me
**Récupération profil utilisateur (JWT requis)**

**Headers:**
```
Authorization: Bearer jwt_token_here
```

## Utilisateurs

### GET /api/users
**Liste des utilisateurs avec filtres**

**Query Parameters:**
- `ageMin` (number) - Âge minimum
- `ageMax` (number) - Âge maximum  
- `sexe` (string) - homme/femme/autre
- `localisation` (string) - Ville/région
- `pratiques` (string) - Pratiques séparées par virgule
- `page` (number) - Pagination
- `limit` (number) - Résultats par page

**Réponse:**
```json
{
  "users": [
    {
      "id": "user_id",
      "profile": {
        "nom": "Marie Curie",
        "age": 28,
        "sexe": "femme",
        "localisation": "Lausanne",
        "photos": ["url_photo1", "url_photo2"],
        "pratiques": ["flirt", "rencontre sérieuse"]
      },
      "lastActive": "2023-10-08T15:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 15
}
```

### GET /api/users/:id
**Profil utilisateur détaillé**

**Réponse:**
```json
{
  "user": {
    "id": "user_id",
    "profile": {
      "nom": "Marie Curie",
      "age": 28,
      "sexe": "femme",
      "localisation": "Lausanne",
      "bio": "Description personnelle...",
      "photos": ["url_photo1", "url_photo2"],
      "pratiques": ["flirt", "rencontre sérieuse"],
      "tenuePreferee": "Robe élégante",
      "disponibilite": "disponible"
    },
    "premium": {
      "isPremium": true,
      "expiration": "2024-01-08T15:30:00Z"
    },
    "stats": {
      "profileViews": 42,
      "lastActive": "2023-10-08T15:30:00Z"
    }
  }
}
```

### PUT /api/users/profile
**Modification profil utilisateur (JWT requis)**

**Body:**
```json
{
  "profile": {
    "nom": "Nouveau nom",
    "age": 29,
    "bio": "Nouvelle description...",
    "pratiques": ["flirt", "plan cul"],
    "tenuePreferee": "Jeans et t-shirt"
  }
}
```

## Messages

### GET /api/messages
**Messages reçus (JWT requis)**

**Query Parameters:**
- `page` (number) - Pagination
- `limit` (number) - Résultats par page

**Réponse:**
```json
{
  "messages": [
    {
      "id": "message_id",
      "fromUser": {
        "id": "sender_id",
        "profile": {
          "nom": "Pierre Martin",
          "age": 32,
          "sexe": "homme",
          "localisation": "Genève"
        }
      },
      "content": "Bonjour, votre profil m'intéresse...",
      "provenance": "annuaire",
      "originalPostId": null,
      "read": false,
      "createdAt": "2023-10-08T14:30:00Z"
    }
  ],
  "total": 5,
  "unread": 3
}
```

### POST /api/messages
**Envoyer message (Premium uniquement)**

**Body:**
```json
{
  "toUserId": "recipient_id",
  "content": "Votre message ici...",
  "provenance": "annuaire",
  "originalPostId": "post_id" // Optionnel
}
```

## Annonces

### GET /api/ads
**Liste des annonces**

**Query Parameters:**
- `type` (string) - fantasme/soiree/service/contenu
- `location` (string) - Localisation
- `page` (number) - Pagination

**Réponse:**
```json
{
  "ads": [
    {
      "id": "ad_id",
      "user": {
        "id": "user_id",
        "profile": {
          "nom": "Sophie",
          "age": 26,
          "sexe": "femme"
        }
      },
      "type": "soiree",
      "title": "Soirée échangiste vendredi",
      "description": "Soirée privée entre adultes...",
      "location": "Lausanne",
      "date": "2023-10-13T20:00:00Z",
      "criteria": {
        "ageMin": 25,
        "ageMax": 45,
        "sexe": "tous"
      },
      "premiumOnly": true,
      "createdAt": "2023-10-08T12:00:00Z"
    }
  ],
  "total": 23
}
```

### POST /api/ads
**Créer annonce (Premium uniquement)**

**Body:**
```json
{
  "type": "soiree",
  "title": "Titre de l'annonce",
  "description": "Description détaillée...",
  "location": "Genève",
  "date": "2023-10-15T20:00:00Z",
  "criteria": {
    "ageMin": 25,
    "ageMax": 40,
    "sexe": "homme",
    "pratiques": ["flirt", "plan cul"]
  }
}
```

## Rencontres "Ce Soir"

### POST /api/tonight
**Créer rencontre "Ce soir" (Premium uniquement)**

**Body:**
```json
{
  "location": "Bar Le Central",
  "tenue": "Robe noire élégante",
  "messageCode": "motsecret",
  "visibilityCriteria": {
    "ageMin": 28,
    "ageMax": 45,
    "sexe": "homme",
    "orientation": "hétéro",
    "preferences": ["flirt", "rencontre pimentée"]
  }
}
```

### GET /api/tonight/active
**Rencontres actives disponibles**

**Réponse:**
```json
{
  "meets": [
    {
      "id": "meet_id",
      "user": {
        "id": "user_id",
        "profile": {
          "nom": "Claire",
          "age": 29,
          "sexe": "femme",
          "localisation": "Genève"
        }
      },
      "location": "Bar Le Central",
      "tenue": "Robe noire élégante",
      "messageCode": "motsecret",
      "createdAt": "2023-10-08T19:00:00Z",
      "expiresAt": "2023-10-09T01:00:00Z"
    }
  ]
}
```

### POST /api/tonight/:id/response
**Répondre à une rencontre**

**Body:**
```json
{
  "avis": "plait", // ou "non", "pourquoi-pas"
  "message": "Votre message optionnel"
}
```

## Paiements

### POST /api/payments/create-subscription
**Créer abonnement PayPal**

**Body:**
```json
{
  "planId": "P-XXX", // ID plan PayPal
  "returnUrl": "https://hotmeet.ch/success",
  "cancelUrl": "https://hotmeet.ch/cancel"
}
```

**Réponse:**
```json
{
  "approvalUrl": "https://www.paypal.com/checkoutnow?token=EC-XXX",
  "subscriptionId": "I-XXX"
}
```

### POST /api/payments/webhook
**Webhook PayPal (interne)**

## Gestion des Erreurs

### Format d'erreur standard
```json
{
  "success": false,
  "error": {
    "code": "AUTH_ERROR",
    "message": "Email ou mot de passe incorrect",
    "details": {}
  }
}
```

### Codes d'erreur courants
- `AUTH_ERROR` - Erreur authentification
- `VALIDATION_ERROR` - Données invalides
- `PERMISSION_ERROR` - Droits insuffisants
- `NOT_FOUND` - Ressource introuvable
- `PAYMENT_ERROR` - Erreur paiement

## Sécurité et Validation

### Headers requis
- `Content-Type: application/json` pour les requêtes POST/PUT
- `Authorization: Bearer jwt_token` pour les routes protégées

### Validation des données
- Toutes les entrées sont validées côté serveur
- Sanitisation contre les injections XSS
- Limitation de taille des uploads
- Validation des types et formats

### Rate Limiting
- 100 requêtes/heure par IP pour les routes publiques
- 1000 requêtes/heure par utilisateur authentifié

Cette API fournit une base solide pour toutes les fonctionnalités du site HotMeet avec une sécurité renforcée et une gestion d'erreur complète.