# Documentation des Modèles de Données MongoDB

## Modèle User (Utilisateur)

### Schéma complet
```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    nom: { type: String, required: true },
    age: { type: Number, required: true, min: 18, max: 100 },
    sexe: { type: String, enum: ['homme', 'femme', 'autre'], required: true },
    localisation: { type: String, required: true },
    bio: { type: String, maxlength: 500 },
    pratiques: [{ type: String }], // Liste des pratiques sexuelles
    photos: [{ type: String }], // URLs des photos de profil
    tenuePreferee: { type: String },
    disponibilite: { type: String, enum: ['disponible', 'occupe', 'invisible'] }
  },
  premium: {
    isPremium: { type: Boolean, default: false },
    expiration: { type: Date },
    paypalSubscriptionId: { type: String },
    isFemaleFree: { type: Boolean, default: false } // Gratuit pour femmes vérifiées
  },
  preferences: {
    ageMin: { type: Number, min: 18, max: 100 },
    ageMax: { type: Number, min: 18, max: 100 },
    sexeRecherche: { type: String, enum: ['homme', 'femme', 'autre', 'tous'] },
    pratiquesRecherchees: [{ type: String }],
    localisationPreferee: { type: String }
  },
  stats: {
    profileViews: { type: Number, default: 0 },
    lastActive: { type: Date },
    joinDate: { type: Date, default: Date.now }
  },
  security: {
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    lastPasswordChange: { type: Date }
  }
}, {
  timestamps: true
});
```

## Modèle Message (Messagerie)

### Schéma complet
```javascript
const messageSchema = new mongoose.Schema({
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  provenance: {
    type: String,
    enum: ['annuaire', 'annonces', 'ce-soir'],
    required: true
  },
  originalPostId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'provenanceModel'
  },
  provenanceModel: {
    type: String,
    enum: ['Ad', 'TonightMeet']
  },
  read: {
    type: Boolean,
    default: false
  },
  metadata: {
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});
```

## Modèle Ad (Annonces Érotiques)

### Schéma complet
```javascript
const adSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['fantasme', 'soiree', 'service', 'contenu'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  location: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  criteria: {
    ageMin: { type: Number, min: 18, max: 100 },
    ageMax: { type: Number, min: 18, max: 100 },
    sexe: { type: String, enum: ['homme', 'femme', 'autre', 'tous'] },
    pratiques: [{ type: String }]
  },
  premiumOnly: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'deleted'],
    default: 'active'
  },
  contactInfo: {
    visibleTo: { type: String, enum: ['premium', 'all'] },
    responseCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});
```

## Modèle TonightMeet (Rencontres "Ce Soir")

### Schéma complet
```javascript
const tonightMeetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: String,
    required: true
  },
  tenue: {
    type: String,
    required: true
  },
  messageCode: {
    type: String,
    maxlength: 50
  },
  visibilityCriteria: {
    ageMin: { type: Number, min: 18, max: 100 },
    ageMax: { type: Number, min: 18, max: 100 },
    sexe: { type: String, enum: ['homme', 'femme', 'autre', 'tous'] },
    orientation: { type: String },
    preferences: [{ type: String }]
  },
  responses: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    avis: {
      type: String,
      enum: ['plait', 'non', 'pourquoi-pas']
    },
    message: {
      type: String,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  active: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 heures
    }
  },
  stats: {
    viewCount: { type: Number, default: 0 },
    responseCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});
```

## Indexes et Optimisations

### Indexes pour User
```javascript
userSchema.index({ email: 1 });
userSchema.index({ 'profile.localisation': 1 });
userSchema.index({ 'profile.age': 1 });
userSchema.index({ 'profile.sexe': 1 });
userSchema.index({ 'premium.isPremium': 1 });
userSchema.index({ 'stats.lastActive': -1 });
```

### Indexes pour Message
```javascript
messageSchema.index({ toUserId: 1, createdAt: -1 });
messageSchema.index({ fromUserId: 1 });
messageSchema.index({ read: 1 });
```

### Indexes pour Ad
```javascript
adSchema.index({ userId: 1 });
adSchema.index({ location: 1 });
adSchema.index({ date: 1 });
adSchema.index({ 'criteria.sexe': 1 });
adSchema.index({ status: 1 });
```

### Indexes pour TonightMeet
```javascript
tonightMeetSchema.index({ userId: 1 });
tonightMeetSchema.index({ active: 1 });
tonightMeetSchema.index({ expiresAt: 1 });
tonightMeetSchema.index({ location: 1 });
```

## Méthodes et Hooks

### Méthodes User
- `comparePassword(password)` - Comparer mot de passe hashé
- `generateAuthToken()` - Générer JWT
- `updateLastActive()` - Mettre à jour dernière activité
- `isEligibleForFreePremium()` - Vérifier éligibilité gratuité femmes

### Hooks communs
- Pre-save : Hashage mot de passe
- Pre-save : Validation données
- Post-save : Génération données de démonstration

## Relations entre Modèles

```
User (1) ──── (N) Message
User (1) ──── (N) Ad
User (1) ──── (N) TonightMeet
Ad (1) ─────── (N) Message (via originalPostId)
TonightMeet (1) ─ (N) Message (via originalPostId)
```

Cette structure permet une gestion efficace des données avec des relations claires et des indexes optimisés pour les requêtes fréquentes.