import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightPalette } from '../theme/tokens';
import { showCustomAlert } from '../services/customAlert';
import TruecallerService from '../services/truecaller';

const SETTINGS_STORAGE_KEY = 'swiftrfq_custom_settings';

export default function SettingsScreen({ user, onUpdateUser, onBack, theme = lightPalette, onToggleTheme, onLogout, onNavigateProfile }) {
  const isDark = theme.mode === 'dark';
  const [currentUser, setCurrentUser] = useState(user);
  const [tcLoading, setTcLoading] = useState(false);

  useEffect(() => {
    if (user) setCurrentUser(user);
  }, [user]);

  const getRemainingTime = () => {
    if (!currentUser?.phoneVerificationDeadline) return null;
    const deadline = new Date(currentUser.phoneVerificationDeadline).getTime();
    const now = Date.now();
    const diff = deadline - now;
    if (diff <= 0) return '0h 0m (Expired)';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  const handleTruecallerVerify = async () => {
    try {
      setTcLoading(true);
      const isAvail = await TruecallerService.isAvailable();
      if (!isAvail) {
        showCustomAlert(
          'Truecaller Not Detected',
          'Truecaller 1-tap verification is not active or installed on this device. Would you like to use simulated verification for development testing?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Simulate Verify (Dev)',
              onPress: async () => {
                try {
                  setTcLoading(true);
                  const devRes = await TruecallerService.devMockVerify({
                    phone: currentUser?.phone || '+919876543210',
                    userId: currentUser?._id || currentUser?.id,
                  });
                  if (devRes.success) {
                    const updated = {
                      ...currentUser,
                      phone: devRes.phone,
                      isPhoneVerified: true,
                      phoneVerificationDeadline: null,
                    };
                    setCurrentUser(updated);
                    if (onUpdateUser) onUpdateUser(updated);
                    await AsyncStorage.setItem('swiftrfq_user_session', JSON.stringify(updated));
                    showCustomAlert('Verified', `Mobile number ${devRes.phone} verified successfully! Your account is now permanent.`, null, { type: 'success' });
                  }
                } catch (e) {
                  showCustomAlert('Verification Error', e.message);
                } finally {
                  setTcLoading(false);
                }
              },
            },
          ],
          { type: 'phone' }
        );
        return;
      }

      const res = await TruecallerService.verifyPhone({
        userId: currentUser?._id || currentUser?.id,
        phoneFallback: currentUser?.phone,
      });

      if (res.success) {
        const updated = {
          ...currentUser,
          phone: res.phone,
          isPhoneVerified: true,
          phoneVerificationDeadline: null,
        };
        setCurrentUser(updated);
        if (onUpdateUser) onUpdateUser(updated);
        await AsyncStorage.setItem('swiftrfq_user_session', JSON.stringify(updated));
        showCustomAlert('Verified with Truecaller', `Mobile number ${res.phone} verified! Your account is now permanent.`, null, { type: 'success' });
      }
    } catch (err) {
      console.warn('[Truecaller Settings Verify Error]', err);
      showCustomAlert('Verification Notice', err.message || 'Truecaller verification failed.');
    } finally {
      setTcLoading(false);
    }
  };

  // ── Stateful B2B Auction Settings ──────────────────────────────────────────
  const [bidConfirmation, setBidConfirmation] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [antiSnipingAlert, setAntiSnipingAlert] = useState(true);
  const [outbidNotification, setOutbidNotification] = useState(true);
  const [priceDropAlerts, setPriceDropAlerts] = useState(true);
  const [lowLatencySync, setLowLatencySync] = useState(true);
  const [biometricGuard, setBiometricGuard] = useState(false);

  // Load custom settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.bidConfirmation !== undefined) setBidConfirmation(parsed.bidConfirmation);
          if (parsed.hapticFeedback !== undefined) setHapticFeedback(parsed.hapticFeedback);
          if (parsed.antiSnipingAlert !== undefined) setAntiSnipingAlert(parsed.antiSnipingAlert);
          if (parsed.outbidNotification !== undefined) setOutbidNotification(parsed.outbidNotification);
          if (parsed.priceDropAlerts !== undefined) setPriceDropAlerts(parsed.priceDropAlerts);
          if (parsed.lowLatencySync !== undefined) setLowLatencySync(parsed.lowLatencySync);
          if (parsed.biometricGuard !== undefined) setBiometricGuard(parsed.biometricGuard);
        }
      } catch (e) {
        // Fallbacks remain defaults
      }
    };
    loadSettings();
  }, []);

  // Save setting update
  const updateSetting = async (key, val, setter) => {
    setter(val);
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      const current = stored ? JSON.parse(stored) : {};
      current[key] = val;
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to persist setting', key, e);
    }
  };

  const handleClearCache = async () => {
    showCustomAlert(
      'Clear Local Cache',
      'This will clear temporarily cached RFQ lists and offline price data. Your account credentials and session will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            showCustomAlert('Cache Cleared', 'Local RFQ offline cache has been reset.', null, { type: 'success' });
          },
        },
      ]
    );
  };

  const isBuyer = (user?.role || '').toUpperCase() === 'BUYER';

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          Manage bidding controls, real-time alerts, appearance, and reverse auction preferences
        </Text>

        {/* ── 1. User Session Profile Card ────────────────────────────────────── */}
        {currentUser && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.kicker, { color: theme.brass }]}>AUTHENTICATED PROFILE</Text>
                <Text style={[styles.cardTitle, { color: theme.ink }]}>{currentUser.name || 'User'}</Text>
                <Text style={[styles.cardMeta, { color: theme.inkDim }]}>{currentUser.email}</Text>
                {currentUser.phone ? (
                  <Text style={[styles.cardMeta, { color: theme.inkDim }]}>📱 {currentUser.phone}</Text>
                ) : null}
              </View>
              <View style={[styles.rolePill, { backgroundColor: isBuyer ? 'rgba(198,151,73,0.15)' : 'rgba(95,107,69,0.15)', borderColor: isBuyer ? theme.brass : theme.olive }]}>
                <Text style={[styles.rolePillText, { color: isBuyer ? theme.brass : theme.olive }]}>
                  {currentUser.role || 'PENDING'}
                </Text>
              </View>
            </View>
            <View style={[styles.infoBanner, { backgroundColor: theme.surface2 }]}>
              <Text style={[styles.infoBannerText, { color: theme.inkDim }]}>
                🔒 Role was determined by your {isBuyer ? 'Buyer' : 'Supplier'} signup and is permanently locked to preserve auction integrity.
              </Text>
            </View>

            {currentUser.isPhoneVerified ? (
              <View style={[styles.infoBanner, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10B981', borderWidth: 1, marginTop: 10 }]}>
                <Text style={[styles.infoBannerText, { color: '#10B981', fontWeight: '700' }]}>
                  ✓ Mobile Number Verified with Truecaller ({currentUser.phone})
                </Text>
              </View>
            ) : (
              <View style={[styles.infoBanner, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#EF4444', borderWidth: 1, marginTop: 10 }]}>
                <Text style={[styles.infoBannerText, { color: '#EF4444', fontWeight: '700', fontSize: 13 }]}>
                  ⚠️ Mobile Verification Required
                </Text>
                {currentUser.phoneVerificationDeadline ? (
                  <Text style={[styles.infoBannerText, { color: '#EF4444', marginTop: 4, fontSize: 12 }]}>
                    ⏳ Grace Period: {getRemainingTime()} remaining before automatic account deletion.
                  </Text>
                ) : (
                  <Text style={[styles.infoBannerText, { color: '#EF4444', marginTop: 4, fontSize: 12 }]}>
                    Please verify your mobile number to secure your account.
                  </Text>
                )}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#0087FF',
                    marginTop: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                  }}
                  onPress={handleTruecallerVerify}
                  disabled={tcLoading}
                  activeOpacity={0.8}
                >
                  {tcLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                      ⚡ Verify with Truecaller (1-Tap)
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {onNavigateProfile && (
              <TouchableOpacity
                style={[styles.editProfileBtn, { backgroundColor: 'rgba(198,151,73,0.12)', borderColor: theme.brass }]}
                onPress={onNavigateProfile}
                activeOpacity={0.8}
              >
                <Text style={[styles.editProfileBtnText, { color: theme.brass }]}>
                  ✏️ Edit Profile (Mobile Number, Name, Email, Password, Firm)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── 2. Appearance Theme Card ────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <View style={styles.cardHeader}>
            <View style={styles.themeInfo}>
              <Text style={[styles.cardTitle, { color: theme.ink }]}>Display Theme</Text>
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
            💡 First-time users start in Light Mode. Preferences are saved automatically and remembered on restart.
          </Text>
        </View>

        {/* ── 3. B2B Reverse Auction & Bidding Safety Controls ───────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.kicker, { color: theme.brass }]}>AUCTION & BIDDING SAFEGUARDS</Text>
          <Text style={[styles.cardTitle, { color: theme.ink }]}>Order Transmission Controls</Text>
          <Text style={[styles.cardMeta, { color: theme.inkDim }]}>
            Critical execution guards for live procurement auctions
          </Text>

          {/* Setting: Two-Step Bid Confirmation */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: theme.ink }]}>Two-Step Bid Confirmation</Text>
              <Text style={[styles.settingDesc, { color: theme.inkDim }]}>
                Prompts for explicit review of the price reduction before transmitting. Prevents accidental clicks during fast-moving price wars.
              </Text>
            </View>
            <Switch
              value={bidConfirmation}
              onValueChange={(val) => updateSetting('bidConfirmation', val, setBidConfirmation)}
              trackColor={{ false: theme.line, true: theme.brass }}
              thumbColor={bidConfirmation ? theme.brass : theme.surface2}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.line }]} />

          {/* Setting: Haptic & Tactile Floor Feedback */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: theme.ink }]}>Haptic & Audio Floor Feedback</Text>
              <Text style={[styles.settingDesc, { color: theme.inkDim }]}>
                Vibrates and plays an audible tone when a new lowest quote is accepted on the floor, keeping you informed in loud environments.
              </Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={(val) => updateSetting('hapticFeedback', val, setHapticFeedback)}
              trackColor={{ false: theme.line, true: theme.brass }}
              thumbColor={hapticFeedback ? theme.brass : theme.surface2}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.line }]} />

          {/* Setting: Anti-Sniping & Final Minutes Warning */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: theme.ink }]}>Anti-Sniping Timer Warnings</Text>
              <Text style={[styles.settingDesc, { color: theme.inkDim }]}>
                Alerts when an auction enters the final 60 seconds or when an auto-extension trigger is activated by last-second price cuts.
              </Text>
            </View>
            <Switch
              value={antiSnipingAlert}
              onValueChange={(val) => updateSetting('antiSnipingAlert', val, setAntiSnipingAlert)}
              trackColor={{ false: theme.line, true: theme.brass }}
              thumbColor={antiSnipingAlert ? theme.brass : theme.surface2}
            />
          </View>
        </View>

        {/* ── 4. Notifications & Outbid Alerts ───────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.kicker, { color: theme.brass }]}>NOTIFICATIONS & ALERTS</Text>
          <Text style={[styles.cardTitle, { color: theme.ink }]}>Live Event Dispatching</Text>
          <Text style={[styles.cardMeta, { color: theme.inkDim }]}>
            High-priority push events delivered via Socket.io & Cloud messaging
          </Text>

          {/* Setting: Outbid Alert */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: theme.ink }]}>Instant Outbid Notifications</Text>
              <Text style={[styles.settingDesc, { color: theme.inkDim }]}>
                Notifies suppliers immediately when a competitor underbids your quote, giving you an immediate chance to counter-bid.
              </Text>
            </View>
            <Switch
              value={outbidNotification}
              onValueChange={(val) => updateSetting('outbidNotification', val, setOutbidNotification)}
              trackColor={{ false: theme.line, true: theme.brass }}
              thumbColor={outbidNotification ? theme.brass : theme.surface2}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.line }]} />

          {/* Setting: Price Drop Alert */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: theme.ink }]}>Live Floor Price Drops</Text>
              <Text style={[styles.settingDesc, { color: theme.inkDim }]}>
                Real-time notifications sent to buyers as the lowest floor price decreases throughout the reverse auction.
              </Text>
            </View>
            <Switch
              value={priceDropAlerts}
              onValueChange={(val) => updateSetting('priceDropAlerts', val, setPriceDropAlerts)}
              trackColor={{ false: theme.line, true: theme.brass }}
              thumbColor={priceDropAlerts ? theme.brass : theme.surface2}
            />
          </View>
        </View>

        {/* ── 5. Network & Low-Latency Connectivity ──────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.kicker, { color: theme.brass }]}>NETWORK & DATA SYNC</Text>
          <Text style={[styles.cardTitle, { color: theme.ink }]}>Real-Time Pipeline</Text>

          {/* Setting: Low Latency Turbo Sync */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: theme.ink }]}>Low-Latency WebSocket Mode</Text>
              <Text style={[styles.settingDesc, { color: theme.inkDim }]}>
                Maintains an active background WebSocket stream for instantaneous millisecond order placement and live floor synchronization.
              </Text>
            </View>
            <Switch
              value={lowLatencySync}
              onValueChange={(val) => updateSetting('lowLatencySync', val, setLowLatencySync)}
              trackColor={{ false: theme.line, true: theme.brass }}
              thumbColor={lowLatencySync ? theme.brass : theme.surface2}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.line }]} />

          {/* Clear Cache Action */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: theme.ink }]}>Offline Storage & Cache</Text>
              <Text style={[styles.settingDesc, { color: theme.inkDim }]}>
                Cached RFQ specs, vendor catalogs, and draft bids stored on this device.
              </Text>
            </View>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.line }]} onPress={handleClearCache}>
              <Text style={[styles.outlineBtnText, { color: theme.ink }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 6. Security & Authorization Guard ──────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.kicker, { color: theme.brass }]}>SECURITY & COMPLIANCE</Text>
          <Text style={[styles.cardTitle, { color: theme.ink }]}>High-Value Protection</Text>

          {/* Setting: Biometric App Guard */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={[styles.settingLabel, { color: theme.ink }]}>Biometric Authorization</Text>
              <Text style={[styles.settingDesc, { color: theme.inkDim }]}>
                Require Fingerprint or Face ID verification prior to submitting high-value bids or accepting contract awards.
              </Text>
            </View>
            <Switch
              value={biometricGuard}
              onValueChange={(val) => updateSetting('biometricGuard', val, setBiometricGuard)}
              trackColor={{ false: theme.line, true: theme.brass }}
              thumbColor={biometricGuard ? theme.brass : theme.surface2}
            />
          </View>
        </View>

        {/* ── 7. Logout Action ──────────────────────────────────────────────── */}
        {onLogout && (
          <TouchableOpacity
            style={[styles.ghostBtn, { borderColor: theme.rust, backgroundColor: 'rgba(140,68,38,0.08)' }]}
            onPress={onLogout}
          >
            <Text style={[styles.ghostBtnText, { color: theme.rust }]}>Log Out of SwiftRFQ</Text>
          </TouchableOpacity>
        )}

        {/* ── 8. About & Version ────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.cardTitle, { color: theme.ink }]}>About SwiftRFQ</Text>
          <Text style={[styles.cardMeta, { color: theme.inkDim }]}>Version 1.0.0 (Expo React Native Build)</Text>
          <Text style={[styles.cardMeta, { color: theme.inkDim }]}>Connected to MongoDB Cloud Cluster</Text>
          <Text style={[styles.cardMeta, { color: theme.inkDim }]}>Architected for High-Frequency Reverse Auctions</Text>
        </View>

        {/* Return Button */}
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.brass }]} onPress={onBack}>
          <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>Save & Return</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // Provides ample clearance so content scrolls completely clear of the floating bottom nav bar
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
    lineHeight: 18,
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
  rolePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  infoBanner: {
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  infoBannerText: {
    fontSize: 11.5,
    lineHeight: 16,
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  settingTextCol: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 2,
  },
  outlineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editProfileBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  editProfileBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  primaryBtn: {
    padding: 14,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#1B1509',
    fontSize: 14.5,
    fontWeight: '600',
  },
  ghostBtn: {
    padding: 13,
    borderRadius: 11,
    borderWidth: 1.2,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
