import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { lightPalette } from '../theme/tokens';
import api from '../services/api';
import { showCustomAlert } from '../services/customAlert';

// Vector SVG Icons
function UserIcon({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function MailIcon({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 6L12 13L2 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LockIcon({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BuildingIcon({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 21H21M5 21V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21M9 7H10M14 7H15M9 11H10M14 11H15M9 15H10M14 15H15M9 19H10M14 19H15"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MapPinIcon({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function PhoneIcon({ color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92V19.92C22.0011 20.1986 21.9441 20.4742 21.8325 20.7294C21.7209 20.9846 21.5573 21.2137 21.3521 21.4019C21.1468 21.5902 20.9046 21.7336 20.6407 21.8228C20.3769 21.912 20.0974 21.9451 19.82 21.92C16.7428 21.5857 13.787 20.5342 11.19 18.85C8.77382 17.3147 6.72533 15.2662 5.19 12.85C3.49997 10.2413 2.44824 7.27109 2.12 4.18C2.095 3.90353 2.12787 3.62489 2.21658 3.36171C2.30529 3.09852 2.44787 2.85673 2.6353 2.65174C2.82273 2.44675 3.05078 2.28314 3.30501 2.17133C3.55925 2.05952 3.83398 2.00201 4.11 2.00003H7.11C7.5953 1.99524 8.06579 2.16709 8.43376 2.48354C8.80173 2.8 9.04207 3.23953 9.11 3.72C9.23662 4.68007 9.47144 5.62273 9.81 6.53C9.94454 6.88792 9.97366 7.27691 9.8939 7.65089C9.81415 8.02486 9.62886 8.36812 9.36 8.64L8.09 9.91C9.51355 12.4135 11.5865 14.4865 14.09 15.91L15.36 14.64C15.6319 14.3711 15.9751 14.1858 16.3491 14.1061C16.7231 14.0263 17.1121 14.0555 17.47 14.19C18.3773 14.5286 19.3199 14.7634 20.28 14.89C20.7657 14.9585 21.2094 15.2033 21.5265 15.5768C21.8437 15.9504 22.0125 16.4276 22 16.92Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Preset Avatars
const PRESET_AVATARS = ['🏢', '🏭', '💼', '🌾', '📦', '🚚', '⚡', '🛡️'];

export default function ProfileScreen({ user, onUpdateUser, onBack, theme = lightPalette }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [location, setLocation] = useState(user?.location || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '🏢');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const isBuyer = (user?.role || '').toUpperCase() === 'BUYER';
  const userId = user?._id || user?.id;

  const handleSaveProfile = async () => {
    if (!name || name.trim().length === 0) {
      showCustomAlert('Validation Error', 'User name is required.');
      return;
    }
    if (!email || !email.includes('@')) {
      showCustomAlert('Validation Error', 'A valid email address is required.');
      return;
    }

    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 6) {
        showCustomAlert('Weak Password', 'New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showCustomAlert('Password Mismatch', 'The new passwords entered do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        companyName: companyName.trim(),
        location: location.trim(),
        phone: phone.trim(),
        avatar,
      };

      if (newPassword && newPassword.trim().length > 0) {
        payload.password = newPassword.trim();
      }

      const res = await api.updateProfile(userId, payload);
      if (res?.success && res.user) {
        if (onUpdateUser) {
          onUpdateUser(res.user);
        }
        setNewPassword('');
        setConfirmPassword('');
        showCustomAlert('Profile Saved', 'Your user profile details have been successfully updated in MongoDB Atlas.', null, { type: 'success' });
      } else {
        throw new Error(res?.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.warn('[Profile Update Error]', err);
      showCustomAlert('Update Failed', err.message || 'Could not update profile.', null, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

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
            <Text style={[styles.kicker, { color: theme.brass }]}>USER PROFILE</Text>
            <Text style={[styles.heading, { color: theme.ink }]}>Edit Profile Details</Text>
          </View>
        </View>

        <Text style={[styles.subText, { color: theme.inkDim }]}>
          Update your personal name, work email, secure password, company details, and avatar badge.
        </Text>

        {/* ── 1. Avatar Selector Card ────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.kicker, { color: theme.brass }]}>AVATAR BADGE</Text>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircleLarge, { backgroundColor: theme.surface2, borderColor: theme.brass }]}>
              <Text style={{ fontSize: 36 }}>{avatar || (isBuyer ? '📦' : '🏷️')}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.cardTitle, { color: theme.ink }]}>Choose Account Avatar</Text>
              <Text style={[styles.cardMeta, { color: theme.inkDim }]}>
                Select an enterprise icon to represent your profile on reverse auction floor rooms.
              </Text>
            </View>
          </View>

          {/* Preset Avatar Selector */}
          <View style={styles.presetAvatarGrid}>
            {PRESET_AVATARS.map((emoji) => {
              const isSelected = avatar === emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.presetAvatarBtn,
                    {
                      backgroundColor: isSelected ? 'rgba(198,151,73,0.18)' : theme.surface2,
                      borderColor: isSelected ? theme.brass : theme.line,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setAvatar(emoji)}
                >
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 2. Permanent Account Role Badge ─────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <View style={styles.roleHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: theme.brass }]}>PERMANENT ACCOUNT ROLE</Text>
              <Text style={[styles.cardTitle, { color: theme.ink }]}>
                {isBuyer ? 'Verified Buyer Account' : 'Verified Supplier Account'}
              </Text>
            </View>
            <View style={[styles.rolePill, { backgroundColor: isBuyer ? 'rgba(198,151,73,0.15)' : 'rgba(95,107,69,0.15)', borderColor: isBuyer ? theme.brass : theme.olive }]}>
              <Text style={[styles.rolePillText, { color: isBuyer ? theme.brass : theme.olive }]}>
                {user?.role || 'PENDING'}
              </Text>
            </View>
          </View>
          <View style={[styles.infoBanner, { backgroundColor: theme.surface2 }]}>
            <Text style={[styles.infoBannerText, { color: theme.inkDim }]}>
              🔒 Role is permanently assigned from your {isBuyer ? 'Buyer' : 'Supplier'} signup and cannot be modified.
            </Text>
          </View>
        </View>

        {/* ── 3. Basic Information ───────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.kicker, { color: theme.brass }]}>PERSONAL CREDENTIALS</Text>

          {/* Name Field */}
          <Text style={[styles.inputLabel, { color: theme.ink }]}>Full Name</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
            <UserIcon color={theme.inkDim} />
            <TextInput
              style={[styles.inputFlex, { color: theme.ink }]}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={theme.inkDim}
            />
          </View>

          {/* Email Field */}
          <Text style={[styles.inputLabel, { color: theme.ink, marginTop: 6 }]}>Work Email Address</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
            <MailIcon color={theme.inkDim} />
            <TextInput
              style={[styles.inputFlex, { color: theme.ink }]}
              value={email}
              onChangeText={setEmail}
              placeholder="work.email@domain.com"
              placeholderTextColor={theme.inkDim}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* ── 4. Corporate & Entity Information ───────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.kicker, { color: theme.brass }]}>ORGANIZATION & CONTACT</Text>

          {/* Company Name */}
          <Text style={[styles.inputLabel, { color: theme.ink }]}>Company / Legal Entity</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
            <BuildingIcon color={theme.inkDim} />
            <TextInput
              style={[styles.inputFlex, { color: theme.ink }]}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="e.g. Reliance Agri Logistics Ltd"
              placeholderTextColor={theme.inkDim}
            />
          </View>

          {/* Location */}
          <Text style={[styles.inputLabel, { color: theme.ink, marginTop: 6 }]}>Location (City, State)</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
            <MapPinIcon color={theme.inkDim} />
            <TextInput
              style={[styles.inputFlex, { color: theme.ink }]}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Mumbai, Maharashtra"
              placeholderTextColor={theme.inkDim}
            />
          </View>

          {/* Phone */}
          <Text style={[styles.inputLabel, { color: theme.ink, marginTop: 6 }]}>Contact Phone Number</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
            <PhoneIcon color={theme.inkDim} />
            <TextInput
              style={[styles.inputFlex, { color: theme.ink }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={theme.inkDim}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* ── 5. Change Password ─────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.kicker, { color: theme.brass }]}>SECURITY & PASSWORD</Text>
          <Text style={[styles.cardMeta, { color: theme.inkDim }]}>
            Leave blank if you do not want to change your password.
          </Text>

          {/* New Password */}
          <Text style={[styles.inputLabel, { color: theme.ink, marginTop: 4 }]}>New Password</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
            <LockIcon color={theme.inkDim} />
            <TextInput
              style={[styles.inputFlex, { color: theme.ink }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password (min 6 chars)"
              placeholderTextColor={theme.inkDim}
              secureTextEntry={true}
            />
          </View>

          {/* Confirm Password */}
          <Text style={[styles.inputLabel, { color: theme.ink, marginTop: 6 }]}>Confirm New Password</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
            <LockIcon color={theme.inkDim} />
            <TextInput
              style={[styles.inputFlex, { color: theme.ink }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor={theme.inkDim}
              secureTextEntry={true}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.brass }]}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.primaryText} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>Save Profile Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.ghostBtn, { borderColor: theme.line }]} onPress={onBack}>
          <Text style={[styles.ghostBtnText, { color: theme.inkDim }]}>Cancel & Return</Text>
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
    paddingBottom: 120,
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
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 4,
  },
  avatarCircleLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetAvatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  presetAvatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
  },
  primaryBtn: {
    padding: 14,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  ghostBtn: {
    padding: 13,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
