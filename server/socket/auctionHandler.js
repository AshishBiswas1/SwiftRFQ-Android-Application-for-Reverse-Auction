const mongoose = require('mongoose');
const Bidding = require('../models/Bidding');
const RFQ = require('../models/RFQ');
const rfqStore = require('../models/rfqStore');
const notificationService = require('../services/notificationService');

/**
 * Socket.io Auction Bidding Room Handler
 * Manages real-time bid broadcasts, participant rosters, and auction room lifecycles.
 */
function registerAuctionHandlers(io) {
  // Autonomous Reverse Auction Closer Loop
  // Evaluates live rooms and autonomously declares the winner when the time limit expires
  setInterval(async () => {
    try {
      const expiredRooms = rfqStore.checkExpiredRooms();
      for (const { room, winner, standings } of expiredRooms) {
        const rfqId = room.id;
        const roomKey = `room-${rfqId}`;

        console.log(`[Autonomous Engine] RFQ ${rfqId} (${room.commodity}) expired. Autonomous winner:`, winner ? winner.supplierName : 'None');

        // Broadcast autonomous close to everyone in room
        io.to(roomKey).emit('auction_closed', {
          rfqId,
          status: 'CLOSED',
          lowestBid: room.lowestBid,
          winner,
          standings,
          closedAt: room.closedAt,
          autonomous: true,
        });

        // Global broadcast
        io.emit('auction_closed', {
          rfqId,
          status: 'CLOSED',
          lowestBid: room.lowestBid,
          winner,
          standings,
          closedAt: room.closedAt,
          autonomous: true,
        });

        // Update MongoDB if connected
        if (mongoose.connection.readyState === 1) {
          try {
            await RFQ.findOneAndUpdate(
              { rfqId },
              {
                status: 'CLOSED',
                winner,
                closedAt: room.closedAt,
                lowestBid: room.lowestBid,
              }
            );
          } catch (_) {}
        }

        // Send app notifications
        notificationService.notifyAuctionClosed({
          io,
          rfq: room,
          winner,
          standings,
        });
      }
    } catch (e) {
      console.error('[Autonomous Engine Error]', e.message);
    }
  }, 4000);

  io.on('connection', (socket) => {
    // Register user for direct personal notifications
    socket.on('register_user', ({ userId }) => {
      if (userId) {
        socket.join(`user-${userId}`);
      }
    });

    // Join a specific RFQ bidding room
    socket.on('join_room', async ({ rfqId, user } = {}, callback) => {
      if (!rfqId) {
        if (callback) callback({ error: 'rfqId is required to join a room' });
        return;
      }

      let room = rfqStore.getRoom(rfqId);
      // Fallback: Check MongoDB if room not in memory
      if (!room && mongoose.connection.readyState === 1) {
        try {
          const isObjId = mongoose.isValidObjectId(rfqId);
          const dbRfq = await RFQ.findOne({
            $or: [{ rfqId }, isObjId ? { _id: rfqId } : null].filter(Boolean),
          });
          if (dbRfq) {
            room = rfqStore.ensureRoom(dbRfq.rfqId, dbRfq.toObject());
          }
        } catch (_) {}
      }

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

      const canonicalId = room.rfqId || room.id || rfqId;
      const roomKey = `room-${canonicalId}`;
      socket.join(roomKey);
      if (String(rfqId) !== String(canonicalId)) {
        socket.join(`room-${rfqId}`);
      }

      // Track participant in memory store
      const participantCount = rfqStore.addParticipant(canonicalId, socket.id, user);

      // Notify the joining socket with current room snapshot
      socket.emit('room_state', {
        rfqId: canonicalId,
        commodity: room?.commodity,
        lowestBid: room?.lowestBid,
        bids: room?.bids || [],
        participantCount,
      });

      // Broadcast updated participant count to all in room
      io.to(roomKey).emit('participant_update', {
        rfqId: canonicalId,
        participantCount,
      });
      if (String(rfqId) !== String(canonicalId)) {
        io.to(`room-${rfqId}`).emit('participant_update', {
          rfqId: canonicalId,
          participantCount,
        });
      }

      if (callback) {
        callback({ success: true, rfqId: canonicalId, participantCount });
      }
    });

    // Leave a specific RFQ bidding room
    socket.on('leave_room', ({ rfqId } = {}, callback) => {
      if (!rfqId) return;
      const room = rfqStore.getRoom(rfqId);
      const canonicalId = room ? (room.rfqId || room.id) : rfqId;
      socket.leave(`room-${canonicalId}`);
      if (String(rfqId) !== String(canonicalId)) {
        socket.leave(`room-${rfqId}`);
      }

      const affected = rfqStore.removeParticipant(socket.id);

      io.to(`room-${canonicalId}`).emit('participant_update', {
        rfqId: canonicalId,
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
        const canonicalId = room.rfqId || room.id || rfqId;

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
              rfqId: canonicalId,
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
              await Bidding.markPriorBidsOutbid(canonicalId, persistedBid._id);
            }
          } catch (dbErr) {
            console.warn('[Socket.io] MongoDB persist warning (using memory store fallback):', dbErr.message);
          }
        }

        // 2. Record in active RFQ store
        const { recordedBid, isNewLowest, lowestBid } = rfqStore.addBid(canonicalId, {
          ...(persistedBid ? persistedBid.toObject() : {}),
          rfqId: canonicalId,
          supplierId,
          supplierName,
          amount: numericAmount,
          currency,
          unit,
        });

        const roomKey = `room-${canonicalId}`;

        // 3. Broadcast bid to every participant in room
        io.to(roomKey).emit('bid_placed', {
          rfqId: canonicalId,
          bid: recordedBid,
          isLowest: isNewLowest,
        });
        if (String(rfqId) !== String(canonicalId)) {
          io.to(`room-${rfqId}`).emit('bid_placed', {
            rfqId: canonicalId,
            bid: recordedBid,
            isLowest: isNewLowest,
          });
        }

        // If new floor established, emit lowest_bid_update
        if (isNewLowest) {
          io.to(roomKey).emit('lowest_bid_update', {
            rfqId: canonicalId,
            lowestBid,
            winningSupplier: recordedBid.supplierName,
            bidId: recordedBid.id,
          });
          if (String(rfqId) !== String(canonicalId)) {
            io.to(`room-${rfqId}`).emit('lowest_bid_update', {
              rfqId: canonicalId,
              lowestBid,
              winningSupplier: recordedBid.supplierName,
              bidId: recordedBid.id,
            });
          }
        }

        if (callback) {
          callback({ success: true, bid: recordedBid, isLowest: isNewLowest });
        }
      } catch (err) {
        console.error('[Socket.io] Error in place_bid:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // Close auction room (manual creator action or autonomous)
    socket.on('close_auction', async ({ rfqId, buyerId } = {}, callback) => {
      try {
        if (!rfqId) {
          if (callback) callback({ error: 'rfqId is required' });
          return;
        }

        const closeResult = rfqStore.closeRoom(rfqId, buyerId);
        if (!closeResult) {
          if (callback) callback({ error: 'Auction room not found' });
          return;
        }

        const { room, winner, standings } = closeResult;
        const canonicalId = room.rfqId || room.id || rfqId;
        const roomKey = `room-${canonicalId}`;

        // Broadcast to all participants in room
        io.to(roomKey).emit('auction_closed', {
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

        // Broadcast globally so all suppliers on the floor and buyer dashboard update in real time
        io.emit('auction_closed', {
          rfqId: canonicalId,
          status: 'CLOSED',
          lowestBid: room.lowestBid,
          winner,
          standings,
          closedAt: room.closedAt,
        });

        // Persist close in MongoDB
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
          } catch (_) {}
        }

        // Send app notifications to winner, losers, and buyer
        notificationService.notifyAuctionClosed({
          io,
          rfq: room,
          winner,
          standings,
        });

        if (callback) callback({ success: true, rfqId: canonicalId, winner });
      } catch (err) {
        console.error('[Socket.io] Error closing auction:', err.message);
        if (callback) callback({ error: err.message });
      }
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
