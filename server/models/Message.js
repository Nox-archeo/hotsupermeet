const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    provenance: {
      type: String,
      enum: ['annuaire', 'annonces', 'ce-soir'],
      required: true,
    },
    originalPostId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'provenanceModel',
    },
    provenanceModel: {
      type: String,
      enum: ['Ad', 'TonightMeet'],
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      location: String,
    },
  },
  {
    timestamps: true,
  }
);

// Méthode pour marquer comme lu
messageSchema.methods.markAsRead = function () {
  this.read = true;
  return this.save();
};

// Méthode pour obtenir les messages non lus d'un utilisateur
messageSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    toUserId: userId,
    read: false,
  });
};

// Méthode pour obtenir les messages avec pagination
messageSchema.statics.getUserMessages = function (
  userId,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;

  return this.find({ toUserId: userId })
    .populate(
      'fromUserId',
      'profile.nom profile.age profile.sexe profile.localisation profile.photos'
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

// Index pour les requêtes fréquentes
messageSchema.index({ toUserId: 1, createdAt: -1 });
messageSchema.index({ fromUserId: 1 });
messageSchema.index({ read: 1 });
messageSchema.index({ provenance: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
