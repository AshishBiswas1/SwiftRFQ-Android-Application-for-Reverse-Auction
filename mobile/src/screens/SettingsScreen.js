import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { lightPalette } from '../theme/tokens';

export default function SettingsScreen({ onBack, theme = lightPalette, onToggleTheme }) {
  const isDark = theme.mode === 'dark';

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
        <View>
          <Text style={[styles.kicker, { color: theme.brass }]}>PREFERENCES</Text>
          <Text style={[styles.heading, { color: theme.ink }]}>App Settings</Text>
        </View>
      </View>

      <Text style={[styles.subText, { color: theme.inkDim }]}>
        Manage display theme, notifications, and application preferences
      </Text>

      {/* Theme Changer Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <View style={styles.cardHeader}>
          <View style={styles.themeInfo}>
            <Text style={[styles.cardTitle, { color: theme.ink }]}>Appearance Theme</Text>
            <Text style={[styles.cardMeta, { color: theme.inkDim }]}>
              Current: {isDark ? '🌙 Dark Mode' : '☀️ Light Mode (Default)'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={onToggleTheme}
            trackColor={{ false: theme.line, true: theme.brass }}
            thumbColor={isDark ? theme.brass : theme.surface2}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.line }]} />

        <TouchableOpacity style={[styles.themeToggleBtn, { backgroundColor: theme.surface2 }]} onPress={onToggleTheme}>
          <Text style={[styles.themeToggleBtnText, { color: theme.ink }]}>
            {isDark ? '☀️ Switch to Light Mode (Default)' : '🌙 Switch to Dark Mode'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.noteText, { color: theme.inkDim }]}>
          💡 First-time users start in Light Mode. If you switch to Dark Mode, your preference is saved and persisted across app restarts.
        </Text>
      </View>

      {/* Notifications & Regional Settings */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.cardTitle, { color: theme.ink }]}>Reverse Auction Alerts</Text>
        <View style={styles.row}>
          <Text style={[styles.rowText, { color: theme.ink }]}>Real-time Price Drop Push Notifications</Text>
          <Switch value={true} trackColor={{ false: theme.line, true: theme.brass }} thumbColor={theme.brass} />
        </View>
      </View>

      {/* About & Version */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.cardTitle, { color: theme.ink }]}>About SwiftRFQ</Text>
        <Text style={[styles.cardMeta, { color: theme.inkDim }]}>Version 1.0.0 (Expo React Native Build)</Text>
        <Text style={[styles.cardMeta, { color: theme.inkDim }]}>Commodity Procurement Engine</Text>
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.brass }]} onPress={onBack}>
        <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>Save & Return</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 14,
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
  kicker: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
  },
  subText: {
    fontSize: 13,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  themeToggleBtn: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  themeToggleBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowText: {
    fontSize: 13,
    flex: 1,
  },
  primaryBtn: {
    padding: 14,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 'auto',
  },
  primaryBtnText: {
    color: '#1B1509',
    fontSize: 14.5,
    fontWeight: '600',
  },
});
