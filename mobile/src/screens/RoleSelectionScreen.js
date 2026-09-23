import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { lightPalette } from '../theme/tokens';

export default function RoleSelectionScreen({ onSelectRole, theme = lightPalette }) {
  return (
    <View style={styles.container}>

      <Text style={[styles.title, { color: theme.ink }]}>SwiftRFQ</Text>
      <Text style={[styles.subtitle, { color: theme.inkDim }]}>
        B2B Reverse Auction Commodity Procurement Engine
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.roleButton, { backgroundColor: theme.surface, borderColor: theme.brass }]}
          onPress={() => onSelectRole('BUYER')}
        >
          <Text style={[styles.buttonTitle, { color: theme.ink }]}>Enter as Buyer</Text>
          <Text style={[styles.buttonDesc, { color: theme.inkDim }]}>
            Create RFQs, set ceiling prices, and monitor auctions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleButton, { backgroundColor: theme.surface, borderColor: theme.olive }]}
          onPress={() => onSelectRole('SUPPLIER')}
        >
          <Text style={[styles.buttonTitle, { color: theme.ink }]}>Enter as Supplier</Text>
          <Text style={[styles.buttonDesc, { color: theme.inkDim }]}>
            Browse requirements and submit competitive lower bids
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 16,
  },
  roleButton: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buttonDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
