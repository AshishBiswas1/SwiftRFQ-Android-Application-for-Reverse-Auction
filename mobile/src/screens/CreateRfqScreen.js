import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { darkPalette } from '../theme/tokens';

export default function CreateRfqScreen({ onCreateRfq, onBack, theme = darkPalette }) {
  const [commodity, setCommodity] = useState('H2O2 50% Chemical Grade');
  const [quantity, setQuantity] = useState('15');
  const [unit, setUnit] = useState('Metric Tons');
  const [ceilingPrice, setCeilingPrice] = useState('48000');
  const [minDecrement, setMinDecrement] = useState('500');
  const [durationMinutes, setDurationMinutes] = useState('15');

  const handleSubmit = () => {
    if (!commodity || !quantity || !ceilingPrice || !minDecrement) {
      Alert.alert('Incomplete Form', 'Please fill in all commodity auction details.');
      return;
    }

    const rfqData = {
      commodity,
      quantity: Number(quantity),
      unit,
      ceilingPrice: Number(ceilingPrice),
      minDecrement: Number(minDecrement),
      durationMinutes: Number(durationMinutes),
    };

    onCreateRfq(rfqData);
  };

  return (
    <View style={styles.rootView}>
      <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
          onPress={onBack}
        >
          <Text style={{ color: theme.ink, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={[styles.kicker, { color: theme.brass }]}>NEW REVERSE AUCTION</Text>
          <Text style={[styles.heading, { color: theme.ink }]}>Create Requirement</Text>
        </View>
      </View>

      <Text style={[styles.subheading, { color: theme.inkDim }]}>
        Specify procurement constraints and starting ceiling price
      </Text>

      <Text style={[styles.label, { color: theme.inkDim }]}>COMMODITY NAME</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
        value={commodity}
        onChangeText={setCommodity}
        placeholderTextColor={theme.inkDim}
        placeholder="e.g. H2O2 50%"
      />

      <View style={styles.row}>
        <View style={styles.halfColumn}>
          <Text style={[styles.label, { color: theme.inkDim }]}>QUANTITY</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
            value={quantity}
            onChangeText={setQuantity}
            placeholderTextColor={theme.inkDim}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfColumn}>
          <Text style={[styles.label, { color: theme.inkDim }]}>UNIT</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
            value={unit}
            onChangeText={setUnit}
            placeholderTextColor={theme.inkDim}
          />
        </View>
      </View>

      <Text style={[styles.label, { color: theme.inkDim }]}>CEILING PRICE (STARTING MAX PRICE IN INR)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
        value={ceilingPrice}
        onChangeText={setCeilingPrice}
        placeholderTextColor={theme.inkDim}
        keyboardType="numeric"
      />

      <Text style={[styles.label, { color: theme.inkDim }]}>MINIMUM DECREMENT STEP (INR)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
        value={minDecrement}
        onChangeText={setMinDecrement}
        placeholderTextColor={theme.inkDim}
        keyboardType="numeric"
      />

      <Text style={[styles.label, { color: theme.inkDim }]}>AUCTION DURATION (MINUTES)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        placeholderTextColor={theme.inkDim}
        keyboardType="numeric"
      />

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.brass }]} activeOpacity={0.85} onPress={handleSubmit}>
        <Text style={[styles.submitBtnText, { color: theme.primaryText }]}>Launch Live Reverse Auction ⚡</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
  },
  subheading: {
    fontSize: 13,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfColumn: {
    width: '48%',
  },
  submitBtn: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
