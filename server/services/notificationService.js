const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Contact = require('../models/Contact');

const inMemoryNotifications = [];

const notificationService = {
  /**
   * Create and send a real-time notification to a user
   */
  createAndSend: async ({ io, recipientUserId, title, message, type, rfqId, commodity, meta }) => {
    try {
      if (!recipientUserId) return null;

      let notifDoc = null;
      if (mongoose.connection.readyState === 1) {
        try {
          notifDoc = await Notification.create({
            recipientUserId: String(recipientUserId),
            title,
            message,
            type: type || 'SYSTEM',
            rfqId: rfqId || null,
            commodity: commodity || '',
            meta: meta || {},
          });
        } catch (dbErr) {
          console.warn('[Notification] DB create warning:', dbErr.message);
        }
      }

      const notifData = notifDoc ? notifDoc.toObject() : {
        _id: `notif-${Date.now()}-${Math.random()}`,
        recipientUserId: String(recipientUserId),
        title,
        message,
        type: type || 'SYSTEM',
        rfqId: rfqId || null,
        commodity: commodity || '',
        read: false,
        createdAt: new Date(),
        meta: meta || {},
      };

      if (!notifDoc) {
        inMemoryNotifications.unshift(notifData);
      }

      // Emit real-time socket event to the recipient's personal user room
      if (io) {
        const userRoom = `user-${recipientUserId}`;
        io.to(userRoom).emit('new_notification', notifData);
        // Also emit globally for active supplier sockets in the app
        io.emit('in_app_notification', notifData);
      }

      return notifData;
    } catch (err) {
      console.error('[Notification Service Error]', err.message);
      return null;
    }
  },

  /**
   * Autonomously notify ALL contacts of the buyer when a live auction session is started,
   * without requiring the buyer to manually invite them.
   */
  notifyAuctionStarted: async ({ io, rfq, invitedSuppliers = [] }) => {
    try {
      const buyerId = rfq.buyerId;
      const rfqId = rfq.id || rfq.rfqId;
      const commodity = rfq.commodity || 'Commodity';
      const quantity = rfq.quantity || '';
      const unit = rfq.unit || 'L';
      const buyerName = rfq.buyerName || 'Verified Buyer';

      // 1. Gather all contacts belonging to the buyer autonomously
      const allRecipientContacts = [];
      const seenKeys = new Set();

      const addCandidate = (c) => {
        if (!c) return;
        const key = c.supplierUserId || c.phone || c.email || c.name || c.companyName;
        if (key && !seenKeys.has(key)) {
          seenKeys.add(key);
          allRecipientContacts.push(c);
        }
      };

      // Add any explicitly invited suppliers
      if (Array.isArray(invitedSuppliers)) {
        invitedSuppliers.forEach(addCandidate);
      }

      // Autonomously query all contacts belonging to this buyer from MongoDB
      if (buyerId && mongoose.connection.readyState === 1) {
        try {
          const dbContacts = await Contact.find({ buyerId });
          dbContacts.forEach((doc) => addCandidate(doc.toObject()));
        } catch (dbErr) {
          console.warn('[Notification] Error querying buyer contacts from DB:', dbErr.message);
        }
      }

      // Autonomously query all contacts belonging to this buyer from in-memory fallback
      try {
        const contactCtrl = require('../controllers/contactController');
        if (contactCtrl && contactCtrl.inMemoryContacts) {
          Array.from(contactCtrl.inMemoryContacts.values())
            .filter((c) => String(c.buyerId) === String(buyerId))
            .forEach(addCandidate);
        }
      } catch (_) {}

      // 2. Dispatch notification to every contact autonomously
      for (const supplier of allRecipientContacts) {
        let targetUserId = supplier.id || supplier._id || supplier.supplierUserId;

        // If no direct userId, try looking up registered user by phone or email
        if (!targetUserId && (supplier.phone || supplier.email) && mongoose.connection.readyState === 1) {
          try {
            const query = [];
            if (supplier.phone) query.push({ phone: supplier.phone });
            if (supplier.email) query.push({ email: supplier.email });
            const matchedUser = await User.findOne({ $or: query });
            if (matchedUser) {
              targetUserId = matchedUser._id.toString();
            }
          } catch (_) {}
        }

        const recipient = targetUserId ? String(targetUserId) : (supplier.phone || supplier.email);
        if (recipient) {
          await notificationService.createAndSend({
            io,
            recipientUserId: recipient,
            title: '⚡ Live Reverse Auction Started',
            message: `${buyerName} started a live reverse auction for ${commodity} (${quantity} ${unit}). Tap to enter the bidding room!`,
            type: 'SESSION_START',
            rfqId,
            commodity,
            meta: { rfqId, buyerName, quantity, unit },
          });
        }
      }

      // 3. Broadcast new auction globally over socket so all connected suppliers see the room immediately
      if (io) {
        io.emit('new_auction_available', rfq);
      }
    } catch (err) {
      console.error('[Notification Auction Started Error]', err.message);
    }
  },

  /**
   * Notify winner and other participants when an auction closes (autonomous or manual)
   */
  notifyAuctionClosed: async ({ io, rfq, winner, standings = [] }) => {
    try {
      const rfqId = rfq.id || rfq.rfqId;
      const commodity = rfq.commodity || 'Commodity';
      const unit = rfq.unit || 'L';
      const buyerId = rfq.buyerId;

      // 1. Notify the Winner
      if (winner && winner.supplierId) {
        await notificationService.createAndSend({
          io,
          recipientUserId: String(winner.supplierId),
          title: '🎉 Congratulations! You Won the Bid!',
          message: `You have won the reverse auction for ${commodity} at ₹${Number(winner.amount).toFixed(2)}/${unit}. Open SwiftRFQ for order & fulfillment details.`,
          type: 'AUCTION_WON',
          rfqId,
          commodity,
          meta: { rfqId, winnerAmount: winner.amount, unit },
        });
      }

      // 2. Notify the Losers / other participants who placed bids
      const notifiedUserIds = new Set();
      if (winner && winner.supplierId) {
        notifiedUserIds.add(String(winner.supplierId));
      }

      for (const bid of standings) {
        const bidderId = bid.supplierId ? String(bid.supplierId) : null;
        if (bidderId && !notifiedUserIds.has(bidderId)) {
          notifiedUserIds.add(bidderId);
          await notificationService.createAndSend({
            io,
            recipientUserId: bidderId,
            title: 'Reverse Auction Concluded',
            message: `The reverse auction for ${commodity} has closed. The winning bid was ₹${winner ? Number(winner.amount).toFixed(2) : '—'}/${unit}. Tap to view final standings.`,
            type: 'AUCTION_LOST',
            rfqId,
            commodity,
            meta: { rfqId, winningBid: winner ? winner.amount : null, unit },
          });
        }
      }

      // 3. Notify the Buyer
      if (buyerId) {
        await notificationService.createAndSend({
          io,
          recipientUserId: String(buyerId),
          title: 'Auction Session Closed',
          message: winner
            ? `Your auction for ${commodity} has ended. Winner: ${winner.supplierName} at ₹${Number(winner.amount).toFixed(2)}/${unit}.`
            : `Your auction for ${commodity} has concluded with no bids placed.`,
          type: 'AUCTION_CLOSED',
          rfqId,
          commodity,
          meta: { rfqId, winner },
        });
      }
    } catch (err) {
      console.error('[Notification Auction Closed Error]', err.message);
    }
  },

  /**
   * Get notifications for a user
   */
  getUserNotifications: async (userId) => {
    if (!userId) return [];
    if (mongoose.connection.readyState === 1) {
      try {
        return await Notification.find({ recipientUserId: String(userId) }).sort({ createdAt: -1 }).limit(50);
      } catch (e) {
        console.warn('[Notification] DB query warning:', e.message);
      }
    }
    return inMemoryNotifications.filter((n) => n.recipientUserId === String(userId));
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notifId, userId) => {
    if (mongoose.connection.readyState === 1) {
      try {
        return await Notification.findByIdAndUpdate(notifId, { read: true }, { new: true });
      } catch (_) {}
    }
    const mem = inMemoryNotifications.find((n) => n._id === notifId);
    if (mem) mem.read = true;
    return mem;
  },
};

module.exports = notificationService;
