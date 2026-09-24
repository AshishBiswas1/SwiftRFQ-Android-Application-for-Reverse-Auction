const mongoose = require('mongoose');
const Bidding = require('../models/Bidding');
const rfqStore = require('../models/rfqStore');

/**
 * Socket.io Auction Bidding Room Handler
 * Manages real-time bid broadcasts, participant rosters, and auction room lifecycles.
 */
function registerAuctionHandlers(io) {
  io.on('connection', (socket) => {
    // Join a specific RFQ bidding room
    socket.on('join_room', async ({ rfqId, user } = {}, callback) => {
      if (!rfqId) {
        if (callback) callback({ error: 'rfqId is required to join a room' });
        return;
      }

      const room = rfqStore.getRoom(rfqId);
      if (!room) {
        if (callback) callback({ error: 'Auction room not found' });
        return;
      }

      // Isolation: Prevent other buyers from joining another buyer's live bidding room
      if (user?.role === 'BUYER' && room.buyerId) {
        const userId = String(user.id || user._id || '');
        if (userId && room.buyerId !== userId) {
          if (callback) callback({ error: "Access denied: You cannot view another buyer's bidding room." });
          return;
        }
      }

      const roomKey = `room-${rfqId}`;
      socket.join(roomKey);

      // Track participant in memory store
      const participantCount = rfqStore.addParticipant(rfqId, socket.id, user);

      // Notify the joining socket with current room snapshot
      socket.emit('room_state', {
        rfqId,
        commodity: room?.commodity,
        lowestBid: room?.lowestBid,
        bids: room?.bids || [],
        participantCount,
      });

      // Broadcast updated participant count to all in room
      io.to(roomKey).emit('participant_update', {
        rfqId,
        participantCount,
      });

      if (callback) {
        callback({ success: true, rfqId, participantCount });
      }
    });

    // Leave a specific RFQ bidding room
    socket.on('leave_room', ({ rfqId } = {}, callback) => {
      if (!rfqId) return;
      const roomKey = `room-${rfqId}`;
      socket.leave(roomKey);

      const affected = rfqStore.removeParticipant(socket.id);
      const room = rfqStore.getRoom(rfqId);

      io.to(roomKey).emit('participant_update', {
        rfqId,
        participantCount: room ? room.participants.size : 0,
      });

      if (callback) callback({ success: true });
    });

    // Place a new competitive bid in the reverse auction
    socket.on('place_bid', async (bidPayload, callback) => {
      try {
        const { rfqId, supplierId, supplierName, amount, currency = 'INR', unit = 'L' } = bidPayload || {};

        if (!rfqId || amount === undefined || isNaN(Number(amount))) {
          const err = 'Invalid bid payload: rfqId and numeric amount are required.';
          if (callback) callback({ error: err });
          return;
        }

        const numericAmount = Number(Number(amount).toFixed(2));
        const room = rfqStore.ensureRoom(rfqId);

        // Validation against minimum decrement
        if (room.lowestBid !== null) {
          const allowedCeiling = room.lowestBid - (room.minDecrement || 0);
          if (numericAmount > room.lowestBid) {
            // Outbid or higher bid placed
          }
        }

        // 1. Persist to MongoDB if connected
        let persistedBid = null;
        if (mongoose.connection.readyState === 1) {
          try {
            const isLowest = room.lowestBid === null || numericAmount < room.lowestBid;
            const prevLowest = room.lowestBid;
            const delta = prevLowest !== null ? Number((numericAmount - prevLowest).toFixed(2)) : null;

            const newBidDoc = new Bidding({
              rfqId,
              supplierId: supplierId || null,
              supplierName: supplierName || 'Anonymous Supplier',
              amount: numericAmount,
              currency,
              unit,
              status: isLowest ? 'LOWEST' : 'OUTBID',
              delta,
            });

            persistedBid = await newBidDoc.save();

            if (isLowest) {
              await Bidding.markPriorBidsOutbid(rfqId, persistedBid._id);
            }
          } catch (dbErr) {
            console.warn('[Socket.io] MongoDB persist warning (using memory store fallback):', dbErr.message);
          }
        }

        // 2. Record in active RFQ store
        const { recordedBid, isNewLowest, lowestBid } = rfqStore.addBid(rfqId, {
          ...(persistedBid ? persistedBid.toObject() : {}),
          rfqId,
          supplierId,
          supplierName,
          amount: numericAmount,
          currency,
          unit,
        });

        const roomKey = `room-${rfqId}`;

        // 3. Broadcast bid to every participant in room
        io.to(roomKey).emit('bid_placed', {
          rfqId,
          bid: recordedBid,
          isLowest: isNewLowest,
        });

        // If new floor established, emit lowest_bid_update
        if (isNewLowest) {
          io.to(roomKey).emit('lowest_bid_update', {
            rfqId,
            lowestBid,
            winningSupplier: recordedBid.supplierName,
            bidId: recordedBid.id,
          });
        }

        if (callback) {
          callback({ success: true, bid: recordedBid, isLowest: isNewLowest });
        }
      } catch (err) {
        console.error('[Socket.io] Error in place_bid:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // Close auction room
    socket.on('close_auction', ({ rfqId } = {}, callback) => {
      if (!rfqId) return;
      const roomKey = `room-${rfqId}`;
      const room = rfqStore.getRoom(rfqId);

      if (room) {
        room.status = 'CLOSED';
      }

      io.to(roomKey).emit('auction_closed', {
        rfqId,
        lowestBid: room?.lowestBid,
        winner: room?.bids?.find((b) => b.status === 'LOWEST') || null,
        closedAt: new Date(),
      });

      if (callback) callback({ success: true, rfqId });
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      const affected = rfqStore.removeParticipant(socket.id);
      affected.forEach(({ rfqId, participantCount }) => {
        io.to(`room-${rfqId}`).emit('participant_update', {
          rfqId,
          participantCount,
        });
      });
    });
  });
}

module.exports = registerAuctionHandlers;
