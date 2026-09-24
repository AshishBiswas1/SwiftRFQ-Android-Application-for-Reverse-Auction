const mongoose = require('mongoose');
const Bidding = require('../models/Bidding');
const rfqStore = require('../models/rfqStore');

// GET /api/bids/:rfqId - Retrieve all bids for an RFQ
exports.getBidsByRfq = async (req, res) => {
  try {
    const { rfqId } = req.params;

    let bids = [];
    if (mongoose.connection.readyState === 1) {
      try {
        bids = await Bidding.find({ rfqId }).sort({ timestamp: -1 });
      } catch (e) {
        const room = rfqStore.getRoom(rfqId);
        bids = room ? room.bids : [];
      }
    } else {
      const room = rfqStore.getRoom(rfqId);
      bids = room ? room.bids : [];
    }

    if (!bids.length) {
      const room = rfqStore.getRoom(rfqId);
      bids = room ? room.bids : [];
    }

    res.json({ success: true, count: bids.length, data: bids });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/bids/:rfqId/lowest - Get winning floor bid
exports.getLowestBid = async (req, res) => {
  try {
    const { rfqId } = req.params;

    let lowest = null;
    try {
      lowest = await Bidding.findLowestBid(rfqId);
    } catch (e) {
      const room = rfqStore.getRoom(rfqId);
      lowest = room ? room.bids.find((b) => b.status === 'LOWEST') : null;
    }

    if (!lowest) {
      const room = rfqStore.getRoom(rfqId);
      lowest = room ? room.bids.find((b) => b.status === 'LOWEST') : null;
    }

    res.json({ success: true, lowestBid: lowest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bids - Place bid via REST endpoint
exports.submitBid = async (req, res) => {
  try {
    const { rfqId, supplierId, supplierName, amount, currency, unit } = req.body;

    if (!rfqId || amount === undefined) {
      return res.status(400).json({ success: false, message: 'rfqId and amount are required' });
    }

    const numericAmount = Number(amount);
    const room = rfqStore.ensureRoom(rfqId);
    const isLowest = room.lowestBid === null || numericAmount < room.lowestBid;

    let bidDoc = null;
    if (mongoose.connection.readyState === 1) {
      try {
        bidDoc = await Bidding.create({
          rfqId,
          supplierId: supplierId || null,
          supplierName: supplierName || 'Anonymous Supplier',
          amount: numericAmount,
          currency: currency || 'INR',
          unit: unit || 'L',
          status: isLowest ? 'LOWEST' : 'OUTBID',
        });

        if (isLowest) {
          await Bidding.markPriorBidsOutbid(rfqId, bidDoc._id);
        }
      } catch (dbErr) {
        console.warn('[REST] DB save warning (fallback to memory):', dbErr.message);
      }
    }

    const { recordedBid } = rfqStore.addBid(rfqId, {
      ...(bidDoc ? bidDoc.toObject() : {}),
      rfqId,
      supplierId,
      supplierName,
      amount: numericAmount,
    });

    // Notify any active socket.io clients
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`room-${rfqId}`).emit('bid_placed', { rfqId, bid: recordedBid, isLowest });
      if (isLowest) {
        io.to(`room-${rfqId}`).emit('lowest_bid_update', {
          rfqId,
          lowestBid: recordedBid.amount,
          winningSupplier: recordedBid.supplierName,
        });
      }
    }

    res.status(201).json({ success: true, bid: recordedBid, isLowest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/rfqs - List active RFQ rooms (filtered by buyerId if buyer)
exports.getAllRfqs = (req, res) => {
  try {
    const { buyerId, role, supplierId } = req.query;
    const rooms = rfqStore.getAllRooms({ buyerId, role, supplierId });
    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/rfqs/:rfqId - Get single RFQ room details
exports.getRfqById = (req, res) => {
  try {
    const { rfqId } = req.params;
    const { buyerId, role } = req.query;

    const room = rfqStore.getRoom(rfqId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }

    // Isolation: If another buyer attempts to access this RFQ, restrict access
    if (role === 'BUYER' && buyerId && !rfqStore.isBuyerAuthorized(rfqId, buyerId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view another buyer\'s bidding room.',
      });
    }

    res.json({
      success: true,
      data: { ...room, participantCount: room.participants.size },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/rfqs - Create a new RFQ room
exports.createRfq = (req, res) => {
  try {
    const {
      id,
      commodity,
      quantity,
      unit,
      ceilingPrice,
      minDecrement,
      durationMinutes,
      buyerId,
      buyerName,
      invitedSuppliers,
    } = req.body;
    const rfqId = id || `RFQ-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRoom = rfqStore.ensureRoom(rfqId, {
      commodity,
      quantity,
      unit,
      ceilingPrice,
      minDecrement,
      durationMinutes,
      buyerId: buyerId ? String(buyerId) : null,
      buyerName: buyerName || 'Buyer',
      invitedSuppliers: Array.isArray(invitedSuppliers) ? invitedSuppliers : [],
      status: 'LIVE',
    });

    res.status(201).json({ success: true, data: newRoom });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
