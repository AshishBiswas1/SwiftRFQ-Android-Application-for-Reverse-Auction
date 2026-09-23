import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { darkPalette } from '../theme/tokens';

// ── Initials Avatar ──────────────────────────────────────────────────────────
function Avatar({ name, size = 38, bg, fg }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: fg, fontSize: size * 0.36, fontWeight: '700', letterSpacing: 0.5 }}>{initials}</Text>
    </View>
  );
}

// ── Rank Badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank, theme }) {
  const medals = { 1: { bg: theme.olive, fg: theme.primaryText }, 2: { bg: theme.rust, fg: theme.primaryText }, 3: { bg: theme.brass, fg: theme.primaryText } };
  const s = medals[rank] || { bg: theme.surface2, fg: theme.inkDim };
  return (
    <View style={[rankSt.badge, { backgroundColor: s.bg }]}>
      <Text style={[rankSt.text, { color: s.fg }]}>#{rank}</Text>
    </View>
  );
}
const rankSt = StyleSheet.create({
  badge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
});

// ── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ label, theme }) {
  const map = {
    LOWEST:    { bg: 'rgba(95,107,69,0.15)',   border: theme.olive,   fg: theme.olive },
    OUTBID:    { bg: 'rgba(140,68,38,0.12)',   border: theme.rust,    fg: theme.rust },
    WITHDRAWN: { bg: 'rgba(110,99,82,0.12)',   border: theme.inkDim,  fg: theme.inkDim },
  };
  const s = map[label] || map.OUTBID;
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

// ── Delta Chip ───────────────────────────────────────────────────────────────
function DeltaChip({ delta, theme }) {
  if (delta == null) return null;
  const isDown = delta < 0;
  return (
    <Text style={{ color: isDown ? theme.olive : theme.rust, fontSize: 10, fontWeight: '700' }}>
      {isDown ? '↓' : '↑'} ₹{Math.abs(delta).toFixed(2)}
    </Text>
  );
}

// ── Bid Tile ─────────────────────────────────────────────────────────────────
function BidTile({ item, rank, theme, onPress }) {
  const isWinner = rank === 1;
  return (
    <TouchableOpacity
      activeOpacity={0.72}
      onPress={() => onPress && onPress(item)}
      style={[
        tileSt.tile,
        { backgroundColor: isWinner ? 'rgba(95,107,69,0.08)' : theme.surface, borderColor: isWinner ? theme.olive : theme.line },
      ]}
    >
      {/* Winner stripe */}
      {isWinner && <View style={[tileSt.stripe, { backgroundColor: theme.olive }]} />}

      {/* Left: rank + avatar */}
      <View style={tileSt.left}>
        <RankBadge rank={rank} theme={theme} />
        <Avatar name={item.supplierName} size={40}
          bg={isWinner ? theme.olive : theme.surface2}
          fg={isWinner ? theme.primaryText : theme.inkDim} />
      </View>

      {/* Centre: name + meta */}
      <View style={tileSt.centre}>
        <Text style={[tileSt.name, { color: theme.ink }]} numberOfLines={1}>{item.supplierName}</Text>
        <View style={tileSt.metaRow}>
          <StatusPill label={item.status} theme={theme} />
          <Text style={[tileSt.ts, { color: theme.inkDim }]}>{item.ts}</Text>
        </View>
      </View>

      {/* Right: amount + delta */}
      <View style={tileSt.right}>
        <Text style={[tileSt.amount, { color: isWinner ? theme.olive : theme.ink }]}>₹{item.amount}</Text>
        <Text style={[tileSt.unit, { color: theme.inkDim }]}>/L</Text>
        <DeltaChip delta={item.delta} theme={theme} />
      </View>
    </TouchableOpacity>
  );
}
const tileSt = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1.2, paddingVertical: 11, paddingHorizontal: 13, marginBottom: 8, overflow: 'hidden' },
  left: { gap: 6, alignItems: 'center' },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  centre: { flex: 1, gap: 4 },
  name: { fontSize: 13.5, fontWeight: '700', letterSpacing: 0.1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ts: { fontSize: 10 },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 17, fontWeight: '800' },
  unit: { fontSize: 10, marginTop: -2 },
});

export default function LiveAuctionRoomScreen({ rfq, onExit, onShowWinner, theme = darkPalette }) {
  const [bids, setBids] = useState([
    { supplierName: 'Anveshan Chem',      amount: '36.40', status: 'LOWEST',  ts: '6 min ago',  delta: -0.50 },
    { supplierName: 'Vardhan Industries', amount: '36.90', status: 'OUTBID',  ts: '9 min ago',  delta: -0.60 },
    { supplierName: 'Kailash Oxides',     amount: '37.50', status: 'OUTBID',  ts: '12 min ago', delta: null  },
    { supplierName: 'Om Sai Chemicals',   amount: '38.20', status: 'OUTBID',  ts: '15 min ago', delta: null  },
  ]);
  const [selected, setSelected] = useState(null);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.backRow}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.line }]} onPress={onExit}>
          <Text style={{ color: theme.ink, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={[styles.kicker, { color: theme.brass }]}>LIVE AUCTION</Text>
          <Text style={[styles.heading, { color: theme.ink }]}>Hydrogen Peroxide — 50%</Text>
        </View>
      </View>

      <Text style={[styles.subText, { color: theme.inkDim }]}>
        18,000 L · ex-works Vapi · min. decrement ₹0.50/L
      </Text>

      {/* Live Status Bar */}
      <View style={[styles.liveBar, { backgroundColor: theme.surface, borderColor: theme.rust }]}>
        <View style={styles.liveLeft}>
          <View style={[styles.liveDot, { backgroundColor: theme.rust }]} />
          <Text style={[styles.liveText, { color: theme.inkDim }]}>4 suppliers bidding</Text>
        </View>
        <Text style={[styles.timer, { color: theme.rust }]}>03:41:12</Text>
      </View>

      {/* Lowest Bid Card */}
      <View style={[styles.card, styles.centerCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.cardSub, { color: theme.inkDim }]}>CURRENT LOWEST BID</Text>
        <View style={styles.bigNumRow}>
          <Text style={[styles.bigNum, { color: theme.brass }]}>₹36.40</Text>
          <Text style={[styles.unitText, { color: theme.inkDim }]}> /L</Text>
        </View>
        <Text style={[styles.supplierNameText, { color: theme.olive }]}>Anveshan Chem</Text>
        <View style={[styles.progressBar, { backgroundColor: theme.surface2 }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.olive, width: '74%' }]} />
        </View>
        <Text style={[styles.progressLabel, { color: theme.inkDim }]}>74% of the way to your reserve price</Text>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: theme.inkDim }]}>LIVE STANDINGS</Text>
        <View style={[styles.sectionLine, { backgroundColor: theme.line }]} />
      </View>

      {/* Bid Tiles */}
      <FlatList
        data={bids}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <BidTile
            item={item}
            rank={index + 1}
            theme={theme}
            onPress={b => setSelected(selected === b.supplierName ? null : b.supplierName)}
          />
        )}
        scrollEnabled={false}
      />

      <TouchableOpacity
        style={[styles.ghostBtn, { borderColor: theme.rust, backgroundColor: 'rgba(140,68,38,0.07)' }]}
        onPress={onShowWinner}
      >
        <Text style={[styles.ghostBtnText, { color: theme.rust }]}>Close auction now</Text>
      </TouchableOpacity>
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
  liveBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  liveLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 12 },
  timer: { fontSize: 20, fontWeight: 'bold' },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 4 },
  centerCard: { alignItems: 'center' },
  cardSub: { fontSize: 11 },
  bigNumRow: { flexDirection: 'row', alignItems: 'baseline' },
  bigNum: { fontSize: 34, fontWeight: '600' },
  unitText: { fontSize: 15 },
  supplierNameText: { fontSize: 12, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 4, width: '100%', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 10, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  sectionLine: { flex: 1, height: 1 },
  ghostBtn: { borderWidth: 1.2, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  ghostBtnText: { fontSize: 14.5, fontWeight: '700' },
});


