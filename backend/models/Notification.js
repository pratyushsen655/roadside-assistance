const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mechanic',
      required: false,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: [
        'new_request', 'job_cancelled', 'payment_received', 'kyc_update', 'announcement',
        'mechanic_assigned', 'job_complete', 'rate_mechanic', 'mechanic_enroute', 'message', 'admin_broadcast', 'other'
      ],
      default: 'other',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Legacy support: recipient/recipientModel kept for backward compat
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'recipientModel',
    },
    recipientModel: {
      type: String,
      enum: ['User', 'Mechanic'],
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
