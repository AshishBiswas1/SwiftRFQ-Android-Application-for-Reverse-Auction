/**
 * In-memory store for active RFQ bidding rooms, participant sockets,
 * and live reverse auction metadata.
 */

class RfqStore {
  constructor() {
    // Map of rfqId -> { id, commodity, quantity, unit, ceilingPrice, minDecrement, status, lowestBid, bids: [], participants: Map(socketId -> userInfo) }
    this.rooms = new Map();
  }

  getRoom(rfqId) {
    return this.rooms.get(rfqId) || null;
  }

  ensureRoom(rfqId, initialData = {}) {
    if (!this.rooms.has(rfqId)) {
      this.rooms.set(rfqId, {
        id: rfqId,
        commodity: initialData.commodity || 'Commodity RFQ',
        quantity: initialData.quantity || 1,
        unit: initialData.unit || 'Units',
        ceilingPrice: initialData.ceilingPrice || 100,
        minDecrement: initialData.minDecrement || 0.5,
        status: initialData.status || 'LIVE',
        lowestBid: initialData.lowestBid || initialData.ceilingPrice || null,
        buyerId: initialData.buyerId ? String(initialData.buyerId) : null,
        buyerName: initialData.buyerName || 'Buyer',
        invitedSuppliers: Array.isArray(initialData.invitedSuppliers) ? initialData.invitedSuppliers : [],
        bids: [],
        participants: new Map(),
        createdAt: new Date(),
      });
    }
    return this.rooms.get(rfqId);
  }

  addParticipant(rfqId, socketId, userInfo = {}) {
    const room = this.ensureRoom(rfqId);
    room.participants.set(socketId, {
      socketId,
      name: userInfo.name || 'Anonymous Bidder',
      role: userInfo.role || 'SUPPLIER',
      joinedAt: new Date(),
    });
    return room.participants.size;
  }

  removeParticipant(socketId) {
    const affectedRooms = [];
    for (const [rfqId, room] of this.rooms.entries()) {
      if (room.participants.has(socketId)) {
        room.participants.delete(socketId);
        affectedRooms.push({ rfqId, participantCount: room.participants.size });
      }
    }
    return affectedRooms;
  }

  addBid(rfqId, bidData) {
    const room = this.ensureRoom(rfqId);

    const prevLowest = room.lowestBid !== null ? room.lowestBid : room.ceilingPrice;
    const isNewLowest = room.lowestBid === null || bidData.amount < room.lowestBid;
    const delta = prevLowest !== null ? Number((bidData.amount - prevLowest).toFixed(2)) : null;

    // Mark previous lowest bids as OUTBID in memory
    if (isNewLowest) {
      room.bids.forEach((b) => {
        if (b.status === 'LOWEST') b.status = 'OUTBID';
      });
      room.lowestBid = bidData.amount;
    }

    const recordedBid = {
      id: bidData._id ? bidData._id.toString() : `bid-${Date.now()}`,
      rfqId,
      supplierId: bidData.supplierId || null,
      supplierName: bidData.supplierName || 'Anonymous Supplier',
      amount: Number(bidData.amount),
      currency: bidData.currency || 'INR',
      unit: bidData.unit || room.unit || 'L',
      status: isNewLowest ? 'LOWEST' : 'OUTBID',
      delta,
      timestamp: bidData.timestamp || new Date(),
    };

    room.bids.unshift(recordedBid);
    return { recordedBid, isNewLowest, lowestBid: room.lowestBid };
  }

  getAllRooms(filter = {}) {
    let list = Array.from(this.rooms.values());

    // Isolation: If buyer requests, only return that buyer's own RFQs
    if (filter.buyerId) {
      const bid = String(filter.buyerId);
      list = list.filter((r) => r.buyerId === bid);
    } else if (filter.role === 'BUYER') {
      // Unspecified buyer ID cannot see other buyers' rooms
      list = [];
    }

    return list.map((r) => ({
      ...r,
      participantCount: r.participants.size,
    }));
  }

  isBuyerAuthorized(rfqId, buyerId) {
    const room = this.getRoom(rfqId);
    if (!room) return false;
    if (!room.buyerId) return true;
    return room.buyerId === String(buyerId);
  }
}

module.exports = new RfqStore();
