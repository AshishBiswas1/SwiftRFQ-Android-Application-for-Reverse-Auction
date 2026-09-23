import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { darkPalette } from '../theme/tokens';

export default function OnboardingScreen({ onSelectRole, theme = darkPalette }) {
  const [selectedRole, setSelectedRole] = useState('buyer');

  const handleContinue = () => {
    onSelectRole(selectedRole === 'supplier' ? 'SUPPLIER' : 'BUYER');
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.inkDim }]}>I'll be using SourceFloor as a —</Text>

      {/* Role Picker Buttons */}
      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[
            styles.roleIcon,
            { backgroundColor: theme.surface, borderColor: selectedRole === 'buyer' ? theme.brass : theme.line },
          ]}
          onPress={() => setSelectedRole('buyer')}
        >
          <Text style={styles.roleSymbol}>📦</Text>
          <Text style={[styles.roleText, { color: selectedRole === 'buyer' ? theme.brass : theme.inkDim }]}>
            Buyer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleIcon,
            { backgroundColor: theme.surface, borderColor: selectedRole === 'supplier' ? theme.brass : theme.line },
          ]}
          onPress={() => setSelectedRole('supplier')}
        >
          <Text style={styles.roleSymbol}>🏷️</Text>
          <Text style={[styles.roleText, { color: selectedRole === 'supplier' ? theme.brass : theme.inkDim }]}>
            Supplier
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.brandRow}>
        <Text style={[styles.brandMark, { color: theme.brass }]}>▲</Text>
        <Text style={[styles.brandTitle, { color: theme.ink }]}>Welcome to SourceFloor</Text>
      </View>
      <Text style={[styles.subTitle, { color: theme.inkDim }]}>A quick look before you get started:</Text>

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
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  roleIcon: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  roleSymbol: {
    fontSize: 22,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
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
