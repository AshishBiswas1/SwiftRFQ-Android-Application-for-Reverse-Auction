const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['SESSION_START', 'AUCTION_WON', 'AUCTION_LOST', 'AUCTION_CLOSED', 'SYSTEM'],
      default: 'SYSTEM',
    },
    rfqId: {
      type: String,
      default: null,
      index: true,
    },
    commodity: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
