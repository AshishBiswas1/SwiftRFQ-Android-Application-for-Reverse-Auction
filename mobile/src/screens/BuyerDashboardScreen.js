import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { darkPalette } from '../theme/tokens';

// ── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status, theme }) {
  const map = {
    LIVE:   { bg: 'rgba(140,68,38,0.12)',  border: theme.rust,   fg: theme.rust,   dot: true  },
    CLOSED: { bg: 'rgba(95,107,69,0.13)',  border: theme.olive,  fg: theme.olive,  dot: false },
    DRAFT:  { bg: 'rgba(110,99,82,0.10)',  border: theme.inkDim, fg: theme.inkDim, dot: false },
  };
  const s = map[status] || map.DRAFT;
  return (
    <View style={[pillSt.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
      {s.dot && <View style={[pillSt.dot, { backgroundColor: s.fg }]} />}
      <Text style={[pillSt.text, { color: s.fg }]}>{status}</Text>
    </View>
  );
}
const pillSt = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
});

// ── Requirement Tile ─────────────────────────────────────────────────────────
function RequirementTile({ name, meta, status, theme, onPress }) {
  const isLive = status === 'LIVE';
  const isClosed = status === 'CLOSED';
  const isDraft = status === 'DRAFT';

  const accentColor = isLive ? theme.rust : isClosed ? theme.olive : theme.inkDim;

  return (
    <TouchableOpacity
      activeOpacity={isDraft ? 1 : 0.75}
      onPress={!isDraft ? onPress : undefined}
      style={[
        tileSt.tile,
        {
          backgroundColor: isLive
            ? 'rgba(140,68,38,0.06)'
            : isClosed
            ? 'rgba(95,107,69,0.06)'
            : theme.surface,
          borderColor: isLive ? theme.rust : isClosed ? theme.olive : theme.line,
        },
      ]}
    >
      {/* Left accent stripe */}
      <View style={[tileSt.stripe, { backgroundColor: accentColor }]} />

      {/* Main content */}
      <View style={tileSt.body}>
        <View style={tileSt.topRow}>
          <Text style={[tileSt.name, { color: theme.ink }]} numberOfLines={1}>
            {name}
          </Text>
          <StatusPill status={status} theme={theme} />
        </View>
        <Text style={[tileSt.meta, { color: theme.inkDim }]}>{meta}</Text>

        {/* Bottom row: progress indicator for live */}
        {isLive && (
          <View style={tileSt.liveFooter}>
            <View style={[tileSt.liveDot, { backgroundColor: theme.rust }]} />
            <Text style={[tileSt.liveLabel, { color: theme.rust }]}>Auction in progress</Text>
          </View>
        )}
        {isClosed && (
          <Text style={[tileSt.closedLabel, { color: theme.olive }]}>Tap to view results →</Text>
        )}
      </View>

      {/* Arrow for tappable items */}
      {!isDraft && (
        <Text style={[tileSt.arrow, { color: accentColor }]}>›</Text>
      )}
    </TouchableOpacity>
  );
}

const tileSt = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 14,
    marginBottom: 10,
    gap: 10,
    overflow: 'hidden',
  },
  stripe: { width: 4, alignSelf: 'stretch', borderRadius: 4, minHeight: 40 },
  body: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', flex: 1 },
  meta: { fontSize: 12 },
  liveFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveLabel: { fontSize: 10.5, fontWeight: '700' },
  closedLabel: { fontSize: 10.5, fontWeight: '600', marginTop: 4 },
  arrow: { fontSize: 24, fontWeight: '300', lineHeight: 28 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function BuyerDashboardScreen({
  rfqs,
  onCreateNew,
  onOpenLiveRoom,
  onOpenClosedRoom,
  onSelectTab,
  theme = darkPalette,
}) {
  const [filter, setFilter] = useState('ALL');

  const requirements = [
    { key: 'live',   status: 'LIVE',   name: 'Hydrogen Peroxide — 50%', meta: '18,000 L · closes in 03:41:12' },
    { key: 'closed', status: 'CLOSED', name: 'Caustic Soda Lye',        meta: '12,000 kg · 6 suppliers bid'  },
    { key: 'draft',  status: 'DRAFT',  name: 'Sodium Hypochlorite',     meta: 'not yet launched'              },
  ];

  const visible = requirements.filter(r =>
    filter === 'ALL' || r.status === filter
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.kicker, { color: theme.brass }]}>BUYER DASHBOARD</Text>
          <Text style={[styles.heading, { color: theme.ink }]}>Requirements</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { num: rfqs.length, label: 'ACTIVE' },
            { num: '4.2%',      label: 'AVG SAVED' },
            { num: '11',        label: 'SUPPLIERS' },
          ].map(s => (
            <View key={s.label} style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <Text style={[styles.statNum, { color: theme.brass }]}>{s.num}</Text>
              <Text style={[styles.statLabel, { color: theme.inkDim }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Avatar Strip */}
        <View style={styles.avatarStrip}>
          {[
            { initials: 'AC', bg: theme.brass },
            { initials: 'VI', bg: theme.rust },
            { initials: 'KO', bg: theme.olive },
            { initials: '+8', bg: theme.surface2, muted: true },
          ].map((a, i) => (
            <View key={i} style={[styles.avatar, { backgroundColor: a.bg }]}>
              <Text style={[styles.avatarText, a.muted ? { color: theme.inkDim } : { color: theme.primaryText }]}>
                {a.initials}
              </Text>
            </View>
          ))}
          <Text style={[styles.avatarDesc, { color: theme.inkDim }]}>
            bidding across your open requirements
          </Text>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {[
            { key: 'ALL',    label: 'All (3)' },
            { key: 'LIVE',   label: 'Live (1)' },
            { key: 'CLOSED', label: 'Closed (1)' },
            { key: 'DRAFT',  label: 'Draft (1)' },
          ].map(chip => {
            const isSel = filter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[
                  styles.chip,
                  { backgroundColor: isSel ? theme.brass : theme.surface, borderColor: isSel ? theme.brass : theme.line },
                ]}
                onPress={() => setFilter(chip.key)}
              >
                <Text style={[styles.chipText, { color: isSel ? theme.primaryText : theme.inkDim }, isSel && { fontWeight: '700' }]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section divider */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: theme.inkDim }]}>YOUR REQUIREMENTS</Text>
          <View style={[styles.sectionLine, { backgroundColor: theme.line }]} />
        </View>

        {/* Requirement Tiles */}
        {visible.map(r => (
          <RequirementTile
            key={r.key}
            name={r.name}
            meta={r.meta}
            status={r.status}
            theme={theme}
            onPress={
              r.status === 'LIVE'
                ? () => onOpenLiveRoom(rfqs[0] || { id: 'RFQ-8821', commodity: r.name })
                : r.status === 'CLOSED'
                ? () => onOpenClosedRoom(rfqs[0])
                : undefined
            }
          />
        ))}

        {/* New requirement CTA */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.brass }]}
          onPress={onCreateNew}
        >
          <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>+ New requirement</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentArea: { padding: 16, gap: 12, paddingBottom: 24 },
  headerRow: { marginTop: 6 },
  kicker: { fontSize: 10.5, fontWeight: 'bold', letterSpacing: 1 },
  heading: { fontSize: 22, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 9.5, marginTop: 2, letterSpacing: 0.5 },
  avatarStrip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: 'bold' },
  avatarDesc: { fontSize: 11, marginLeft: 4, flex: 1 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 11.5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  sectionLine: { flex: 1, height: 1 },
  primaryBtn: { padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { fontSize: 14.5, fontWeight: '700' },
});
