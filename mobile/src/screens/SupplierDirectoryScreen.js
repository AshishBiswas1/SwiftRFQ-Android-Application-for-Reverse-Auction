import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { darkPalette } from '../theme/tokens';

// ── Supplier Initials Avatar ─────────────────────────────────────────────────
function Avatar({ name, size = 44, bg, fg }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: fg, fontSize: size * 0.35, fontWeight: '800', letterSpacing: 0.3 }}>{initials}</Text>
    </View>
  );
}

// ── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status, theme }) {
  const map = {
    VERIFIED: { bg: 'rgba(95,107,69,0.14)', border: theme.olive, fg: theme.olive },
    PENDING:  { bg: 'rgba(169,116,38,0.13)', border: theme.brass, fg: theme.brass },
  };
  const s = map[status] || map.PENDING;
  return (
    <View style={[pillSt.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[pillSt.text, { color: s.fg }]}>{status}</Text>
    </View>
  );
}
const pillSt = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
});

// ── Auction Won Badge ─────────────────────────────────────────────────────────
function WonBadge({ count, theme }) {
  if (count === 0) return <Text style={{ color: theme.inkDim, fontSize: 11 }}>No auctions yet</Text>;
  return (
    <View style={[wonSt.badge, { backgroundColor: 'rgba(169,116,38,0.12)', borderColor: theme.brass }]}>
      <Text style={[wonSt.text, { color: theme.brass }]}>🏆 {count} Won</Text>
    </View>
  );
}
const wonSt = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 10, fontWeight: '700' },
});

// ── Supplier Card Tile ────────────────────────────────────────────────────────
function SupplierTile({ item, isInvited, onToggle, theme }) {
  const isVerified = item.status === 'VERIFIED';
  const avatarColors = [
    { bg: theme.brass,   fg: theme.primaryText },
    { bg: theme.rust,    fg: theme.primaryText },
    { bg: theme.olive,   fg: theme.primaryText },
    { bg: theme.surface2, fg: theme.inkDim },
  ];
  const colorIndex = parseInt(item.id, 10) - 1;
  const color = avatarColors[colorIndex % avatarColors.length];

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[
        tileSt.tile,
        {
          backgroundColor: isInvited ? 'rgba(95,107,69,0.07)' : theme.surface,
          borderColor: isInvited ? theme.olive : theme.line,
        },
      ]}
    >
      {/* Invited left stripe */}
      {isInvited && <View style={[tileSt.stripe, { backgroundColor: theme.olive }]} />}

      {/* Top row: avatar + info + status */}
      <View style={tileSt.topRow}>
        <Avatar name={item.name} size={46} bg={color.bg} fg={color.fg} />
        <View style={tileSt.infoCol}>
          <Text style={[tileSt.name, { color: theme.ink }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[tileSt.location, { color: theme.inkDim }]} numberOfLines={1}>
            📍 {item.location}
          </Text>
          <View style={tileSt.metaRow}>
            <StatusPill status={item.status} theme={theme} />
            <WonBadge count={item.auctionsWon} theme={theme} />
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[tileSt.divider, { backgroundColor: theme.line }]} />

      {/* Invite button */}
      <TouchableOpacity
        style={[
          tileSt.inviteBtn,
          isInvited
            ? { backgroundColor: theme.olive, borderColor: theme.olive }
            : { backgroundColor: theme.surface2, borderColor: theme.line },
        ]}
        activeOpacity={0.8}
        onPress={() => onToggle(item.id)}
      >
        <Text style={[tileSt.inviteText, { color: isInvited ? theme.primaryText : theme.ink }]}>
          {isInvited ? '✓  Invited to RFQ' : '+  Invite to RFQ'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const tileSt = StyleSheet.create({
  tile: {
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 14,
    marginBottom: 10,
    gap: 10,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  topRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoCol: { flex: 1, gap: 5 },
  name: { fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
  location: { fontSize: 11.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  divider: { height: 1, marginHorizontal: -14 },
  inviteBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.2,
  },
  inviteText: { fontSize: 13.5, fontWeight: '700', letterSpacing: 0.2 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SupplierDirectoryScreen({ onBack, theme = darkPalette }) {
  const [search, setSearch] = useState('');
  const [invitedMap, setInvitedMap] = useState({});
  const [suppliers] = useState([
    { id: '1', name: 'Anveshan Chemicals',  location: 'Vapi, Gujarat',        auctionsWon: 14, status: 'VERIFIED', phone: '+91 98765 43210' },
    { id: '2', name: 'Vardhan Industries',  location: 'Ankleshwar, Gujarat',  auctionsWon: 6,  status: 'VERIFIED', phone: '+91 98765 12345' },
    { id: '3', name: 'Kailash Oxides',      location: 'Panipat, Haryana',     auctionsWon: 2,  status: 'VERIFIED', phone: '+91 98123 45678' },
    { id: '4', name: 'Om Sai Chemicals',    location: 'Thane, Maharashtra',   auctionsWon: 0,  status: 'PENDING',  phone: '+91 99887 76655' },
  ]);

  const toggleInvite = (id) => setInvitedMap(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = suppliers.filter(
    s => s.name.toLowerCase().includes(search.toLowerCase()) ||
         s.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
          onPress={onBack}
        >
          <Text style={{ color: theme.ink, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={[styles.kicker, { color: theme.brass }]}>VERIFIED SUPPLIER NETWORK</Text>
          <Text style={[styles.heading, { color: theme.ink }]}>Supplier Directory</Text>
        </View>
      </View>

      <Text style={[styles.subheading, { color: theme.inkDim }]}>
        Invite verified commodity sellers &amp; manufacturers
      </Text>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.searchIcon, { color: theme.inkDim }]}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: theme.ink }]}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={theme.inkDim}
          placeholder="Add supplier by name, phone, or GSTIN..."
        />
      </View>

      {/* Supplier Tiles */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <SupplierTile
            item={item}
            isInvited={!!invitedMap[item.id]}
            onToggle={toggleInvite}
            theme={theme}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  backBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTextCol: { flex: 1 },
  kicker: { fontSize: 10.5, fontWeight: 'bold', letterSpacing: 1 },
  heading: { fontSize: 20, fontWeight: '600' },
  subheading: { fontSize: 13, marginBottom: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 4 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 13 },
});
