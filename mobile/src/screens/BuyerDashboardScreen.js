import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { darkPalette } from '../theme/tokens';
import { showCustomAlert } from '../services/customAlert';
import { getMissingProfileFields } from '../services/profileValidation';

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
function RequirementTile({
  name,
  meta,
  status,
  theme,
  raw,
  onPress,
  onDelete,
  onCallWinner,
  onWhatsAppWinner,
}) {
  const isLive = status === 'LIVE';
  const isClosed = status === 'CLOSED';
  const isDraft = status === 'DRAFT';

  const accentColor = isLive ? theme.rust : isClosed ? theme.olive : theme.inkDim;

  // Determine winner for closed auctions
  const winner =
    raw?.winner ||
    (raw?.bids && raw.bids.length > 0
      ? [...raw.bids].sort((a, b) => Number(a.amount) - Number(b.amount))[0]
      : null);

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

        {/* Live indicator */}
        {isLive && (
          <View style={tileSt.liveFooter}>
            <View style={[tileSt.liveDot, { backgroundColor: theme.rust }]} />
            <Text style={[tileSt.liveLabel, { color: theme.rust }]}>Auction in progress</Text>
          </View>
        )}

        {/* Closed Auction Winner Information & Direct Action Buttons */}
        {isClosed && winner && (
          <View style={{ marginTop: 6, gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.olive }}>🏆 Winner:</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.ink }} numberOfLines={1}>
                {winner.supplierName} (₹{Number(winner.amount).toFixed(2)}/{raw?.unit || 'L'})
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 7, marginTop: 3 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#25D366',
                  paddingVertical: 5,
                  paddingHorizontal: 9,
                  borderRadius: 8,
                }}
                onPress={(e) => {
                  if (e && e.stopPropagation) e.stopPropagation();
                  onWhatsAppWinner && onWhatsAppWinner(raw, winner);
                }}
              >
                <Text style={{ fontSize: 11 }}>💬</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: theme.surface2,
                  borderColor: theme.line,
                  borderWidth: 1,
                  paddingVertical: 5,
                  paddingHorizontal: 9,
                  borderRadius: 8,
                }}
                onPress={(e) => {
                  if (e && e.stopPropagation) e.stopPropagation();
                  onCallWinner && onCallWinner(winner);
                }}
              >
                <Text style={{ fontSize: 11 }}>📞</Text>
                <Text style={{ color: theme.ink, fontSize: 11, fontWeight: '700' }}>Call</Text>
              </TouchableOpacity>

              <Text style={[tileSt.closedLabel, { color: theme.olive, alignSelf: 'center', marginLeft: 'auto' }]}>
                Results ›
              </Text>
            </View>
          </View>
        )}

        {isClosed && !winner && (
          <Text style={[tileSt.closedLabel, { color: theme.inkDim }]}>Closed with no bids →</Text>
        )}
      </View>

      {/* Right Action Buttons */}
      <View style={tileSt.rightActions}>
        {onDelete && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[tileSt.deleteBtn, { backgroundColor: 'rgba(180, 50, 50, 0.1)', borderColor: 'rgba(180, 50, 50, 0.3)' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={(e) => {
              if (e && e.stopPropagation) e.stopPropagation();
              onDelete();
            }}
          >
            <Text style={{ fontSize: 13 }}>🗑️</Text>
          </TouchableOpacity>
        )}
        {!isDraft && !isClosed && (
          <Text style={[tileSt.arrow, { color: accentColor }]}>›</Text>
        )}
      </View>
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
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteBtn: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 24, fontWeight: '300', lineHeight: 28 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function BuyerDashboardScreen({
  rfqs = [],
  onCreateNew,
  onOpenLiveRoom,
  onOpenClosedRoom,
  onDeleteRfq,
  onSelectTab,
  onNavigateProfile,
  theme = darkPalette,
  user,
}) {
  const [filter, setFilter] = useState('ALL');

  const handleCreateNew = () => {
    const missing = getMissingProfileFields(user);
    if (missing.length > 0) {
      showCustomAlert(
        'Profile Incomplete',
        `To launch a reverse auction session, please complete your profile details:\n• ${missing.join('\n• ')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete Profile',
            onPress: () => {
              if (onNavigateProfile) onNavigateProfile();
            },
          },
        ]
      );
      return;
    }
    if (onCreateNew) onCreateNew();
  };

  const liveCount = rfqs.filter((r) => r.status === 'LIVE').length;
  const closedCount = rfqs.filter((r) => r.status === 'CLOSED').length;
  const totalBids = rfqs.reduce((acc, curr) => acc + (curr.bids ? curr.bids.length : 0), 0);

  const visibleRfqs = rfqs.filter((r) => {
    if (filter === 'LIVE') return r.status === 'LIVE';
    if (filter === 'CLOSED') return r.status === 'CLOSED';
    return true;
  });

  const visible = visibleRfqs.map((r, i) => ({
    key: r.id || r._id || r.rfqId || String(i),
    raw: r,
    name: r.commodity || `Requirement #${i + 1}`,
    meta: `${(r.quantity || 0).toLocaleString()} ${r.unit || 'L'} · ${r.bids ? r.bids.length : 0} bids`,
    status: r.status || 'LIVE',
  }));

  const handleCallWinner = (winner) => {
    const phone = winner?.supplierPhone;
    const digits = (phone || '').replace(/[^0-9+]/g, '');
    if (!digits) {
      showCustomAlert(
        'Phone Not Available',
        `No direct mobile number was registered for ${winner?.supplierName || 'this supplier'}. You can contact them through the supplier directory.`
      );
      return;
    }
    Linking.openURL(`tel:${digits}`).catch(() => {
      showCustomAlert('Unable to Dial', `Could not initiate call to ${digits}.`);
    });
  };

  const handleWhatsAppWinner = (rfqItem, winner) => {
    const phone = winner?.supplierPhone;
    const digits = (phone || '').replace(/[^0-9]/g, '');
    const commodity = rfqItem?.commodity || 'Requirement';
    const unit = rfqItem?.unit || 'L';
    const qty = Number(rfqItem?.quantity) || 1;
    const amt = Number(winner?.amount) || 0;
    const total = (qty * amt).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const name = winner?.supplierName || 'Supplier';

    const message = `Hi ${name}, congratulations! You have won our SwiftRFQ reverse auction for ${qty.toLocaleString()} ${unit} of ${commodity} at ₹${amt.toFixed(2)}/${unit} (Total Order: ₹${total}).\n\nPlease confirm dispatch and delivery details.`;

    if (digits) {
      const appUrl = `whatsapp://send?phone=${digits}&text=${encodeURIComponent(message)}`;
      const webUrl = `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
      Linking.canOpenURL(appUrl)
        .then((supported) => {
          if (supported) return Linking.openURL(appUrl);
          return Linking.openURL(webUrl);
        })
        .catch(() => Linking.openURL(webUrl));
    } else {
      const shareUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      Linking.openURL(shareUrl).catch(() => {
        showCustomAlert('WhatsApp Not Available', 'Could not open WhatsApp on this device.');
      });
    }
  };

  const handleDelete = (r) => {
    const targetRfq = r.raw || r;
    const rfqId = targetRfq.id || targetRfq._id || targetRfq.rfqId;
    const commodityName = targetRfq.commodity || r.name;

    showCustomAlert(
      'Delete Requirement?',
      `Are you sure you want to permanently delete "${commodityName}"? This will remove the bidding session from your dashboard and the floor.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            if (onDeleteRfq) {
              onDeleteRfq(rfqId);
            }
          },
        },
      ],
      { type: 'warning' }
    );
  };

  const getInitial = () => {
    if (!user) return 'B';
    const name = user.name || user.companyName || '';
    return name.charAt(0).toUpperCase() || 'B';
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.kicker, { color: theme.brass }]}>BUYER DASHBOARD</Text>
          <Text style={[styles.heading, { color: theme.ink }]}>Requirements</Text>
        </View>

        {/* User Profile Badge Card */}
        {user && (
          <View style={[styles.userBadgeCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.brass }]}>
              <Text style={[styles.avatarInitial, { color: theme.primaryText }]}>{getInitial()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userNameText, { color: theme.ink }]}>{user.name || user.companyName}</Text>
              <Text style={[styles.userEmailText, { color: theme.inkDim }]}>{user.email || user.phone}</Text>
            </View>
            <View style={[styles.rolePill, { backgroundColor: 'rgba(217, 131, 36, 0.1)', borderColor: theme.brass }]}>
              <Text style={[styles.rolePillText, { color: theme.brass }]}>BUYER</Text>
            </View>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.statNum, { color: theme.rust }]}>{liveCount}</Text>
            <Text style={[styles.statLabel, { color: theme.inkDim }]}>ACTIVE</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.statNum, { color: theme.brass }]}>{totalBids}</Text>
            <Text style={[styles.statLabel, { color: theme.inkDim }]}>BIDS RECEIVED</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.statNum, { color: theme.olive }]}>{rfqs.length}</Text>
            <Text style={[styles.statLabel, { color: theme.inkDim }]}>TOTAL RFQS</Text>
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {[
            { key: 'ALL', label: `All (${rfqs.length})` },
            { key: 'LIVE', label: `Live (${liveCount})` },
            { key: 'CLOSED', label: `Closed (${closedCount})` },
          ].map((f) => {
            const isSel = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSel ? theme.brass : theme.surface,
                    borderColor: isSel ? theme.brass : theme.line,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSel ? theme.primaryText : theme.inkDim,
                      fontWeight: isSel ? '700' : '400',
                    },
                  ]}
                >
                  {f.label}
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

        {/* Requirement Tiles or Empty State */}
        {visible.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>No requirements found</Text>
            <Text style={[styles.emptyDesc, { color: theme.inkDim }]}>
              {filter === 'ALL'
                ? 'Launch your first live reverse auction to receive competitive bids from verified suppliers.'
                : `You currently have no ${filter.toLowerCase()} auction requirements.`}
            </Text>
          </View>
        ) : (
          visible.map((r) => (
            <RequirementTile
              key={r.key}
              name={r.name}
              meta={r.meta}
              status={r.status}
              theme={theme}
              raw={r.raw}
              onPress={
                r.status === 'LIVE'
                  ? () => onOpenLiveRoom(r.raw)
                  : r.status === 'CLOSED'
                  ? () => onOpenClosedRoom(r.raw)
                  : undefined
              }
              onDelete={() => handleDelete(r)}
              onCallWinner={handleCallWinner}
              onWhatsAppWinner={handleWhatsAppWinner}
            />
          ))
        )}

        {/* New requirement CTA */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.brass }]}
          onPress={handleCreateNew}
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
  userBadgeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 15, fontWeight: 'bold' },
  userNameText: { fontSize: 13, fontWeight: '700' },
  userEmailText: { fontSize: 11, marginTop: 1 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  rolePillText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
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
  emptyBox: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginVertical: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
