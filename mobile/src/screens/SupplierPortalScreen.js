import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { darkPalette } from '../theme/tokens';
import { showCustomAlert } from '../services/customAlert';

// ── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ label, theme }) {
  const map = {
    ACTIVE:     { bg: 'rgba(95,107,69,0.15)',  border: theme.olive,  fg: theme.olive },
    SUPERSEDED: { bg: 'rgba(110,99,82,0.10)',  border: theme.inkDim, fg: theme.inkDim },
  };
  const s = map[label] || map.SUPERSEDED;
  return (
    <View style={[pillSt.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[pillSt.text, { color: s.fg }]}>{label}</Text>
    </View>
  );
}
const pillSt = StyleSheet.create({
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
});

// ── History Tile ─────────────────────────────────────────────────────────────
function HistoryTile({ item, index, theme }) {
  const isActive = index === 0;
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        tileSt.tile,
        {
          backgroundColor: isActive ? 'rgba(95,107,69,0.08)' : theme.surface,
          borderColor: isActive ? theme.olive : theme.line,
        },
      ]}
    >
      {/* Active left stripe */}
      {isActive && <View style={[tileSt.stripe, { backgroundColor: theme.olive }]} />}

      {/* Number badge */}
      <View style={[tileSt.numBadge, { backgroundColor: isActive ? theme.olive : theme.surface2 }]}>
        <Text style={[tileSt.numText, { color: isActive ? theme.primaryText : theme.inkDim }]}>
          #{index + 1}
        </Text>
      </View>

      {/* Centre: timestamp + status pill */}
      <View style={tileSt.centre}>
        <Text style={[tileSt.timeText, { color: theme.ink }]}>{item.time}</Text>
        <View style={tileSt.metaRow}>
          <StatusPill label={isActive ? 'ACTIVE' : 'SUPERSEDED'} theme={theme} />
        </View>
      </View>

      {/* Right: amount + unit */}
      <View style={tileSt.right}>
        <Text style={[tileSt.amount, { color: isActive ? theme.olive : theme.inkDim }]}>
          ₹{item.amount}
        </Text>
        <Text style={[tileSt.unit, { color: theme.inkDim }]}>/L</Text>
      </View>
    </TouchableOpacity>
  );
}
const tileSt = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1.2,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginBottom: 8,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  numBadge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 11, fontWeight: '800' },
  centre: { flex: 1, gap: 4 },
  timeText: { fontSize: 13.5, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 18, fontWeight: '800' },
  unit: { fontSize: 10, marginTop: -2 },
});

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function SupplierPortalScreen({ rfq, onBack, theme = darkPalette, user }) {
  const [bidAmount, setBidAmount] = useState('');
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const unit = rfq?.unit || 'L';
  const minStep = rfq?.minDecrement || 0.5;
  const currentLowest = rfq?.lowestBid != null ? rfq.lowestBid : rfq?.ceilingPrice;

  useEffect(() => {
    if (rfq?.bids && rfq.bids.length > 0) {
      setHistory(
        rfq.bids.map((b) => ({
          time: b.timestamp ? new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          amount: typeof b.amount === 'number' ? b.amount.toFixed(2) : String(b.amount),
          supplierName: b.supplierName,
        }))
      );
    } else {
      setHistory([]);
    }
  }, [rfq]);

  const handlePlaceBid = async () => {
    const num = parseFloat(bidAmount);
    if (isNaN(num) || num <= 0) {
      showCustomAlert('Invalid Bid', 'Please enter a valid numeric bid amount.');
      return;
    }

    if (currentLowest != null && num > currentLowest - minStep) {
      showCustomAlert(
        'Bid Too High',
        `Your bid must be at least ₹${minStep.toFixed(2)} lower than the current lowest ask (max allowable bid: ₹${(currentLowest - minStep).toFixed(2)}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const newEntry = {
        time: 'Just now',
        amount: num.toFixed(2),
        supplierName: user?.name || 'You',
      };
      setHistory((prev) => [newEntry, ...prev]);
      setBidAmount('');
      showCustomAlert('Bid Transmitted', `Your competitive bid of ₹${num.toFixed(2)} / ${unit} has been placed on the floor.`, null, { type: 'success' });
    } catch (err) {
      showCustomAlert('Error', err.message || 'Failed to submit bid.', null, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!rfq) {
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
            <Text style={[styles.kicker, { color: theme.brass }]} numberOfLines={1}>
              SUPPLIER · {(user?.companyName || user?.name || 'VERIFIED BIDDER').toUpperCase()}
            </Text>
            <Text style={[styles.heading, { color: theme.ink }]} numberOfLines={1}>
              Live Auctions
            </Text>
          </View>
        </View>

        <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.line, marginTop: 40 }]}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>🏷️</Text>
          <Text style={[styles.emptyTitle, { color: theme.ink }]}>No active auctions available</Text>
          <Text style={[styles.emptyDesc, { color: theme.inkDim }]}>
            There are currently no active commodity RFQs on the floor. When a buyer posts a requirement, it will appear here for you to bid on.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.backRow}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
          onPress={onBack}
        >
          <Text style={{ color: theme.ink, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: theme.brass }]} numberOfLines={1}>
            SUPPLIER · {(user?.companyName || user?.name || 'VERIFIED BIDDER').toUpperCase()}
          </Text>
          <Text style={[styles.heading, { color: theme.ink }]} numberOfLines={1}>
            {rfq?.commodity || 'Active Commodity Auction'}
          </Text>
        </View>
      </View>

      <Text style={[styles.subText, { color: theme.inkDim }]}>
        Requested by {rfq?.buyerName || 'Verified Buyer'} · {(rfq?.quantity || 0).toLocaleString()} {unit} · ex-works {rfq?.location || 'India'}
      </Text>

      {/* Live Status Bar */}
      <View style={[styles.liveBar, { backgroundColor: theme.surface, borderColor: theme.rust }]}>
        <View style={styles.liveLeft}>
          <View style={[styles.liveDot, { backgroundColor: theme.rust }]} />
          <Text style={[styles.liveRank, { color: theme.inkDim }]}>
            {history.length > 0 ? `Standing: ${history.length} active bid${history.length > 1 ? 's' : ''}` : 'Auction Open'}
          </Text>
        </View>
        <Text style={[styles.timer, { color: theme.rust }]}>
          {rfq?.status === 'CLOSED' ? 'CLOSED' : 'LIVE'}
        </Text>
      </View>

      {/* Hero: Lowest Bid Card */}
      <View style={[styles.card, styles.centerCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.cardSub, { color: theme.inkDim }]}>
          {currentLowest != null ? 'LOWEST BID TO BEAT' : 'STARTING CEILING PRICE'}
        </Text>
        <View style={styles.bigNumRow}>
          <Text style={[styles.bigNum, { color: theme.brass }]}>
            {currentLowest != null ? `₹${Number(currentLowest).toFixed(2)}` : '—'}
          </Text>
          <Text style={[styles.unitText, { color: theme.inkDim }]}> /{unit}</Text>
        </View>
        <Text style={[styles.niceText, { color: theme.inkDim }]}>
          {history.length > 0 ? 'Lowest submitted floor ask' : 'Ceiling starting ask'}
        </Text>
      </View>

      {/* Place Bid Input Form */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.label, { color: theme.inkDim }]}>
          Your next bid (₹ / {unit}) · min. step ₹{minStep.toFixed(2)}
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
          <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>
            {submitting ? 'Placing bid...' : 'Place bid'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bid History section header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: theme.inkDim }]}>YOUR BID HISTORY</Text>
        <View style={[styles.sectionLine, { backgroundColor: theme.line }]} />
      </View>

      {/* History Tiles or Empty State */}
      <FlatList
        data={history}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <HistoryTile item={item} index={index} theme={theme} />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={{ fontSize: 26, marginBottom: 6 }}>🏷️</Text>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>No bids submitted yet</Text>
            <Text style={[styles.emptyDesc, { color: theme.inkDim }]}>
              Enter a bid above to place your opening offer on this commodity auction.
            </Text>
          </View>
        }
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  backBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 10.5, fontWeight: 'bold', letterSpacing: 1 },
  heading: { fontSize: 19, fontWeight: '600' },
  subText: { fontSize: 13.5 },
  liveBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  liveLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveRank: { fontSize: 12 },
  timer: { fontSize: 18, fontWeight: 'bold' },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  centerCard: { alignItems: 'center' },
  cardSub: { fontSize: 11 },
  bigNumRow: { flexDirection: 'row', alignItems: 'baseline' },
  bigNum: { fontSize: 34, fontWeight: '600' },
  unitText: { fontSize: 15 },
  niceText: { fontSize: 12 },
  label: { fontSize: 12 },
  input: { padding: 11, borderRadius: 9, borderWidth: 1, fontSize: 14 },
  primaryBtn: { padding: 14, borderRadius: 11, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { fontSize: 14.5, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  sectionLine: { flex: 1, height: 1 },
  emptyBox: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginVertical: 6 },
  emptyTitle: { fontSize: 14.5, fontWeight: '700', marginBottom: 4 },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
});
