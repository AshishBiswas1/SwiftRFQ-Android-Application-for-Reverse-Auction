import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  Share,
  Platform,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { darkPalette } from '../theme/tokens';
import api from '../services/api';
import { showCustomAlert } from '../services/customAlert';

// ── Contact Detail Extractor Helper ──────────────────────────────────────────
async function extractContactDetails(contact) {
  if (!contact) return { name: '', phone: '', email: '', company: '' };

  let rawName = '';
  let phone = '';
  let email = '';
  let company = '';

  // 1. If Contact instance has getDetails() (expo-contacts next)
  if (typeof contact.getDetails === 'function') {
    try {
      const details = await contact.getDetails();
      if (details) {
        rawName =
          details.fullName ||
          [details.givenName, details.familyName].filter(Boolean).join(' ') ||
          details.name ||
          '';
        company = details.company || '';
        if (Array.isArray(details.phones) && details.phones.length > 0) {
          phone = details.phones[0]?.number || details.phones[0]?.digits || '';
        }
        if (Array.isArray(details.emails) && details.emails.length > 0) {
          email = details.emails[0]?.address || details.emails[0]?.email || '';
        }
      }
    } catch (_) {}
  }

  // 2. If Contact instance has getPhones()
  if (!phone && typeof contact.getPhones === 'function') {
    try {
      const phones = await contact.getPhones();
      if (Array.isArray(phones) && phones.length > 0) {
        phone = phones[0]?.number || phones[0]?.digits || '';
      }
    } catch (_) {}
  }

  // 3. If Contact instance has getEmails()
  if (!email && typeof contact.getEmails === 'function') {
    try {
      const emails = await contact.getEmails();
      if (Array.isArray(emails) && emails.length > 0) {
        email = emails[0]?.address || emails[0]?.email || '';
      }
    } catch (_) {}
  }

  // 4. Direct property access (legacy or standard object fields)
  if (!rawName) {
    rawName =
      contact.name ||
      contact.fullName ||
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
      [contact.givenName, contact.familyName].filter(Boolean).join(' ') ||
      '';
  }

  if (!phone) {
    const list = contact.phoneNumbers || contact.phones;
    if (Array.isArray(list) && list.length > 0) {
      phone = typeof list[0] === 'string' ? list[0] : list[0]?.number || list[0]?.digits || '';
    } else if (typeof list === 'string') {
      phone = list;
    }
  }

  if (!email) {
    const list = contact.emails;
    if (Array.isArray(list) && list.length > 0) {
      email = typeof list[0] === 'string' ? list[0] : list[0]?.email || list[0]?.address || '';
    } else if (typeof list === 'string') {
      email = list;
    }
  }

  if (!company) {
    company = contact.company || contact.companyName || '';
  }

  return {
    name: (rawName || 'Supplier Contact').trim(),
    phone: (phone || '').trim(),
    email: (email || '').trim(),
    company: (company || '').trim(),
  };
}

// ── Supplier Initials Avatar ─────────────────────────────────────────────────
function Avatar({ name = 'Supplier', size = 44, bg = '#A97426', fg = '#FFFFFF' }) {
  const safeName = typeof name === 'string' && name.trim() ? name : 'Supplier';
  const initials =
    safeName
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase() || 'S';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: fg, fontSize: size * 0.36, fontWeight: '800', letterSpacing: 0.3 }}>
        {initials}
      </Text>
    </View>
  );
}

// ── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status, theme }) {
  const isAccepted = String(status || '').toUpperCase() === 'ACCEPTED';
  const config = isAccepted
    ? { label: 'ACCEPTED (APP READY)', bg: 'rgba(95,107,69,0.16)', border: theme?.olive || '#5F6B45', fg: theme?.olive || '#5F6B45' }
    : { label: 'INVITED (PENDING)', bg: 'rgba(169,116,38,0.14)', border: theme?.brass || '#A97426', fg: theme?.brass || '#A97426' };

  return (
    <View style={[pillSt.pill, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[pillSt.text, { color: config.fg }]}>{config.label}</Text>
    </View>
  );
}
const pillSt = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  text: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.8 },
});

// ── Supplier Card Tile ────────────────────────────────────────────────────────
function SupplierTile({ item, isInvited, onToggle, onWhatsApp, onSms, theme }) {
  const avatarColors = [
    { bg: theme?.brass || '#A97426', fg: theme?.primaryText || '#FFFFFF' },
    { bg: theme?.rust || '#8C4426', fg: theme?.primaryText || '#FFFFFF' },
    { bg: theme?.olive || '#5F6B45', fg: theme?.primaryText || '#FFFFFF' },
    { bg: theme?.surface2 || '#24211D', fg: theme?.inkDim || '#A0988A' },
  ];
  const strId = String(item.id || item._id || item.name || '1');
  let charSum = 0;
  for (let i = 0; i < strId.length; i++) {
    charSum += strId.charCodeAt(i);
  }
  const color = avatarColors[Math.abs(charSum) % avatarColors.length] || avatarColors[0];

  return (
    <View
      style={[
        tileSt.tile,
        {
          backgroundColor: isInvited ? 'rgba(95,107,69,0.06)' : theme.surface,
          borderColor: isInvited ? theme.olive : theme.line,
        },
      ]}
    >
      {/* Invited left accent stripe */}
      {isInvited && <View style={[tileSt.stripe, { backgroundColor: theme.olive }]} />}

      {/* Top row: avatar + info + status */}
      <View style={tileSt.topRow}>
        <Avatar name={item.name} size={46} bg={color.bg} fg={color.fg} />
        <View style={tileSt.infoCol}>
          <Text style={[tileSt.name, { color: theme.ink }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.companyName ? (
            <Text style={[tileSt.company, { color: theme.brass }]} numberOfLines={1}>
              🏢 {item.companyName}
            </Text>
          ) : null}
          <Text style={[tileSt.location, { color: theme.inkDim }]} numberOfLines={1}>
            📍 {item.location || 'India'} {item.phone ? ` · 📞 ${item.phone}` : ''}
          </Text>
          <View style={tileSt.metaRow}>
            <StatusPill status={item.status} theme={theme} />
          </View>
        </View>
      </View>

      {/* Message Invite Quick Actions */}
      <View style={tileSt.quickActionRow}>
        <TouchableOpacity
          style={[tileSt.msgBtn, { backgroundColor: 'rgba(37,211,102,0.12)', borderColor: 'rgba(37,211,102,0.4)' }]}
          activeOpacity={0.8}
          onPress={() => onWhatsApp(item)}
        >
          <Text style={[tileSt.msgBtnText, { color: '#25D366' }]}>💬 WhatsApp Invite</Text>
        </TouchableOpacity>

        {item.phone ? (
          <TouchableOpacity
            style={[tileSt.msgBtn, { backgroundColor: theme.surface2, borderColor: theme.line }]}
            activeOpacity={0.8}
            onPress={() => onSms(item)}
          >
            <Text style={[tileSt.msgBtnText, { color: theme.ink }]}>📱 SMS Invite</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Divider */}
      <View style={[tileSt.divider, { backgroundColor: theme.line }]} />

      {/* Invite to RFQ button */}
      <TouchableOpacity
        style={[
          tileSt.inviteBtn,
          isInvited
            ? { backgroundColor: theme.olive, borderColor: theme.olive }
            : { backgroundColor: theme.surface2, borderColor: theme.line },
        ]}
        activeOpacity={0.8}
        onPress={() => onToggle(item.id || item._id)}
      >
        <Text style={[tileSt.inviteText, { color: isInvited ? theme.primaryText : theme.ink }]}>
          {isInvited ? '✓  Included in Next RFQ' : '+  Select for RFQ Auction'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const tileSt = StyleSheet.create({
  tile: {
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 14,
    marginBottom: 12,
    gap: 10,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  topRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoCol: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
  company: { fontSize: 11.5, fontWeight: '600' },
  location: { fontSize: 11.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  quickActionRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  msgBtn: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  msgBtnText: { fontSize: 11.5, fontWeight: '700' },
  divider: { height: 1, marginHorizontal: -14 },
  inviteBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.2,
  },
  inviteText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SupplierDirectoryScreen({ onBack, theme = darkPalette, user = null }) {
  const [search, setSearch] = useState('');
  const [invitedMap, setInvitedMap] = useState({});
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Contact Picker & Add Modal States
  const [contactsModalVisible, setContactsModalVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    email: '',
    companyName: '',
    location: '',
  });

  const buyerId = user?._id || user?.id || '';
  const buyerName = user?.companyName || user?.name || 'Verified Buyer';

  // Load private supplier contacts belonging strictly to this buyer
  const fetchContacts = async () => {
    if (!buyerId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getContacts(buyerId);
      if (res && res.data) {
        setContacts(res.data);
      }
    } catch (e) {
      console.warn('[SupplierDirectory] Could not load contacts:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [buyerId]);

  const toggleInvite = (id) => setInvitedMap((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── WhatsApp & SMS Direct Invitation Handlers ──────────────────────────────
  const sendWhatsAppInvite = async (item) => {
    const phoneDigits = (item.phone || '').replace(/[^0-9]/g, '');
    const text = `Hi ${item.name}, ${buyerName} has invited you to join their verified supplier group on SwiftRFQ. Download the app to participate in live reverse auctions and win orders: https://swiftrfq.app`;
    const appUrl = phoneDigits
      ? `whatsapp://send?phone=${phoneDigits}&text=${encodeURIComponent(text)}`
      : `whatsapp://send?text=${encodeURIComponent(text)}`;

    try {
      const supported = await Linking.canOpenURL(appUrl);
      if (supported) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(text)}`);
      }
    } catch (_) {
      Share.share({ message: text });
    }
  };

  const sendSmsInvite = async (item) => {
    const phoneDigits = (item.phone || '').replace(/[^0-9]/g, '');
    const text = `Hi ${item.name}, ${buyerName} has invited you to join their supplier network on SwiftRFQ. Download the app to participate in live reverse auctions: https://swiftrfq.app`;
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${phoneDigits}${separator}body=${encodeURIComponent(text)}`;
    try {
      await Linking.openURL(url);
    } catch (_) {
      Share.share({ message: text });
    }
  };

  // ── Import Supplier from Device Contacts ────────────────────────────────────
  const handleOpenContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        showCustomAlert(
          'Permission Required',
          'Access to contacts is required to import suppliers directly. You can also add supplier details manually.',
          [
            { text: 'Add Manually', onPress: () => setManualModalVisible(true) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      // Try native contact picker first
      if (Contacts.Contact && typeof Contacts.Contact.presentPicker === 'function') {
        try {
          const picked = await Contacts.Contact.presentPicker();
          if (picked) {
            await importSingleContact(picked);
            return;
          }
        } catch (_) {
          // Fallback to loading contact list in modal
        }
      }

      // Fallback: Fetch contacts list and show in-app contact selection modal
      setActionLoading(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Company,
        ],
        sort: Contacts.SortTypes?.FirstName,
      });

      if (data && data.length > 0) {
        setDeviceContacts(data);
        setContactSearch('');
        setContactsModalVisible(true);
      } else {
        showCustomAlert(
          'No Contacts Found',
          'No phone contacts were found on this device. Would you like to add a supplier manually?',
          [
            { text: 'Add Manually', onPress: () => setManualModalVisible(true) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch (err) {
      showCustomAlert(
        'Unable to Open Contacts',
        err.message || 'Could not access phone contacts. You can add your supplier manually.',
        [
          { text: 'Add Manually', onPress: () => setManualModalVisible(true) },
          { text: 'OK' },
        ]
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Process and save an imported contact directly into the Contact collection
  const importSingleContact = async (contact) => {
    try {
      setActionLoading(true);
      const { name, phone, email, company } = await extractContactDetails(contact);

      const res = await api.addContact({
        buyerId,
        buyerName,
        name,
        phone,
        email,
        companyName: company,
        location: 'India',
      });

      if (res && res.success && res.data) {
        const added = res.data;
        setContacts((prev) => [added, ...prev.filter((c) => c.id !== added.id)]);
        setInvitedMap((prev) => ({ ...prev, [added.id]: true }));
        setContactsModalVisible(false);

        // Prompt to immediately send a WhatsApp / SMS invitation
        showCustomAlert(
          'Supplier Added to Network',
          `${added.name} has been added to your supplier list. Would you like to send them a WhatsApp invitation?`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Send WhatsApp Invite', onPress: () => sendWhatsAppInvite(added) },
          ],
          { type: 'success' }
        );
      }
    } catch (err) {
      showCustomAlert('Import Notice', err.message || 'Could not add contact.', null, { type: 'warning' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Manual Supplier Addition ────────────────────────────────────────────────
  const handleSaveManualSupplier = async () => {
    if (!manualForm.name.trim()) {
      showCustomAlert('Required Field', 'Please enter the supplier name.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.addContact({
        buyerId,
        buyerName,
        name: manualForm.name.trim(),
        phone: manualForm.phone.trim(),
        email: manualForm.email.trim(),
        companyName: manualForm.companyName.trim(),
        location: manualForm.location.trim() || 'India',
      });

      if (res && res.success && res.data) {
        const added = res.data;
        setContacts((prev) => [added, ...prev.filter((c) => c.id !== added.id)]);
        setInvitedMap((prev) => ({ ...prev, [added.id]: true }));
        setManualModalVisible(false);
        setManualForm({ name: '', phone: '', email: '', companyName: '', location: '' });

        showCustomAlert(
          'Supplier Added',
          `${added.name} has been added. Send them a WhatsApp invitation now?`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Send WhatsApp Invite', onPress: () => sendWhatsAppInvite(added) },
          ],
          { type: 'success' }
        );
      }
    } catch (err) {
      showCustomAlert('Failed to Add Supplier', err.message || 'Could not save contact.', null, { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = contacts.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.companyName && s.companyName.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search)) ||
      (s.location && s.location.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredDeviceContacts = deviceContacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    const nameMatch = (c.name || c.firstName || '').toLowerCase().includes(q);
    const phoneMatch = c.phoneNumbers && c.phoneNumbers.some((p) => p.number && p.number.includes(q));
    return nameMatch || phoneMatch;
  });

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
          <Text style={[styles.kicker, { color: theme.brass }]}>MY VERIFIED SUPPLIERS</Text>
          <Text style={[styles.heading, { color: theme.ink }]}>Supplier Directory</Text>
        </View>
      </View>

      <Text style={[styles.subheading, { color: theme.inkDim }]}>
        Build your supplier network anytime · Invite partners to reverse auctions
      </Text>

      {/* Quick Action Bar for Adding Suppliers Anytime */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionBtnPrimary, { backgroundColor: theme.brass }]}
          activeOpacity={0.8}
          onPress={handleOpenContacts}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color={theme.primaryText} />
          ) : (
            <Text style={[styles.actionBtnText, { color: theme.primaryText }]}>
              📱  Import from Contacts
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnSecondary, { backgroundColor: theme.surface, borderColor: theme.line }]}
          activeOpacity={0.8}
          onPress={() => setManualModalVisible(true)}
        >
          <Text style={[styles.actionBtnSecText, { color: theme.ink }]}>
            ➕  Add Manually
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.searchIcon, { color: theme.inkDim }]}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: theme.ink }]}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={theme.inkDim}
          placeholder="Search suppliers by name, phone, or company..."
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: theme.inkDim, fontSize: 15, paddingHorizontal: 4 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Supplier Tiles */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <SupplierTile
            item={item}
            isInvited={!!invitedMap[item.id]}
            onToggle={toggleInvite}
            onWhatsApp={sendWhatsAppInvite}
            onSms={sendSmsInvite}
            theme={theme}
          />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            {loading ? (
              <ActivityIndicator color={theme.brass} style={{ marginVertical: 16 }} />
            ) : (
              <>
                <Text style={{ fontSize: 34, marginBottom: 8 }}>👥</Text>
                <Text style={[styles.emptyTitle, { color: theme.ink }]}>
                  {search ? 'No Matching Suppliers' : 'Build Your Supplier Network'}
                </Text>
                <Text style={[styles.emptyDesc, { color: theme.inkDim }]}>
                  {search
                    ? `No suppliers match "${search}". Try importing them from your contacts.`
                    : 'You do not have to wait for an active auction! Add trusted suppliers from your contacts now, invite them via WhatsApp, and have your network ready when you launch auctions.'}
                </Text>

                {!search && (
                  <View style={styles.emptyActionRow}>
                    <TouchableOpacity
                      style={[styles.emptyImportBtn, { backgroundColor: theme.brass }]}
                      onPress={handleOpenContacts}
                    >
                      <Text style={[styles.emptyImportBtnText, { color: theme.primaryText }]}>
                        📱  Import from Contacts
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.emptyManualBtn, { borderColor: theme.line, backgroundColor: theme.surface2 }]}
                      onPress={() => setManualModalVisible(true)}
                    >
                      <Text style={[styles.emptyManualBtnText, { color: theme.ink }]}>
                        ➕  Add Manually
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* ── Modal 1: In-App Contact Picker List ─────────────────────────────────── */}
      <Modal visible={contactsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.bg, borderColor: theme.line }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.ink }]}>Select from Contacts</Text>
                <Text style={[styles.modalSubtitle, { color: theme.inkDim }]}>
                  Choose a contact to add to your supplier list
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
                onPress={() => setContactsModalVisible(false)}
              >
                <Text style={{ color: theme.ink, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search contacts */}
            <View style={[styles.contactSearchBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <Text style={{ color: theme.inkDim, marginRight: 6 }}>🔍</Text>
              <TextInput
                style={[styles.contactSearchInput, { color: theme.ink }]}
                value={contactSearch}
                onChangeText={setContactSearch}
                placeholder="Search phone contacts..."
                placeholderTextColor={theme.inkDim}
              />
            </View>

            {actionLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={theme.brass} size="large" />
                <Text style={{ color: theme.inkDim, marginTop: 12, fontSize: 13 }}>
                  Importing supplier...
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredDeviceContacts}
                keyExtractor={(item, index) => item.id || String(index)}
                renderItem={({ item }) => {
                  const displayName =
                    item.name ||
                    [item.firstName, item.lastName].filter(Boolean).join(' ') ||
                    'Contact';
                  const primaryPhone =
                    item.phoneNumbers?.[0]?.number ||
                    item.phones?.[0]?.number ||
                    'No phone';
                  const company = item.company || '';

                  return (
                    <TouchableOpacity
                      style={[styles.contactRow, { borderBottomColor: theme.line }]}
                      activeOpacity={0.75}
                      onPress={() => importSingleContact(item)}
                    >
                      <Avatar name={displayName} size={40} bg={theme.surface2} fg={theme.ink} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.contactName, { color: theme.ink }]} numberOfLines={1}>
                          {displayName}
                        </Text>
                        <Text style={[styles.contactMeta, { color: theme.inkDim }]} numberOfLines={1}>
                          📞 {primaryPhone} {company ? ` · ${company}` : ''}
                        </Text>
                      </View>
                      <View style={[styles.contactAddPill, { backgroundColor: 'rgba(169,116,38,0.15)', borderColor: theme.brass }]}>
                        <Text style={[styles.contactAddText, { color: theme.brass }]}>+ Add</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ color: theme.inkDim, fontSize: 13 }}>
                      {contactSearch ? 'No contacts match your search.' : 'No contacts available.'}
                    </Text>
                  </View>
                }
                style={{ maxHeight: 380 }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal 2: Manual Supplier Entry ────────────────────────────────────── */}
      <Modal visible={manualModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.bg, borderColor: theme.line }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.ink }]}>Add Supplier Contact</Text>
                <Text style={[styles.modalSubtitle, { color: theme.inkDim }]}>
                  Add details to your private supplier directory
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
                onPress={() => setManualModalVisible(false)}
              >
                <Text style={{ color: theme.ink, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 10 }}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.inkDim }]}>SUPPLIER NAME *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
                  placeholder="e.g. Ramesh Traders, Arjun Patel"
                  placeholderTextColor={theme.inkDim}
                  value={manualForm.name}
                  onChangeText={(val) => setManualForm((p) => ({ ...p, name: val }))}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.inkDim }]}>PHONE NUMBER</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={theme.inkDim}
                  keyboardType="phone-pad"
                  value={manualForm.phone}
                  onChangeText={(val) => setManualForm((p) => ({ ...p, phone: val }))}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.inkDim }]}>EMAIL ADDRESS</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
                  placeholder="supplier@company.com"
                  placeholderTextColor={theme.inkDim}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={manualForm.email}
                  onChangeText={(val) => setManualForm((p) => ({ ...p, email: val }))}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.inkDim }]}>COMPANY / BUSINESS NAME</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
                  placeholder="e.g. Reliance Petrochemicals Ltd"
                  placeholderTextColor={theme.inkDim}
                  value={manualForm.companyName}
                  onChangeText={(val) => setManualForm((p) => ({ ...p, companyName: val }))}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.inkDim }]}>LOCATION / CITY</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
                  placeholder="e.g. Mumbai, Gujarat, Delhi"
                  placeholderTextColor={theme.inkDim}
                  value={manualForm.location}
                  onChangeText={(val) => setManualForm((p) => ({ ...p, location: val }))}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.brass }]}
                activeOpacity={0.85}
                onPress={handleSaveManualSupplier}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={theme.primaryText} />
                ) : (
                  <Text style={[styles.submitBtnText, { color: theme.primaryText }]}>Save to My Suppliers</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  subheading: { fontSize: 13, marginBottom: 2 },

  // Action Bar
  actionBar: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  actionBtnPrimary: { flex: 1.2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnSecondary: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 12.5, fontWeight: '700' },
  actionBtnSecText: { fontSize: 12.5, fontWeight: '600' },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 4 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 13 },

  // Empty state
  emptyBox: { padding: 28, borderRadius: 18, borderWidth: 1, alignItems: 'center', marginTop: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyDesc: { fontSize: 12.5, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  emptyActionRow: { flexDirection: 'column', gap: 8, width: '100%' },
  emptyImportBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  emptyImportBtnText: { fontSize: 13, fontWeight: '700' },
  emptyManualBtn: { paddingVertical: 11, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  emptyManualBtnText: { fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18, maxHeight: '82%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Contact list inside modal
  contactSearchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  contactSearchInput: { flex: 1, fontSize: 13, padding: 0 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  contactName: { fontSize: 14, fontWeight: '700' },
  contactMeta: { fontSize: 12 },
  contactAddPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  contactAddText: { fontSize: 11, fontWeight: '700' },

  // Manual Form
  fieldGroup: { gap: 5 },
  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  submitBtn: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 14, fontWeight: '700' },
});
