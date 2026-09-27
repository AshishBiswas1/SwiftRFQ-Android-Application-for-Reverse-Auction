const mongoose = require('mongoose');
const Bidding = require('../models/Bidding');
const RFQ = require('../models/RFQ');
const User = require('../models/User');
const rfqStore = require('../models/rfqStore');
const notificationService = require('../services/notificationService');

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
    const { rfqId, supplierId, supplierName, supplierPhone, supplierEmail, supplierCompany, amount, currency, unit } = req.body;

    if (!rfqId || amount === undefined) {
      return res.status(400).json({ success: false, message: 'rfqId and amount are required' });
    }

    // Enforce that supplier must have filled profile details before placing a bid
    if (supplierId && mongoose.connection.readyState === 1 && mongoose.isValidObjectId(supplierId)) {
      try {
        const suppUser = await User.findById(supplierId);
        if (suppUser) {
          const missing = [];
          if (!suppUser.name || !suppUser.name.trim()) missing.push('Full Name');
          if (!suppUser.companyName || !suppUser.companyName.trim()) missing.push('Company Name');
          const cleanPhone = (suppUser.phone || '').replace(/[^0-9]/g, '');
          if (!cleanPhone || cleanPhone.length < 10) missing.push('10-digit Phone Number');
          if (!suppUser.location || !suppUser.location.trim()) missing.push('City / Business Location');

          if (missing.length > 0) {
            return res.status(403).json({
              success: false,
              code: 'PROFILE_INCOMPLETE',
              message: `Profile incomplete: Please fill in your ${missing.join(', ')} before placing bids.`,
              missingFields: missing,
            });
          }
        }
      } catch (_) {}
    }

    const numericAmount = Number(amount);
    const room = rfqStore.ensureRoom(rfqId);
    const canonicalId = room.rfqId || room.id || rfqId;
    const isLowest = room.lowestBid === null || numericAmount < room.lowestBid;

    let bidDoc = null;
    if (mongoose.connection.readyState === 1) {
      try {
        bidDoc = await Bidding.create({
          rfqId: canonicalId,
          supplierId: supplierId || null,
          supplierName: supplierName || 'Anonymous Supplier',
          amount: numericAmount,
          currency: currency || 'INR',
          unit: unit || 'L',
          status: isLowest ? 'LOWEST' : 'OUTBID',
        });

        if (isLowest) {
          await Bidding.markPriorBidsOutbid(canonicalId, bidDoc._id);
        }
      } catch (dbErr) {
        console.warn('[REST] DB save warning (fallback to memory):', dbErr.message);
      }
    }

    const { recordedBid } = rfqStore.addBid(canonicalId, {
      ...(bidDoc ? bidDoc.toObject() : {}),
      rfqId: canonicalId,
      supplierId,
      supplierName,
      supplierPhone,
      supplierEmail,
      supplierCompany,
      amount: numericAmount,
    });

    // Notify any active socket.io clients
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`room-${canonicalId}`).emit('bid_placed', { rfqId: canonicalId, bid: recordedBid, isLowest });
      if (String(rfqId) !== String(canonicalId)) {
        io.to(`room-${rfqId}`).emit('bid_placed', { rfqId: canonicalId, bid: recordedBid, isLowest });
      }
      if (isLowest) {
        io.to(`room-${canonicalId}`).emit('lowest_bid_update', {
          rfqId: canonicalId,
          lowestBid: recordedBid.amount,
          winningSupplier: recordedBid.supplierName,
        });
        if (String(rfqId) !== String(canonicalId)) {
          io.to(`room-${rfqId}`).emit('lowest_bid_update', {
            rfqId: canonicalId,
            lowestBid: recordedBid.amount,
            winningSupplier: recordedBid.supplierName,
          });
        }
      }
    }

    res.status(201).json({ success: true, bid: recordedBid, isLowest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/rfqs - List active RFQ rooms (filtered by buyerId if buyer)
exports.getAllRfqs = async (req, res) => {
  try {
    const { buyerId, role, supplierId } = req.query;

    // If MongoDB connected, sync rooms into memory store
    if (mongoose.connection.readyState === 1) {
      try {
        let mongoFilter = {};
        if (role === 'BUYER' && buyerId) {
          mongoFilter = { buyerId: String(buyerId) };
        } else if (role === 'BUYER') {
          mongoFilter = { buyerId: '__none__' };
        }
        // Suppliers (role === 'SUPPLIER') have no filter -> see ALL bidding rooms!

        const dbRfqs = await RFQ.find(mongoFilter).sort({ startedAt: -1 });
        const rfqIds = dbRfqs.map((d) => d.rfqId);
        let allDbBids = [];
        try {
          allDbBids = await Bidding.find({ rfqId: { $in: rfqIds } }).sort({ amount: 1 });
        } catch (_) {}

        const bidsByRfq = {};
        allDbBids.forEach((b) => {
          if (!bidsByRfq[b.rfqId]) bidsByRfq[b.rfqId] = [];
          bidsByRfq[b.rfqId].push(b.toObject());
        });

        dbRfqs.forEach((doc) => {
          const room = rfqStore.ensureRoom(doc.rfqId, {
            ...doc.toObject(),
            bids: bidsByRfq[doc.rfqId] || [],
          });
          if (bidsByRfq[doc.rfqId] && bidsByRfq[doc.rfqId].length > 0 && room.bids.length === 0) {
            room.bids = bidsByRfq[doc.rfqId].map((b) => ({
              id: b._id ? b._id.toString() : b.id,
              ...b,
            }));
          }
        });
      } catch (dbErr) {
        console.warn('[Bidding] DB find warning:', dbErr.message);
      }
    }

    const rooms = rfqStore.getAllRooms({ buyerId, role, supplierId });
    rooms.forEach((room) => {
      if (room.winner && !room.winner.supplierPhone) {
        const match = (room.invitedSuppliers || []).find(
          (s) =>
            (room.winner.supplierId && String(s.id) === String(room.winner.supplierId)) ||
            (s.name && s.name.toLowerCase() === (room.winner.supplierName || '').toLowerCase())
        );
        if (match) {
          if (!room.winner.supplierPhone && match.phone) room.winner.supplierPhone = match.phone;
          if (!room.winner.supplierEmail && match.email) room.winner.supplierEmail = match.email;
          if (!room.winner.supplierCompany && match.company) room.winner.supplierCompany = match.company;
        }
      }
    });
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
exports.createRfq = async (req, res) => {
  try {
    const {
      id,
      commodity,
      quantity,
      unit,
      grade,
      deliveryTerms,
      ceilingPrice,
      reservePrice,
      minDecrement,
      durationMinutes,
      buyerId,
      buyerName,
      buyerPhone,
      invitedSuppliers,
    } = req.body;

    if (!commodity || !quantity || !ceilingPrice) {
      return res.status(400).json({
        success: false,
        message: 'Commodity, quantity, and starting ceiling price are required',
      });
    }

    // Enforce that buyer must have filled all profile details before starting an auction
    if (buyerId && mongoose.connection.readyState === 1 && mongoose.isValidObjectId(buyerId)) {
      try {
        const buyerUser = await User.findById(buyerId);
        if (buyerUser) {
          const missing = [];
          if (!buyerUser.name || !buyerUser.name.trim()) missing.push('Full Name');
          if (!buyerUser.companyName || !buyerUser.companyName.trim()) missing.push('Company Name');
          const cleanPhone = (buyerUser.phone || '').replace(/[^0-9]/g, '');
          if (!cleanPhone || cleanPhone.length < 10) missing.push('10-digit Phone Number');
          if (!buyerUser.location || !buyerUser.location.trim()) missing.push('City / Business Location');

          if (missing.length > 0) {
            return res.status(403).json({
              success: false,
              code: 'PROFILE_INCOMPLETE',
              message: `Profile incomplete: Please fill in your ${missing.join(', ')} before starting an auction.`,
              missingFields: missing,
            });
          }
        }
      } catch (_) {}
    }

    const rfqId = id || `RFQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const durMins = Number(durationMinutes) || 60;
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durMins * 60 * 1000);

    const rfqPayload = {
      rfqId,
      commodity: commodity.trim(),
      quantity: Number(quantity),
      unit: unit || 'L',
      grade: grade ? grade.trim() : '',
      deliveryTerms: deliveryTerms ? deliveryTerms.trim() : '',
      durationMinutes: durMins,
      ceilingPrice: Number(ceilingPrice),
      reservePrice: reservePrice ? Number(reservePrice) : null,
      minDecrement: Number(minDecrement) || 0.5,
      buyerId: buyerId ? String(buyerId) : 'usr-buyer',
      buyerName: buyerName || 'Buyer',
      buyerPhone: buyerPhone || '',
      invitedSuppliers: Array.isArray(invitedSuppliers) ? invitedSuppliers : [],
      status: 'LIVE',
      startedAt,
      expiresAt,
    };

    // 1. Ensure room in memory store
    const newRoom = rfqStore.ensureRoom(rfqId, rfqPayload);

    // 2. Persist in MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        await RFQ.create(rfqPayload);
      } catch (dbErr) {
        console.warn('[Bidding] RFQ DB create warning:', dbErr.message);
      }
    }

    // 3. Dispatch session start app notifications to invited suppliers
    const io = req.app.get('io');
    notificationService.notifyAuctionStarted({
      io,
      rfq: newRoom,
      invitedSuppliers: newRoom.invitedSuppliers,
    });

    res.status(201).json({ success: true, data: newRoom });
  } catch (error) {
    console.error('[Create RFQ Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/rfqs/:rfqId/close - End bidding session (manual by creator or autonomous)
exports.closeRfq = async (req, res) => {
  try {
    const { rfqId } = req.params;
    const { buyerId } = req.body;

    const closeResult = rfqStore.closeRoom(rfqId, buyerId);
    if (!closeResult) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }

    const { room, winner, standings } = closeResult;
    const canonicalId = room.rfqId || room.id || rfqId;

    // Enrich winner contact details from User database if available
    if (winner && mongoose.connection.readyState === 1) {
      try {
        const queryOr = [];
        if (winner.supplierId && mongoose.isValidObjectId(winner.supplierId)) {
          queryOr.push({ _id: winner.supplierId });
        }
        if (winner.supplierName) {
          queryOr.push({ name: winner.supplierName });
        }
        if (queryOr.length > 0) {
          const userDoc = await User.findOne({ $or: queryOr });
          if (userDoc) {
            if (!winner.supplierPhone && userDoc.phone) winner.supplierPhone = userDoc.phone;
            if (!winner.supplierEmail && userDoc.email) winner.supplierEmail = userDoc.email;
            if (!winner.supplierCompany && userDoc.companyName) winner.supplierCompany = userDoc.companyName;
            room.winner = winner;
          }
        }
      } catch (_) {}
    }

    // Update MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        await RFQ.findOneAndUpdate(
          { rfqId: canonicalId },
          {
            status: 'CLOSED',
            winner,
            closedAt: room.closedAt,
            lowestBid: room.lowestBid,
          }
        );
      } catch (dbErr) {
        console.warn('[Bidding] RFQ DB close warning:', dbErr.message);
      }
    }

    // Broadcast auction_closed to room sockets
    const io = req.app.get('io');
    if (io) {
      io.to(`room-${canonicalId}`).emit('auction_closed', {
        rfqId: canonicalId,
        status: 'CLOSED',
        lowestBid: room.lowestBid,
        winner,
        standings,
        closedAt: room.closedAt,
      });
      if (String(rfqId) !== String(canonicalId)) {
        io.to(`room-${rfqId}`).emit('auction_closed', {
          rfqId: canonicalId,
          status: 'CLOSED',
          lowestBid: room.lowestBid,
          winner,
          standings,
          closedAt: room.closedAt,
        });
      }
      // Global broadcast so every supplier on the floor and buyer dashboard updates immediately
      io.emit('auction_closed', {
        rfqId: canonicalId,
        status: 'CLOSED',
        lowestBid: room.lowestBid,
        winner,
        standings,
        closedAt: room.closedAt,
      });
    }

    // Dispatch notifications to winner, losers, and buyer
    notificationService.notifyAuctionClosed({
      io,
      rfq: room,
      winner,
      standings,
    });

    res.json({
      success: true,
      message: 'Bidding session ended successfully.',
      rfq: room,
      winner,
      standings,
    });
  } catch (error) {
    console.error('[Close RFQ Error]', error);
    res.status(error.message.includes('creator') ? 403 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE /api/rfqs/:rfqId - Delete an RFQ bidding room (creator only)
exports.deleteRfq = async (req, res) => {
  try {
    const { rfqId } = req.params;
    const buyerId = req.body?.buyerId || req.query?.buyerId;

    // 1. Delete from memory store
    rfqStore.deleteRoom(rfqId, buyerId);

    // 2. Delete from MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const query = { rfqId };
        if (buyerId) query.buyerId = String(buyerId);
        await RFQ.deleteOne(query);
        await Bidding.deleteMany({ rfqId });
      } catch (dbErr) {
        console.warn('[Bidding] RFQ DB delete warning:', dbErr.message);
      }
    }

    // 3. Broadcast rfq_deleted event to all sockets
    const io = req.app.get('io');
    if (io) {
      io.emit('rfq_deleted', { rfqId });
    }

    res.json({ success: true, message: 'Requirement session deleted successfully.', rfqId });
  } catch (error) {
    console.error('[Delete RFQ Error]', error);
    res.status(error.message.includes('creator') ? 403 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

// PATCH /api/rfqs/:rfqId/fulfillment - Update order fulfillment & logistics status
exports.updateFulfillmentStatus = async (req, res) => {
  try {
    const { rfqId } = req.params;
    const { status, notes } = req.body;

    const allowed = ['AWARDED', 'PO_ISSUED', 'DISPATCHED', 'DELIVERED'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowed.join(', ')}`,
      });
    }

    const room = rfqStore.getRoom(rfqId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }

    room.fulfillmentStatus = status;
    const canonicalId = room.rfqId || room.id || rfqId;

    if (mongoose.connection.readyState === 1) {
      try {
        await RFQ.findOneAndUpdate({ rfqId: canonicalId }, { fulfillmentStatus: status });
      } catch (_) {}
    }

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`room-${canonicalId}`).emit('fulfillment_update', { rfqId: canonicalId, fulfillmentStatus: status, notes });
      io.emit('fulfillment_update', { rfqId: canonicalId, fulfillmentStatus: status, notes });
    }

    res.json({ success: true, rfqId: canonicalId, fulfillmentStatus: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
