const mongoose = require('mongoose');

const adMessageSchema = new mongoose.Schema(
  {
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index composé pour optimiser les requêtes
adMessageSchema.index({ adId: 1, timestamp: -1 });
adMessageSchema.index({ conversationId: 1, timestamp: -1 });
adMessageSchema.index({ senderId: 1, receiverId: 1 });

module.exports = mongoose.model('AdMessage', adMessageSchema);
