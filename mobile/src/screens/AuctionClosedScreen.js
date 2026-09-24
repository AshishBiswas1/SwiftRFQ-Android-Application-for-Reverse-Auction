import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, FlatList } from 'react-native';
import { darkPalette } from '../theme/tokens';

export default function AuctionClosedScreen({ rfq, onBack, theme = darkPalette }) {
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 45, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const unit = rfq?.unit || 'L';
  const rawBids = rfq?.bids || [];
  const sortedBids = [...rawBids].sort((a, b) => Number(a.amount) - Number(b.amount));
  const winner = sortedBids.length > 0 ? sortedBids[0] : null;

  const ceiling = rfq?.ceilingPrice ? Number(rfq.ceilingPrice) : (winner ? Number(winner.amount) : 0);
  const winnerAmount = winner ? Number(winner.amount) : 0;
  const savingsPerUnit = ceiling > winnerAmount ? ceiling - winnerAmount : 0;
  const savingsPercent = ceiling > 0 && savingsPerUnit > 0 ? ((savingsPerUnit / ceiling) * 100).toFixed(1) : '0.0';

  const standings = sortedBids.map((b, index) => ({
    rank: `${index + 1}. ${b.supplierName || 'Verified Supplier'}`,
    amount: `₹${Number(b.amount).toFixed(2)}`,
    isWinner: index === 0,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.winnerWrap}>
        {/* Animated Checkmark Circle */}
        <Animated.View style={[styles.checkCircle, { borderColor: theme.olive, opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={{ fontSize: 32, color: theme.olive }}>✓</Text>
        </Animated.View>

        <Text style={[styles.kicker, { color: theme.brass }]}>AUCTION CLOSED</Text>
        <Text style={[styles.heading, { color: theme.ink }]} numberOfLines={1}>
          {winner ? `${winner.supplierName} wins` : 'Auction Concluded'}
        </Text>

        <View style={styles.bigNumRow}>
          <Text style={[styles.bigNum, { color: theme.olive }]}>
            {winner ? `₹${winnerAmount.toFixed(2)}` : '—'}
          </Text>
          <Text style={[styles.unitText, { color: theme.inkDim }]}> /{unit}</Text>
        </View>

        <Text style={[styles.subText, { color: theme.inkDim }]}>
          {winner
            ? `${(rfq?.quantity || 0).toLocaleString()} ${unit} ${rfq?.commodity || 'Commodity'} · ₹${savingsPerUnit.toFixed(2)}/${unit} (${savingsPercent}%) below ceiling ask`
            : `${rfq?.commodity || 'Requirement'} closed without winning bids.`}
        </Text>
      </View>

      {/* Final Standings Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.standingsLabel, { color: theme.inkDim }]}>FINAL STANDINGS</Text>
        <FlatList
          data={standings}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bidRow,
                { borderColor: item.isWinner ? theme.olive : theme.line },
                item.isWinner && { backgroundColor: 'rgba(124, 139, 95, 0.09)' },
              ]}
            >
              <Text style={[styles.suppName, { color: theme.ink }]}>{item.rank}</Text>
              <Text style={[styles.bidAmt, { color: item.isWinner ? theme.olive : theme.inkDim }]}>
                {item.amount}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: theme.inkDim }}>No bids placed in this auction.</Text>
            </View>
          }
        />
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.brass }]} onPress={onBack}>
        <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>Back to requirements</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  winnerWrap: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 18,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  heading: {
    fontSize: 26,
    fontWeight: '600',
  },
  bigNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bigNum: {
    fontSize: 34,
    fontWeight: '600',
  },
  unitText: {
    fontSize: 15,
  },
  subText: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  standingsLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  bidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 6,
  },
  suppName: {
    fontSize: 14,
    fontWeight: '600',
  },
  bidAmt: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  primaryBtn: {
    padding: 14,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#1B1509',
    fontSize: 14.5,
    fontWeight: '600',
  },
});
