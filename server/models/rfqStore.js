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
    if (!rfqId) return null;
    const strId = String(rfqId);
    if (this.rooms.has(strId)) return this.rooms.get(strId);
    for (const room of this.rooms.values()) {
      if (
        String(room.id) === strId ||
        String(room.rfqId) === strId ||
        (room._id && String(room._id) === strId)
      ) {
        return room;
      }
    }
    return null;
  }

  ensureRoom(rfqId, initialData = {}) {
    const existing = this.getRoom(rfqId);
    if (existing) {
      if (!this.rooms.has(String(rfqId))) {
        this.rooms.set(String(rfqId), existing);
      }
      return existing;
    }

    const durationMinutes = Number(initialData.durationMinutes) || 60;
    const startedAt = initialData.startedAt ? new Date(initialData.startedAt) : new Date();
    const expiresAt = initialData.expiresAt ? new Date(initialData.expiresAt) : new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
    const canonicalId = initialData.rfqId || rfqId;

    const roomObj = {
      id: canonicalId,
      rfqId: canonicalId,
      _id: initialData._id ? String(initialData._id) : undefined,
      commodity: initialData.commodity || 'Commodity RFQ',
      quantity: initialData.quantity || 1,
      unit: initialData.unit || 'L',
      grade: initialData.grade || '',
      deliveryTerms: initialData.deliveryTerms || '',
      durationMinutes,
      ceilingPrice: Number(initialData.ceilingPrice) || 100,
      minDecrement: Number(initialData.minDecrement) || 0.5,
      reservePrice: initialData.reservePrice ? Number(initialData.reservePrice) : null,
      status: initialData.status || 'LIVE',
      lowestBid: initialData.lowestBid ? Number(initialData.lowestBid) : null,
      buyerId: initialData.buyerId ? String(initialData.buyerId) : null,
      buyerName: initialData.buyerName || 'Buyer',
      invitedSuppliers: Array.isArray(initialData.invitedSuppliers) ? initialData.invitedSuppliers : [],
      bids: Array.isArray(initialData.bids) ? [...initialData.bids] : [],
      winner: initialData.winner || null,
      participants: new Map(),
      startedAt,
      expiresAt,
      closedAt: initialData.closedAt || null,
      createdAt: startedAt,
    };

    this.rooms.set(String(canonicalId), roomObj);
    if (String(rfqId) !== String(canonicalId)) {
      this.rooms.set(String(rfqId), roomObj);
    }
    if (initialData._id && String(initialData._id) !== String(canonicalId)) {
      this.rooms.set(String(initialData._id), roomObj);
    }
    return roomObj;
  }

  closeRoom(rfqId, closedByUserId = null) {
    const room = this.getRoom(rfqId);
    if (!room) return null;
    if (room.status === 'CLOSED') {
      return { room, winner: room.winner, standings: room.bids, alreadyClosed: true };
    }

    if (closedByUserId && room.buyerId && room.buyerId !== String(closedByUserId)) {
      throw new Error("Only the creator of this auction can end the bidding session.");
    }

    room.status = 'CLOSED';
    room.closedAt = new Date();

    // Select winner autonomously: in reverse auction, lowest valid bid wins
    let winner = null;
    if (room.bids && room.bids.length > 0) {
      const lowest = room.bids.find((b) => b.status === 'LOWEST') || room.bids[0];
      winner = {
        supplierId: lowest.supplierId,
        supplierName: lowest.supplierName,
        amount: Number(lowest.amount),
        wonAt: room.closedAt,
        metReserve: room.reservePrice ? Number(lowest.amount) <= Number(room.reservePrice) : true,
      };
    }

    room.winner = winner;
    return { room, winner, standings: room.bids };
  }

  deleteRoom(rfqId, buyerId = null) {
    const room = this.getRoom(rfqId);
    if (!room) return false;

    if (buyerId && room.buyerId && room.buyerId !== String(buyerId)) {
      throw new Error("Only the creator of this auction can delete it.");
    }

    for (const [key, val] of this.rooms.entries()) {
      if (
        val === room ||
        key === String(rfqId) ||
        key === String(room.id) ||
        key === String(room.rfqId) ||
        (room._id && key === String(room._id))
      ) {
        this.rooms.delete(key);
      }
    }
    return true;
  }

  checkExpiredRooms() {
    const now = new Date();
    const expiredClosedRooms = [];

    for (const [rfqId, room] of this.rooms.entries()) {
      if (room.status === 'LIVE' && room.expiresAt && now >= new Date(room.expiresAt)) {
        const closedResult = this.closeRoom(rfqId);
        if (closedResult && !closedResult.alreadyClosed) {
          expiredClosedRooms.push(closedResult);
        }
      }
    }

    return expiredClosedRooms;
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

    const bidId = bidData.id || (bidData._id ? bidData._id.toString() : null);

    // Deduplication check: prevent duplicate bid insertions
    if (bidId) {
      const existing = room.bids.find((b) => b.id === bidId);
      if (existing) {
        return { recordedBid: existing, isNewLowest: existing.status === 'LOWEST', lowestBid: room.lowestBid };
      }
    }
    const duplicateCandidate = room.bids.find(
      (b) =>
        b.supplierId === bidData.supplierId &&
        Number(b.amount) === Number(bidData.amount) &&
        Math.abs(new Date(b.timestamp).getTime() - new Date(bidData.timestamp || Date.now()).getTime()) < 2000
    );
    if (duplicateCandidate) {
      return { recordedBid: duplicateCandidate, isNewLowest: duplicateCandidate.status === 'LOWEST', lowestBid: room.lowestBid };
    }

    const prevLowest = room.lowestBid !== null ? room.lowestBid : room.ceilingPrice;
    const isNewLowest = room.lowestBid === null || Number(bidData.amount) < room.lowestBid;
    const delta = prevLowest !== null ? Number((Number(bidData.amount) - prevLowest).toFixed(2)) : null;

    // Mark previous lowest bids as OUTBID in memory
    if (isNewLowest) {
      room.bids.forEach((b) => {
        if (b.status === 'LOWEST') b.status = 'OUTBID';
      });
      room.lowestBid = Number(bidData.amount);
    }

    const recordedBid = {
      id: bidId || `bid-${Date.now()}`,
      rfqId: room.rfqId || rfqId,
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

    // Isolation: Only buyers are restricted to their own created RFQs
    if (filter.role === 'BUYER') {
      if (filter.buyerId) {
        const bid = String(filter.buyerId);
        list = list.filter((r) => r.buyerId === bid);
      } else {
        list = [];
      }
    }
    // Suppliers see all bidding rooms whether they are invited or not!

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
