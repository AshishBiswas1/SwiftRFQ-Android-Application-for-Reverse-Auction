const mongoose = require('mongoose');

const biddingSchema = new mongoose.Schema(
  {
    rfqId: {
      type: String,
      required: [true, 'RFQ ID is required'],
      index: true,
      trim: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Bid amount is required'],
      min: [0, 'Bid amount must be positive'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    unit: {
      type: String,
      default: 'L',
      trim: true,
    },
    status: {
      type: String,
      enum: ['LOWEST', 'OUTBID', 'WITHDRAWN'],
      default: 'LOWEST',
      index: true,
    },
    delta: {
      type: Number,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying bid histories sorted by timestamp
biddingSchema.index({ rfqId: 1, amount: 1, timestamp: -1 });

// Static helper to find current lowest bid for an RFQ
biddingSchema.statics.findLowestBid = function (rfqId) {
  return this.findOne({ rfqId, status: { $ne: 'WITHDRAWN' } }).sort({ amount: 1, timestamp: 1 });
};

// Static helper to update prior lowest bids to OUTBID when a lower bid arrives
biddingSchema.statics.markPriorBidsOutbid = async function (rfqId, newLowestBidId) {
  return this.updateMany(
    { rfqId, _id: { $ne: newLowestBidId }, status: 'LOWEST' },
    { $set: { status: 'OUTBID' } }
  );
};

module.exports = mongoose.model('Bidding', biddingSchema);
