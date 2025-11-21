const mongoose = require('mongoose');

const privatePhotoRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  message: {
    type: String,
    maxlength: 200,
    default: 'Aimerais voir vos photos privées',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  respondedAt: {
    type: Date,
  },
});

// Index composé pour éviter les doublons
privatePhotoRequestSchema.index({ requester: 1, target: 1 }, { unique: true });

module.exports = mongoose.model(
  'PrivatePhotoRequest',
  privatePhotoRequestSchema
);
