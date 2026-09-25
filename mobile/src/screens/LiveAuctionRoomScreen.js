import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { darkPalette } from '../theme/tokens';
import { socket } from '../services/socket';
import api from '../services/api';
import { showCustomAlert } from '../services/customAlert';

// ── Initials Avatar ──────────────────────────────────────────────────────────
function Avatar({ name, size = 36, bg, fg }) {
  const initials = (name || 'Supplier')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: fg, fontSize: size * 0.36, fontWeight: '700', letterSpacing: 0.5 }}>
        {initials}
      </Text>
    </View>
  );
}

// ── Rank Badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank, theme }) {
  const medals = {
    1: { bg: theme.olive, fg: theme.primaryText },
    2: { bg: theme.rust, fg: theme.primaryText },
    3: { bg: theme.brass, fg: theme.primaryText },
  };
  const s = medals[rank] || { bg: theme.surface2, fg: theme.inkDim };
  return (
    <View style={[rankSt.badge, { backgroundColor: s.bg }]}>
      <Text style={[rankSt.text, { color: s.fg }]}>#{rank}</Text>
    </View>
  );
}
const rankSt = StyleSheet.create({
  badge: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 10.5, fontWeight: '800' },
});

// ── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ label, theme }) {
  const map = {
    LOWEST: { bg: 'rgba(95,107,69,0.15)', border: theme.olive, fg: theme.olive },
    OUTBID: { bg: 'rgba(140,68,38,0.12)', border: theme.rust, fg: theme.rust },
    WITHDRAWN: { bg: 'rgba(110,99,82,0.12)', border: theme.inkDim, fg: theme.inkDim },
  };
  const s = map[label] || map.OUTBID;
  return (
    <View style={[pillSt.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[pillSt.text, { color: s.fg }]}>{label}</Text>
    </View>
  );
}
const pillSt = StyleSheet.create({
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  text: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.6 },
});

// ── Bid Tile ─────────────────────────────────────────────────────────────────
function BidTile({ item, rank, theme }) {
  const isWinner = rank === 1;
  return (
    <View
      style={[
        tileSt.tile,
        {
          backgroundColor: isWinner ? 'rgba(95,107,69,0.10)' : theme.surface,
          borderColor: isWinner ? theme.olive : theme.line,
        },
      ]}
    >
      {isWinner && <View style={[tileSt.stripe, { backgroundColor: theme.olive }]} />}

      <View style={tileSt.left}>
        <RankBadge rank={rank} theme={theme} />
        <Avatar
          name={item.supplierName}
          size={36}
          bg={isWinner ? theme.olive : theme.surface2}
          fg={isWinner ? theme.primaryText : theme.inkDim}
        />
      </View>

      <View style={tileSt.centre}>
        <Text style={[tileSt.name, { color: theme.ink }]} numberOfLines={1}>
          {item.supplierName}
        </Text>
        <View style={tileSt.metaRow}>
          <StatusPill label={item.status} theme={theme} />
          <Text style={[tileSt.ts, { color: theme.inkDim }]}>{item.ts}</Text>
        </View>
      </View>

      <View style={tileSt.right}>
        <Text style={[tileSt.amount, { color: isWinner ? theme.olive : theme.ink }]}>
          ₹{Number(item.amount).toFixed(2)}
        </Text>
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
  left: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  centre: { flex: 1, gap: 3 },
  name: { fontSize: 13, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ts: { fontSize: 9.5 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '800' },
});

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

export default function LiveAuctionRoomScreen({
  rfq,
  role = 'BUYER',
  user,
  onExit,
  onShowWinner,
  theme = darkPalette,
}) {
  const [bids, setBids] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [isClosing, setIsClosing] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);

  const unit = rfq?.unit || 'L';
  const minStep = rfq?.minDecrement || 0.5;
  const roomId = rfq?.rfqId || rfq?.id || rfq?._id;

  // Countdown timer effect
  useEffect(() => {
    if (rfq?.status === 'CLOSED') {
      setTimeRemaining('Closed');
      return;
    }
    const updateTime = () => {
      const remaining = formatRemainingTime(rfq?.expiresAt);
      if (remaining === '00:00:00') {
        setTimeRemaining('Ended');
      } else {
        setTimeRemaining(remaining);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [rfq?.expiresAt, rfq?.status]);

  // Socket & Bids management
  useEffect(() => {
    if (rfq?.bids && rfq.bids.length > 0) {
      const sorted = [...rfq.bids].sort((a, b) => Number(a.amount) - Number(b.amount));
      const uniqueBids = [];
      const seenIds = new Set();
      sorted.forEach((b) => {
        const bidKey = b.id || b._id || `${b.supplierName}-${b.amount}`;
        if (seenIds.has(bidKey)) return;
        seenIds.add(bidKey);
        uniqueBids.push(b);
      });

      setBids(
        uniqueBids.map((b, i) => ({
          id: b.id || b._id,
          supplierName: b.supplierName || 'Verified Supplier',
          supplierId: b.supplierId,
          amount: Number(b.amount),
          status: i === 0 ? 'LOWEST' : 'OUTBID',
          ts: b.timestamp ? new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        }))
      );
    } else {
      setBids([]);
    }

    if (socket && roomId) {
      socket.emit('join_room', { rfqId: roomId, role, user });

      const onBidPlaced = (payload) => {
        const newBid = payload.bid || payload;
        if (!newBid) return;
        const bidId = newBid.id || newBid._id;

        setBids((prev) => {
          // Check for duplicates
          if (bidId && prev.some((b) => b.id === bidId)) {
            return prev;
          }
          if (prev.some((b) => b.supplierId === newBid.supplierId && Number(b.amount) === Number(newBid.amount) && b.ts === 'Just now')) {
            return prev;
          }

          const updated = [
            ...prev.map((b) => ({ ...b, status: 'OUTBID' })),
            {
              id: bidId || `bid-${Date.now()}`,
              supplierName: newBid.supplierName || 'Verified Supplier',
              supplierId: newBid.supplierId,
              amount: Number(newBid.amount),
              status: 'LOWEST',
              ts: 'Just now',
            },
          ];
          return updated.sort((a, b) => Number(a.amount) - Number(b.amount));
        });
      };

      const onParticipantUpdate = (data) => {
        if (data && data.participantCount !== undefined) {
          setParticipantsCount(data.participantCount);
        }
      };

      const onAuctionClosed = (closedPayload) => {
        // Auction closed either autonomously or manually
        if (onShowWinner) {
          onShowWinner({ ...rfq, ...closedPayload, status: 'CLOSED' });
        }
      };

      socket.on('bid_placed', onBidPlaced);
      socket.on('participant_update', onParticipantUpdate);
      socket.on('auction_closed', onAuctionClosed);

      return () => {
        socket.off('bid_placed', onBidPlaced);
        socket.off('participant_update', onParticipantUpdate);
        socket.off('auction_closed', onAuctionClosed);
        socket.emit('leave_room', { rfqId: roomId });
      };
    }
  }, [roomId, rfq]);

  // Close auction manually by creator
  const handleCloseAuction = () => {
    showCustomAlert(
      'End Bidding Session?',
      'Are you sure you want to end this live auction now? The current leading bidder will be declared the winner.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Auction',
          onPress: async () => {
            setIsClosing(true);
            try {
              const buyerId = user?._id || user?.id || rfq?.buyerId;
              const res = await api.closeRfq(roomId, buyerId);
              if (res && res.rfq) {
                if (onShowWinner) {
                  onShowWinner({ ...rfq, ...res, status: 'CLOSED' });
                }
              }
            } catch (err) {
              showCustomAlert('Error', err.message || 'Failed to close auction session.');
            } finally {
              setIsClosing(false);
            }
          },
        },
      ],
      { type: 'warning' }
    );
  };

  const lowestBid = bids.length > 0 ? bids[0] : null;
  const currentPrice = lowestBid
    ? Number(lowestBid.amount).toFixed(2)
    : rfq?.ceilingPrice
    ? Number(rfq.ceilingPrice).toFixed(2)
    : '—';
  const uniqueSuppliersCount = new Set(bids.map((b) => b.supplierName)).size;
  const displaySuppliersCount = Math.max(uniqueSuppliersCount, participantsCount);

  return (
    <View style={styles.container}>
      {/* Header matching Mockup */}
      <View style={styles.backRow}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
          onPress={onExit}
        >
          <Text style={{ color: theme.ink, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: theme.brass }]}>LIVE AUCTION</Text>
          <Text style={[styles.heading, { color: theme.ink }]} numberOfLines={1}>
            {rfq?.commodity || 'Active Commodity Auction'}
            {rfq?.grade ? ` — ${rfq.grade}` : ''}
          </Text>
        </View>
      </View>

      <Text style={[styles.subText, { color: theme.inkDim }]}>
        {(rfq?.quantity || 0).toLocaleString()} {unit} · {rfq?.deliveryTerms || 'ex-works'} · min. decrement ₹
        {Number(minStep).toFixed(2)}/{unit}
      </Text>

      {/* Live Status Bar matching Mockup media_1790085363507.png */}
      <View style={[styles.liveBar, { backgroundColor: theme.surface, borderColor: theme.rust }]}>
        <View style={styles.liveLeft}>
          <View style={[styles.liveDot, { backgroundColor: theme.rust }]} />
          <Text style={[styles.liveText, { color: theme.ink }]}>
            {displaySuppliersCount > 0
              ? `${displaySuppliersCount} supplier${displaySuppliersCount > 1 ? 's' : ''} bidding`
              : 'Waiting for suppliers'}
          </Text>
        </View>
        <Text style={[styles.timer, { color: theme.rust }]}>{timeRemaining}</Text>
      </View>

      {/* Hero: Current Lowest Bid Card */}
      <View style={[styles.card, styles.centerCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.cardSub, { color: theme.inkDim }]}>CURRENT LOWEST BID</Text>
        <View style={styles.bigNumRow}>
          <Text style={[styles.bigNum, { color: theme.brass }]}>₹{currentPrice}</Text>
          <Text style={[styles.unitText, { color: theme.inkDim }]}> /{unit}</Text>
        </View>
        <Text style={[styles.supplierNameText, { color: lowestBid ? theme.olive : theme.inkDim }]}>
          {lowestBid ? lowestBid.supplierName : 'Ceiling limit (Awaiting opening bid)'}
        </Text>
      </View>

      {/* Standings List */}
      <FlatList
        data={bids}
        keyExtractor={(item, index) => `${item.supplierName}-${index}`}
        renderItem={({ item, index }) => <BidTile item={item} rank={index + 1} theme={theme} />}
        ListEmptyComponent={
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={{ fontSize: 26, marginBottom: 6 }}>⏳</Text>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>Waiting for opening bids</Text>
            <Text style={[styles.emptyDesc, { color: theme.inkDim }]}>
              Invited suppliers will appear here in real-time as prices drop below ₹
              {Number(rfq?.ceilingPrice || 0).toFixed(2)}.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 10 }}
      />

      {/* Close auction button for creator */}
      {role === 'BUYER' && (
        <TouchableOpacity
          style={[styles.ghostBtn, { borderColor: theme.rust, backgroundColor: 'rgba(140,68,38,0.07)' }]}
          onPress={handleCloseAuction}
          disabled={isClosing}
        >
          {isClosing ? (
            <ActivityIndicator color={theme.rust} size="small" />
          ) : (
            <Text style={[styles.ghostBtnText, { color: theme.rust }]}>Close auction now</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  backBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  heading: { fontSize: 18, fontWeight: '700' },
  subText: { fontSize: 12.5, marginTop: -2 },
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
  liveText: { fontSize: 12.5, fontWeight: '600' },
  timer: { fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 3 },
  centerCard: { alignItems: 'center' },
  cardSub: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8 },
  bigNumRow: { flexDirection: 'row', alignItems: 'baseline' },
  bigNum: { fontSize: 32, fontWeight: '700' },
  unitText: { fontSize: 14 },
  supplierNameText: { fontSize: 13, fontWeight: '700' },
  ghostBtn: { borderWidth: 1.2, padding: 13, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  ghostBtnText: { fontSize: 14, fontWeight: '700' },
  emptyBox: { padding: 22, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginVertical: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
});
