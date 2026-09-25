import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { darkPalette } from '../theme/tokens';
import { showCustomAlert } from '../services/customAlert';
import { socket } from '../services/socket';
import api from '../services/api';

// ── Countdown Formatter Helper ───────────────────────────────────────────────
function formatRemainingTime(expiresAt) {
  if (!expiresAt) return '00:00:00';
  const target = new Date(expiresAt).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) return '00:00:00';

  const totalSecs = Math.floor(diff / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// ── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status = 'LIVE', theme }) {
  const isLive = status === 'LIVE';
  const isClosed = status === 'CLOSED';
  return (
    <View
      style={[
        pillSt.pill,
        {
          backgroundColor: isLive ? 'rgba(140,68,38,0.15)' : 'rgba(95,107,69,0.15)',
          borderColor: isLive ? theme.rust : theme.olive,
        },
      ]}
    >
      <View
        style={[
          pillSt.dot,
          { backgroundColor: isLive ? theme.rust : theme.olive },
        ]}
      />
      <Text style={[pillSt.text, { color: isLive ? theme.rust : theme.olive }]}>
        {status}
      </Text>
    </View>
  );
}
const pillSt = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
});

// ── History Tile ─────────────────────────────────────────────────────────────
function HistoryTile({ item, index, theme, unit }) {
  const isActive = index === 0;
  return (
    <View
      style={[
        tileSt.tile,
        {
          backgroundColor: isActive ? 'rgba(95,107,69,0.08)' : theme.surface,
          borderColor: isActive ? theme.olive : theme.line,
        },
      ]}
    >
      {isActive && <View style={[tileSt.stripe, { backgroundColor: theme.olive }]} />}

      <View style={[tileSt.numBadge, { backgroundColor: isActive ? theme.olive : theme.surface2 }]}>
        <Text style={[tileSt.numText, { color: isActive ? theme.primaryText : theme.inkDim }]}>
          #{index + 1}
        </Text>
      </View>

      <View style={tileSt.centre}>
        <Text style={[tileSt.timeText, { color: theme.ink }]}>{item.time}</Text>
        <Text style={[tileSt.statusText, { color: isActive ? theme.olive : theme.inkDim }]}>
          {isActive ? 'ACTIVE' : 'SUPERSEDED'}
        </Text>
      </View>

      <View style={tileSt.right}>
        <Text style={[tileSt.amount, { color: isActive ? theme.olive : theme.inkDim }]}>
          ₹{Number(item.amount).toFixed(2)}
        </Text>
        <Text style={[tileSt.unit, { color: theme.inkDim }]}>/{unit}</Text>
      </View>
    </View>
  );
}

// ── All Bids Standings Tile ──────────────────────────────────────────────────
function AllBidsTile({ item, index, theme, unit, isMe }) {
  const isLowest = index === 0;
  const timeStr = item.timestamp
    ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : (item.time || 'Recently');

  return (
    <View
      style={[
        tileSt.tile,
        {
          backgroundColor: isLowest ? 'rgba(95,107,69,0.08)' : theme.surface,
          borderColor: isLowest ? theme.olive : isMe ? theme.brass : theme.line,
        },
      ]}
    >
      {isLowest && <View style={[tileSt.stripe, { backgroundColor: theme.olive }]} />}

      <View style={[tileSt.numBadge, { backgroundColor: isLowest ? theme.olive : theme.surface2 }]}>
        <Text style={[tileSt.numText, { color: isLowest ? theme.primaryText : theme.inkDim }]}>
          #{index + 1}
        </Text>
      </View>

      <View style={tileSt.centre}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[tileSt.nameText, { color: theme.ink }]} numberOfLines={1}>
            {item.supplierName || 'Anonymous Supplier'}
          </Text>
          {isMe && (
            <View style={{ backgroundColor: theme.brass + '25', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 }}>
              <Text style={{ fontSize: 9.5, fontWeight: '800', color: theme.brass }}>YOU</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={[tileSt.statusText, { color: isLowest ? theme.olive : theme.inkDim }]}>
            {isLowest ? 'LOWEST' : 'OUTBID'}
          </Text>
          <Text style={[tileSt.dotSep, { color: theme.inkDim }]}>·</Text>
          <Text style={{ fontSize: 11, color: theme.inkDim }}>{timeStr}</Text>
        </View>
      </View>

      <View style={tileSt.right}>
        <Text style={[tileSt.amount, { color: isLowest ? theme.olive : theme.ink }]}>
          ₹{Number(item.amount).toFixed(2)}
        </Text>
        <Text style={[tileSt.unit, { color: theme.inkDim }]}>/{unit}</Text>
      </View>
    </View>
  );
}

const tileSt = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  numBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 10.5, fontWeight: '800' },
  centre: { flex: 1, gap: 2 },
  nameText: { fontSize: 13, fontWeight: '700' },
  timeText: { fontSize: 13, fontWeight: '700' },
  statusText: { fontSize: 9, fontWeight: '700' },
  dotSep: { fontSize: 10 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '800' },
  unit: { fontSize: 10, marginTop: -2 },
});

// ── Floor Auction Card (For Browsing All Rooms) ───────────────────────────────
function FloorAuctionCard({ item, theme, onSelect }) {
  const isLive = item.status === 'LIVE';
  const [timerStr, setTimerStr] = useState(
    isLive ? formatRemainingTime(item.expiresAt) : 'Closed'
  );

  useEffect(() => {
    if (!isLive) {
      setTimerStr('Closed');
      return;
    }
    const update = () => {
      const remaining = formatRemainingTime(item.expiresAt);
      if (remaining === '00:00:00') {
        setTimerStr('Ended');
      } else {
        setTimerStr(remaining);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [item.expiresAt, isLive]);

  const price = item.lowestBid != null ? Number(item.lowestBid).toFixed(2) : Number(item.ceilingPrice || 0).toFixed(2);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[floorSt.card, { backgroundColor: theme.surface, borderColor: isLive ? theme.rust : theme.line }]}
      onPress={() => onSelect(item)}
    >
      <View style={floorSt.headerRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[floorSt.commodity, { color: theme.ink }]} numberOfLines={1}>
            {item.commodity}
            {item.grade ? ` — ${item.grade}` : ''}
          </Text>
          <Text style={[floorSt.meta, { color: theme.inkDim }]}>
            {(item.quantity || 0).toLocaleString()} {item.unit || 'L'} · {item.deliveryTerms || 'ex-works'} · By {item.buyerName || 'Buyer'}
          </Text>
        </View>
        <StatusPill status={item.status} theme={theme} />
      </View>

      <View style={[floorSt.divider, { backgroundColor: theme.line }]} />

      <View style={floorSt.bottomRow}>
        <View>
          <Text style={[floorSt.priceLabel, { color: theme.inkDim }]}>
            {item.lowestBid != null ? 'CURRENT LOWEST' : 'STARTING CEILING'}
          </Text>
          <Text style={[floorSt.priceVal, { color: theme.brass }]}>
            ₹{price} <Text style={{ fontSize: 12, color: theme.inkDim }}>/{item.unit || 'L'}</Text>
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[floorSt.timer, { color: isLive ? theme.rust : theme.inkDim }]}>
            ⏱ {isLive ? timerStr : 'Closed'}
          </Text>
          <View style={[floorSt.enterBtn, { backgroundColor: isLive ? theme.brass : theme.surface2 }]}>
            <Text style={[floorSt.enterBtnText, { color: isLive ? theme.primaryText : theme.inkDim }]}>
              {isLive ? 'Bid Live ⚡' : 'View Standings'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const floorSt = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: 1.2, marginBottom: 12, gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  commodity: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12, lineHeight: 16 },
  divider: { height: 1 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6 },
  priceVal: { fontSize: 18, fontWeight: '800' },
  timer: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  enterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  enterBtnText: { fontSize: 11.5, fontWeight: '700' },
});

// ── Main Screen (Floor List + Selected Bidding Room) ─────────────────────────
export default function SupplierPortalScreen({
  rfq,
  rfqs = [],
  onSelectRfq,
  onBack,
  onRefreshRfqs,
  onShowWinner,
  theme = darkPalette,
  user,
}) {
  const [bidAmount, setBidAmount] = useState('');
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentLowest, setCurrentLowest] = useState(null);
  const [lowestSupplier, setLowestSupplier] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [allBids, setAllBids] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' or 'MY'
  const [floorFilter, setFloorFilter] = useState('ALL'); // 'ALL' | 'LIVE' | 'CLOSED'
  const [roomStatus, setRoomStatus] = useState(rfq?.status || 'LIVE');
  const [refreshing, setRefreshing] = useState(false);

  const supplierId = user?._id || user?.id || 'usr-supplier';
  const supplierName = user?.companyName || user?.name || 'Verified Bidder';

  const unit = rfq?.unit || 'L';
  const minStep = rfq?.minDecrement || 0.5;
  const roomId = rfq?.rfqId || rfq?.id || rfq?._id;
  const isRoomLive = roomStatus === 'LIVE';

  // Live countdown timer for selected room
  useEffect(() => {
    if (!rfq) return;
    const currentStatus = rfq?.status || 'LIVE';
    setRoomStatus(currentStatus);

    if (currentStatus === 'CLOSED') {
      setTimeRemaining('Closed');
      return;
    }

    const updateTime = () => {
      const remaining = formatRemainingTime(rfq?.expiresAt);
      if (remaining === '00:00:00') {
        setTimeRemaining('Ended');
        setRoomStatus('CLOSED');
      } else {
        setTimeRemaining(remaining);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [rfq?.expiresAt, rfq?.status]);

  // Socket and bids for selected room
  useEffect(() => {
    if (!rfq) return;

    const startingLowest =
      rfq?.lowestBid != null
        ? Number(rfq.lowestBid)
        : rfq?.ceilingPrice
        ? Number(rfq.ceilingPrice)
        : null;
    setCurrentLowest(startingLowest);

    if (rfq?.bids && rfq.bids.length > 0) {
      const sorted = [...rfq.bids].sort((a, b) => Number(a.amount) - Number(b.amount));
      const uniqueBids = [];
      const seenKeys = new Set();
      sorted.forEach((b) => {
        const key = b.id || b._id || `${b.supplierName}-${b.amount}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        uniqueBids.push(b);
      });

      setAllBids(uniqueBids);
      if (uniqueBids.length > 0) {
        setCurrentLowest(Number(uniqueBids[0].amount));
        setLowestSupplier(uniqueBids[0].supplierName || '');
      }

      const myBids = uniqueBids
        .filter((b) => b.supplierId === supplierId || b.supplierName === supplierName)
        .map((b) => ({
          id: b.id || b._id,
          time: b.timestamp
            ? new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Recently',
          amount: Number(b.amount),
        }));
      setHistory(myBids);
    } else {
      setAllBids([]);
      setHistory([]);
      setLowestSupplier('');
    }

    if (socket && roomId) {
      socket.emit('join_room', { rfqId: roomId, role: 'SUPPLIER', user });

      const onBidPlaced = (payload) => {
        const bid = payload.bid || payload;
        if (!bid) return;
        const bidId = bid.id || bid._id || `${bid.supplierName}-${bid.amount}`;

        setAllBids((prev) => {
          // Check for duplicate
          const exists = prev.some(
            (b) =>
              (bid.id && b.id === bid.id) ||
              (bid._id && b._id === bid._id) ||
              (b.supplierName === bid.supplierName &&
                Number(b.amount) === Number(bid.amount) &&
                Math.abs(new Date(b.timestamp || 0) - new Date(bid.timestamp || 0)) < 2500)
          );
          if (exists) return prev;

          const updated = [...prev, bid].sort((a, b) => Number(a.amount) - Number(b.amount));
          if (updated.length > 0) {
            setCurrentLowest(Number(updated[0].amount));
            setLowestSupplier(updated[0].supplierName || '');
          }
          return updated;
        });

        if (bid.supplierId === supplierId || bid.supplierName === supplierName) {
          setHistory((prev) => {
            const exists = prev.some(
              (h) => (bid.id && h.id === bid.id) || (Number(h.amount) === Number(bid.amount) && h.time === 'Just now')
            );
            if (exists) return prev;
            return [
              { id: bidId, time: 'Just now', amount: Number(bid.amount) },
              ...prev,
            ];
          });
        }
      };

      const onLowestBidUpdate = (data) => {
        if (data && data.lowestBid !== undefined) {
          setCurrentLowest(Number(data.lowestBid));
          if (data.winningSupplier) setLowestSupplier(data.winningSupplier);
        }
      };

      const onAuctionClosed = (data) => {
        setRoomStatus('CLOSED');
        setTimeRemaining('Closed');
        showCustomAlert(
          'Auction Closed',
          data.winner
            ? `Reverse auction ended. Winner: ${data.winner.supplierName} at ₹${Number(
                data.winner.amount
              ).toFixed(2)}/${unit}.`
            : 'Reverse auction concluded with no winning bids.',
          [
            {
              text: 'View Results',
              onPress: () => {
                if (onShowWinner) {
                  onShowWinner({ ...rfq, ...data, status: 'CLOSED' });
                }
              },
            },
          ]
        );
      };

      socket.on('bid_placed', onBidPlaced);
      socket.on('lowest_bid_update', onLowestBidUpdate);
      socket.on('auction_closed', onAuctionClosed);

      return () => {
        socket.off('bid_placed', onBidPlaced);
        socket.off('lowest_bid_update', onLowestBidUpdate);
        socket.off('auction_closed', onAuctionClosed);
        socket.emit('leave_room', { rfqId: roomId });
      };
    }
  }, [roomId, rfq, supplierId, supplierName]);

  const handlePullRefresh = async () => {
    setRefreshing(true);
    if (onRefreshRfqs) {
      await onRefreshRfqs();
    }
    setRefreshing(false);
  };

  // Rank computation for selected room
  const sortedUniqueBidders = Array.from(new Set(allBids.map((b) => b.supplierName)));
  const myIndex = sortedUniqueBidders.indexOf(supplierName);
  const myRank = myIndex !== -1 ? myIndex + 1 : '—';
  const totalBidders = Math.max(sortedUniqueBidders.length, 1);
  const isMeLowest = lowestSupplier === supplierName;

  const handlePlaceBid = async () => {
    const num = parseFloat(bidAmount);
    if (isNaN(num) || num <= 0) {
      showCustomAlert('Invalid Bid', 'Please enter a valid numeric bid amount.');
      return;
    }

    if (currentLowest != null && num > currentLowest - minStep) {
      showCustomAlert(
        'Bid Step Violation',
        `Your bid must be at least ₹${minStep.toFixed(2)} lower than the current floor ask (max allowable bid: ₹${(
          currentLowest - minStep
        ).toFixed(2)}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const bidPayload = {
        rfqId: roomId,
        supplierId,
        supplierName,
        amount: num,
        currency: 'INR',
        unit,
      };

      // Submit once: use real-time socket if connected, otherwise fallback to REST API
      if (socket && socket.connected) {
        await new Promise((resolve, reject) => {
          socket.emit('place_bid', bidPayload, (ack) => {
            if (ack && ack.error) {
              reject(new Error(ack.error));
            } else {
              resolve(ack);
            }
          });
        });
      } else {
        await api.submitBid(bidPayload);
      }

      setBidAmount('');
      showCustomAlert(
        'Bid Transmitted',
        `Your bid of ₹${num.toFixed(2)}/${unit} has been placed live on the floor.`,
        null,
        { type: 'success' }
      );
    } catch (err) {
      showCustomAlert('Error', err.message || 'Failed to submit bid.', null, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── VIEW 1: Browse ALL Bidding Rooms Floor (When no single room selected) ──
  if (!rfq) {
    const floorLiveCount = rfqs.filter((r) => r.status === 'LIVE').length;
    const floorClosedCount = rfqs.filter((r) => r.status === 'CLOSED').length;
    const myBidsPlacedCount = rfqs.reduce((acc, curr) => {
      if (!curr.bids || !Array.isArray(curr.bids)) return acc;
      const myCount = curr.bids.filter(
        (b) => b.supplierId === supplierId || b.supplierName === supplierName
      ).length;
      return acc + myCount;
    }, 0);

    const filteredFloorRfqs = rfqs.filter((r) => {
      if (floorFilter === 'LIVE') return r.status === 'LIVE';
      if (floorFilter === 'CLOSED') return r.status === 'CLOSED';
      return true;
    });

    return (
      <View style={styles.container}>
        <View style={styles.backRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
            onPress={onBack}
          >
            <Text style={{ color: theme.ink, fontSize: 16 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: theme.brass }]}>
              SUPPLIER · {supplierName.toUpperCase()}
            </Text>
            <Text style={[styles.heading, { color: theme.ink }]}>Live Auctions Floor</Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshIconBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
            onPress={handlePullRefresh}
          >
            <Text style={{ color: theme.brass, fontSize: 15 }}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row for Supplier */}
        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.statNum, { color: theme.rust }]}>{floorLiveCount}</Text>
            <Text style={[styles.statLabel, { color: theme.inkDim }]}>ACTIVE</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.statNum, { color: theme.brass }]}>{myBidsPlacedCount}</Text>
            <Text style={[styles.statLabel, { color: theme.inkDim }]}>BIDS PLACED</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.statNum, { color: theme.olive }]}>{rfqs.length}</Text>
            <Text style={[styles.statLabel, { color: theme.inkDim }]}>TOTAL RFQS</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {['ALL', 'LIVE', 'CLOSED'].map((f) => {
            const count =
              f === 'ALL'
                ? rfqs.length
                : f === 'LIVE'
                ? floorLiveCount
                : floorClosedCount;
            const active = floorFilter === f;
            return (
              <TouchableOpacity
                key={f}
                activeOpacity={0.75}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? theme.brass : theme.surface,
                    borderColor: active ? theme.brass : theme.line,
                  },
                ]}
                onPress={() => setFloorFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: active ? theme.primaryText : theme.inkDim,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {f === 'ALL' ? 'All' : f === 'LIVE' ? 'Live' : 'Closed'} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filteredFloorRfqs}
          keyExtractor={(item) => item.id || item._id || item.rfqId}
          renderItem={({ item }) => (
            <FloorAuctionCard
              item={item}
              theme={theme}
              onSelect={(selected) => onSelectRfq && onSelectRfq(selected)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handlePullRefresh} tintColor={theme.brass} />
          }
          ListEmptyComponent={
            <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.line, marginTop: 30 }]}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🏷️</Text>
              <Text style={[styles.emptyTitle, { color: theme.ink }]}>
                {floorFilter === 'LIVE'
                  ? 'No live auctions currently'
                  : floorFilter === 'CLOSED'
                  ? 'No closed auctions yet'
                  : 'No auctions available'}
              </Text>
              <Text style={[styles.emptyDesc, { color: theme.inkDim }]}>
                {floorFilter === 'LIVE'
                  ? 'There are no active auctions open for bidding at the moment. Pull down to refresh or check back soon.'
                  : 'When buyers post commodity requirements, they will appear here in real-time.'}
              </Text>
              <TouchableOpacity
                style={[styles.refreshActionBtn, { backgroundColor: theme.brass }]}
                onPress={handlePullRefresh}
              >
                <Text style={[styles.refreshActionText, { color: theme.primaryText }]}>Refresh Floor 🔄</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    );
  }

  // ── VIEW 2: Dedicated Bidding Room (Matching mockup media_1790085419082.png) ──
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.backRow}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
          onPress={() => (onSelectRfq ? onSelectRfq(null) : onBack && onBack())}
        >
          <Text style={{ color: theme.ink, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: theme.brass }]} numberOfLines={1}>
            SUPPLIER · {supplierName.toUpperCase()}
          </Text>
          <Text style={[styles.heading, { color: theme.ink }]} numberOfLines={1}>
            {rfq?.commodity || 'Active Commodity Auction'}
            {rfq?.grade ? ` — ${rfq.grade}` : ''}
          </Text>
        </View>
      </View>

      <Text style={[styles.subText, { color: theme.inkDim }]}>
        Requested by {rfq?.buyerName || 'Verified Buyer'} · {(rfq?.quantity || 0).toLocaleString()} {unit} · {rfq?.deliveryTerms || 'ex-works'}
      </Text>

      {/* Live Status Bar matching Mockup */}
      <View
        style={[
          styles.liveBar,
          {
            backgroundColor: isRoomLive ? theme.surface : 'rgba(95,107,69,0.12)',
            borderColor: isRoomLive ? theme.rust : theme.olive,
          },
        ]}
      >
        <View style={styles.liveLeft}>
          <View style={[styles.liveDot, { backgroundColor: isRoomLive ? theme.rust : theme.olive }]} />
          <Text style={[styles.liveRank, { color: isRoomLive ? theme.ink : theme.olive, fontWeight: '700' }]}>
            {isRoomLive ? `Your rank: #${myRank} of ${totalBidders}` : 'Auction Concluded'}
          </Text>
        </View>
        <Text style={[styles.timer, { color: isRoomLive ? theme.rust : theme.olive }]}>
          {isRoomLive ? timeRemaining : 'Closed'}
        </Text>
      </View>

      {/* Hero: Lowest Bid To Beat */}
      <View style={[styles.card, styles.centerCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.cardSub, { color: theme.inkDim }]}>
          {isRoomLive ? 'LOWEST BID TO BEAT' : 'FINAL WINNING BID'}
        </Text>
        <View style={styles.bigNumRow}>
          <Text style={[styles.bigNum, { color: isRoomLive ? theme.brass : theme.olive }]}>
            {currentLowest != null ? `₹${Number(currentLowest).toFixed(2)}` : '—'}
          </Text>
          <Text style={[styles.unitText, { color: theme.inkDim }]}> /{unit}</Text>
        </View>
        <Text
          style={[
            styles.niceText,
            { color: isMeLowest ? theme.olive : theme.inkDim, fontWeight: isMeLowest ? '700' : '500' },
          ]}
        >
          {isRoomLive
            ? isMeLowest
              ? "that's you — nice"
              : lowestSupplier
              ? `Held by ${lowestSupplier}`
              : 'Ceiling limit'
            : lowestSupplier
            ? `Won by ${lowestSupplier}${isMeLowest ? ' (You won!)' : ''}`
            : 'Auction closed with no bids'}
        </Text>
      </View>

      {/* Place Bid Input Form (Only shown when room is LIVE) */}
      {isRoomLive ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.label, { color: theme.inkDim }]}>
            Your next bid (₹ / {unit}) · min. step ₹{Number(minStep).toFixed(2)}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink }]}
            value={bidAmount}
            onChangeText={setBidAmount}
            placeholder={currentLowest ? `e.g. ${(currentLowest - minStep).toFixed(2)}` : 'Enter bid amount'}
            placeholderTextColor={theme.inkDim}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.brass, opacity: submitting ? 0.7 : 1 }]}
            onPress={handlePlaceBid}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.primaryText} size="small" />
            ) : (
              <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>Place bid</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: 'rgba(95,107,69,0.10)',
              borderColor: theme.olive,
              alignItems: 'center',
              paddingVertical: 14,
              gap: 4,
            },
          ]}
        >
          <Text style={{ fontSize: 20 }}>🏁</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.olive }}>
            Bidding Session Concluded
          </Text>
          <Text style={{ fontSize: 12.5, color: theme.inkDim, textAlign: 'center' }}>
            {lowestSupplier
              ? `Winning Bid: ₹${Number(currentLowest).toFixed(2)}/${unit} by ${lowestSupplier}`
              : 'This reverse auction has ended.'}
          </Text>
        </View>
      )}

      {/* Bid List Tabs (Room Standings vs My Bids) */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tabToggleBtn,
            activeTab === 'ALL' && { backgroundColor: theme.surface2, borderColor: theme.brass },
          ]}
          onPress={() => setActiveTab('ALL')}
        >
          <Text
            style={[
              styles.tabToggleText,
              { color: activeTab === 'ALL' ? theme.brass : theme.inkDim, fontWeight: activeTab === 'ALL' ? '700' : '500' },
            ]}
          >
            Live Standings ({allBids.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tabToggleBtn,
            activeTab === 'MY' && { backgroundColor: theme.surface2, borderColor: theme.brass },
          ]}
          onPress={() => setActiveTab('MY')}
        >
          <Text
            style={[
              styles.tabToggleText,
              { color: activeTab === 'MY' ? theme.brass : theme.inkDim, fontWeight: activeTab === 'MY' ? '700' : '500' },
            ]}
          >
            My Bids ({history.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'ALL' ? (
        <FlatList
          data={allBids}
          keyExtractor={(item, index) => item.id || item._id || `${item.supplierName}-${item.amount}-${index}`}
          renderItem={({ item, index }) => (
            <AllBidsTile
              item={item}
              index={index}
              theme={theme}
              unit={unit}
              isMe={item.supplierId === supplierId || item.supplierName === supplierName}
            />
          )}
          ListEmptyComponent={
            <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <Text style={{ fontSize: 24, marginBottom: 4 }}>🏷️</Text>
              <Text style={[styles.emptyTitle, { color: theme.ink }]}>No bids submitted yet</Text>
              <Text style={[styles.emptyDesc, { color: theme.inkDim }]}>
                Be the first to place an opening offer on this commodity auction.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item.id || `${item.time}-${index}`}
          renderItem={({ item, index }) => <HistoryTile item={item} index={index} theme={theme} unit={unit} />}
          ListEmptyComponent={
            <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <Text style={{ fontSize: 24, marginBottom: 4 }}>🏷️</Text>
              <Text style={[styles.emptyTitle, { color: theme.ink }]}>You haven't bid yet</Text>
              <Text style={[styles.emptyDesc, { color: theme.inkDim }]}>
                Enter a bid above to submit your competitive price.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  backBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  refreshIconBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  heading: { fontSize: 18, fontWeight: '700' },
  subText: { fontSize: 12.5, marginTop: -2 },
  tabToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabToggleText: {
    fontSize: 12.5,
  },
  liveBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  liveLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveRank: { fontSize: 12.5, fontWeight: '600' },
  timer: { fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 6 },
  centerCard: { alignItems: 'center' },
  cardSub: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8 },
  bigNumRow: { flexDirection: 'row', alignItems: 'baseline' },
  bigNum: { fontSize: 32, fontWeight: '700' },
  unitText: { fontSize: 14 },
  niceText: { fontSize: 12.5 },
  label: { fontSize: 11.5, fontWeight: '600' },
  input: { padding: 10, borderRadius: 9, borderWidth: 1, fontSize: 14 },
  primaryBtn: { padding: 13, borderRadius: 11, alignItems: 'center', marginTop: 2 },
  primaryBtnText: { fontSize: 14.5, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  sectionLine: { flex: 1, height: 1 },
  emptyBox: { padding: 22, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginVertical: 6 },
  emptyTitle: { fontSize: 14.5, fontWeight: '700', marginBottom: 4 },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 16, marginBottom: 12 },
  refreshActionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  refreshActionText: { fontSize: 13, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  stat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    gap: 2,
  },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
  },
});
