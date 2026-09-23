import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { lightPalette } from '../theme/tokens';

export default function BidCard({ supplierName, amount, timestamp, isLowest, theme = lightPalette }) {
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: isLowest ? theme.successSoft : theme.surfaceCard,
          borderColor: isLowest ? theme.success : theme.surfaceBorder,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.supplierBadge}>
          <Text style={styles.supplierIcon}>🏢</Text>
          <Text style={[styles.supplierText, { color: theme.textPrimary }]}>{supplierName || 'Anonymous Supplier'}</Text>
        </View>
        {isLowest && (
          <View style={[styles.lowestBadge, { backgroundColor: theme.success }]}>
            <Text style={styles.lowestBadgeText}>LOWEST BID</Text>
          </View>
        )}
      </View>

      <View style={styles.priceRow}>
        <Text style={[styles.amountText, { color: isLowest ? theme.success : theme.textPrimary }]}>
          INR {amount.toLocaleString()}
        </Text>
        <Text style={[styles.timeText, { color: theme.textMuted }]}>
          {new Date(timestamp).toLocaleTimeString()}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    marginVertical: 5,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  supplierText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lowestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lowestBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
  },
});
