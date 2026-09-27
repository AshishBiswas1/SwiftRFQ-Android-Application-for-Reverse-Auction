const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema(
  {
    rfqId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    commodity: {
      type: String,
      required: [true, 'Commodity name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 1,
    },
    unit: {
      type: String,
      default: 'L',
      trim: true,
    },
    grade: {
      type: String,
      default: '',
      trim: true,
    },
    deliveryTerms: {
      type: String,
      default: '',
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 1,
    },
    minDecrement: {
      type: Number,
      default: 0.5,
      min: 0.01,
    },
    ceilingPrice: {
      type: Number,
      required: [true, 'Ceiling price is required'],
      min: 0.01,
    },
    reservePrice: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['LIVE', 'CLOSED', 'CANCELLED'],
      default: 'LIVE',
      index: true,
    },
    lowestBid: {
      type: Number,
      default: null,
    },
    buyerId: {
      type: String,
      required: true,
      index: true,
    },
    buyerName: {
      type: String,
      default: 'Buyer',
    },
    buyerPhone: {
      type: String,
      default: '',
    },
    invitedSuppliers: {
      type: [
        {
          id: String,
          name: String,
          phone: String,
          email: String,
        },
      ],
      default: [],
    },
    buyerLocation: {
      type: String,
      default: '',
    },
    fulfillmentStatus: {
      type: String,
      enum: ['AWARDED', 'PO_ISSUED', 'DISPATCHED', 'DELIVERED'],
      default: 'AWARDED',
    },
    winner: {
      supplierId: String,
      supplierName: String,
      supplierPhone: String,
      supplierEmail: String,
      supplierCompany: String,
      amount: Number,
      wonAt: Date,
      metReserve: Boolean,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RFQ', rfqSchema);
