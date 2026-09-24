import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { darkPalette } from '../theme/tokens';
import api from '../services/api';

export default function OnboardingScreen({ onSelectRole, theme = darkPalette, user }) {
  const userRole = user?.role || 'SUPPLIER';
  const isSupplier = userRole === 'SUPPLIER';

  const handleContinue = () => {
    onSelectRole(userRole);
  };

  return (
    <View style={styles.container}>
      {/* Permanent Account Role Confirmation Banner */}
      <View style={[styles.roleBadgeCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <View style={styles.roleBadgeInfo}>
          <Text style={styles.roleSymbol}>{isSupplier ? '🏷️' : '📦'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.roleLabelText, { color: theme.brass }]}>ROLE (SET BY SIGNUP TYPE)</Text>
            <Text style={[styles.roleValueText, { color: theme.ink }]}>
              {isSupplier ? 'Verified Supplier' : 'Verified Buyer'}
            </Text>
          </View>
        </View>
        <View style={[styles.lockedPill, { backgroundColor: theme.surface2 }]}>
          <Text style={[styles.lockedPillText, { color: theme.inkDim }]}>🔒 Permanent</Text>
        </View>
      </View>

      <View style={styles.brandRow}>
        <Text style={[styles.brandMark, { color: theme.brass }]}>▲</Text>
        <Text style={[styles.brandTitle, { color: theme.ink }]}>Welcome to SourceFloor</Text>
      </View>
      <Text style={[styles.subTitle, { color: theme.inkDim }]}>
        Role is permanently locked based on your {isSupplier ? 'Supplier' : 'Buyer'} signup type:
      </Text>

      {/* Breakdown Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <View style={styles.introRow}>
          <View style={[styles.introDot, { backgroundColor: theme.surface2 }]}>
            <Text style={{ color: theme.brass, fontWeight: 'bold' }}>1</Text>
          </View>
          <View style={styles.introTextCol}>
            <Text style={[styles.introHeadline, { color: theme.ink }]}>Post a requirement.</Text>
            <Text style={[styles.introMeta, { color: theme.inkDim }]}>
              Commodity, quantity, grade, delivery terms — set once, in minutes.
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.line }]} />

        <View style={styles.introRow}>
          <View style={[styles.introDot, { backgroundColor: theme.surface2 }]}>
            <Text style={{ color: theme.brass, fontWeight: 'bold' }}>2</Text>
          </View>
          <View style={styles.introTextCol}>
            <Text style={[styles.introHeadline, { color: theme.ink }]}>Suppliers bid live.</Text>
            <Text style={[styles.introMeta, { color: theme.inkDim }]}>
              Timed reverse auction, minimum decrement, everyone sees the floor.
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.line }]} />

        <View style={styles.introRow}>
          <View style={[styles.introDot, { backgroundColor: theme.surface2 }]}>
            <Text style={{ color: theme.brass, fontWeight: 'bold' }}>3</Text>
          </View>
          <View style={styles.introTextCol}>
            <Text style={[styles.introHeadline, { color: theme.ink }]}>Lowest qualifying bid wins.</Text>
            <Text style={[styles.introMeta, { color: theme.inkDim }]}>
              Clear winner, full record — no more chasing a WhatsApp thread.
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: theme.brass }]}
        onPress={handleContinue}
      >
        <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>Continue</Text>
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
  label: {
    fontSize: 11.5,
    marginTop: 10,
  },
  roleBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  roleBadgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  roleLabelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  roleValueText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  lockedPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lockedPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleSymbol: {
    fontSize: 26,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  brandMark: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  subTitle: {
    fontSize: 13.5,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  introRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  introDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTextCol: {
    flex: 1,
  },
  introHeadline: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  introMeta: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
  },
  primaryBtn: {
    padding: 14,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnText: {
    color: '#1B1509',
    fontSize: 14.5,
    fontWeight: '600',
  },
});
