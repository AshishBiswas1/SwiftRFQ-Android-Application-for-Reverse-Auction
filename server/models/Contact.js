const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    buyerId: {
      type: String,
      required: [true, 'buyerId is required'],
      index: true,
    },
    buyerName: {
      type: String,
      trim: true,
      default: '',
    },
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: 'India',
    },
    status: {
      type: String,
      enum: ['INVITED', 'ACCEPTED'],
      default: 'INVITED',
    },
    supplierUserId: {
      type: String,
      default: null,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate entries for the same phone/email per buyer
contactSchema.index({ buyerId: 1, phone: 1 });

module.exports = mongoose.model('Contact', contactSchema);
