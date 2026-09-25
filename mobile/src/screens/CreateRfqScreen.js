import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { darkPalette } from '../theme/tokens';
import { showCustomAlert } from '../services/customAlert';
import api from '../services/api';

const DURATION_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: '24 hours', minutes: 1440 },
];

const UNIT_OPTIONS = ['L', 'kg', 'MT', 'Ton', 'Units'];

export default function CreateRfqScreen({ onCreateRfq, onBack, theme = darkPalette, user }) {
  const [commodity, setCommodity] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('L');
  const [grade, setGrade] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(240);
  const [minDecrement, setMinDecrement] = useState('0.50');
  const [ceilingPrice, setCeilingPrice] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [invitedSuppliers, setInvitedSuppliers] = useState([]);

  // Contact Picker Modal state
  const [showPicker, setShowPicker] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [tempSelected, setTempSelected] = useState([]);

  // Fetch buyer's contacts
  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const buyerId = user?._id || user?.id;
        const res = await api.getContacts(buyerId);
        if (res?.data && Array.isArray(res.data)) {
          setContacts(res.data);
        }
      } catch (err) {
        console.warn('Failed to fetch contacts for picker:', err.message);
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, [user]);

  const openPickerModal = () => {
    setTempSelected([...invitedSuppliers]);
    setShowPicker(true);
  };

  const toggleSupplierSelection = (supplier) => {
    const suppName = supplier.name || supplier.companyName || supplier.phone;
    const exists = tempSelected.some((s) => (s.name || s.companyName || s.phone) === suppName);
    if (exists) {
      setTempSelected(tempSelected.filter((s) => (s.name || s.companyName || s.phone) !== suppName));
    } else {
      setTempSelected([
        ...tempSelected,
        {
          id: supplier._id || supplier.id,
          name: supplier.name || supplier.companyName || 'Supplier',
          companyName: supplier.companyName || supplier.name || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
        },
      ]);
    }
  };

  const handleApplyContacts = () => {
    setInvitedSuppliers(tempSelected);
    setShowPicker(false);
  };

  const handleRemoveSupplier = (suppName) => {
    setInvitedSuppliers(invitedSuppliers.filter((s) => (s.name || s.companyName || s.phone) !== suppName));
  };

  const handleSubmit = () => {
    if (!commodity.trim()) {
      showCustomAlert('Required Field', 'Please specify the Commodity name.');
      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      showCustomAlert('Required Field', 'Please enter a valid numeric Quantity.');
      return;
    }
    if (!ceilingPrice || isNaN(Number(ceilingPrice)) || Number(ceilingPrice) <= 0) {
      showCustomAlert('Required Field', 'Please specify a starting ceiling price.');
      return;
    }
    if (!minDecrement || isNaN(Number(minDecrement)) || Number(minDecrement) <= 0) {
      showCustomAlert('Required Field', 'Please specify a valid minimum decrement step.');
      return;
    }

    const rfqData = {
      commodity: commodity.trim(),
      quantity: Number(quantity),
      unit: unit.trim() || 'L',
      grade: grade.trim(),
      deliveryTerms: deliveryTerms.trim(),
      durationMinutes: Number(durationMinutes) || 240,
      ceilingPrice: Number(ceilingPrice),
      reservePrice: reservePrice ? Number(reservePrice) : null,
      minDecrement: Number(minDecrement),
      invitedSuppliers,
    };

    onCreateRfq(rfqData);
  };

  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    const nameMatch = (c.name || '').toLowerCase().includes(q);
    const compMatch = (c.companyName || '').toLowerCase().includes(q);
    const phoneMatch = (c.phone || '').includes(q);
    return nameMatch || compMatch || phoneMatch;
  });

  return (
    <View style={styles.rootView}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header matching Mockup */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
            onPress={onBack}
          >
            <Text style={{ color: theme.ink, fontSize: 16 }}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={[styles.heading, { color: theme.ink }]}>New requirement</Text>
          </View>
        </View>

        {/* Commodity Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.label, { color: theme.inkDim }]}>COMMODITY</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink }]}
            value={commodity}
            onChangeText={setCommodity}
            placeholder="e.g. Hydrogen Peroxide"
            placeholderTextColor={theme.inkDim}
          />

          <View style={styles.row}>
            {/* Quantity */}
            <View style={styles.halfColumn}>
              <Text style={[styles.label, { color: theme.inkDim }]}>QUANTITY</Text>
              <View style={styles.qtyRow}>
                <TextInput
                  style={[styles.input, styles.qtyInput, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="18,000"
                  placeholderTextColor={theme.inkDim}
                  keyboardType="numeric"
                />
                <View style={styles.unitPillsRow}>
                  {UNIT_OPTIONS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.unitChip,
                        { borderColor: theme.line },
                        unit === u && { backgroundColor: theme.brass, borderColor: theme.brass },
                      ]}
                      onPress={() => setUnit(u)}
                    >
                      <Text
                        style={[
                          styles.unitChipText,
                          { color: unit === u ? theme.primaryText : theme.inkDim },
                        ]}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Grade */}
            <View style={styles.halfColumn}>
              <Text style={[styles.label, { color: theme.inkDim }]}>GRADE</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink }]}
                value={grade}
                onChangeText={setGrade}
                placeholder="50%, IP grade"
                placeholderTextColor={theme.inkDim}
              />
            </View>
          </View>

          {/* Delivery Terms */}
          <Text style={[styles.label, { color: theme.inkDim }]}>DELIVERY TERMS</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink }]}
            value={deliveryTerms}
            onChangeText={setDeliveryTerms}
            placeholder="Ex-works, Vapi — within 10 days"
            placeholderTextColor={theme.inkDim}
          />
        </View>

        {/* AUCTION RULES Section */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.sectionTitle, { color: theme.inkDim }]}>AUCTION RULES</Text>

          <View style={styles.row}>
            {/* Duration */}
            <View style={styles.halfColumn}>
              <Text style={[styles.label, { color: theme.inkDim }]}>DURATION</Text>
              <View style={styles.durationWrap}>
                {DURATION_PRESETS.map((p) => {
                  const isSelected = durationMinutes === p.minutes;
                  return (
                    <TouchableOpacity
                      key={p.minutes}
                      style={[
                        styles.presetChip,
                        { borderColor: theme.line },
                        isSelected && { backgroundColor: theme.brass, borderColor: theme.brass },
                      ]}
                      onPress={() => setDurationMinutes(p.minutes)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: isSelected ? theme.primaryText : theme.inkDim },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Min. Decrement */}
            <View style={styles.halfColumn}>
              <Text style={[styles.label, { color: theme.inkDim }]}>MIN. DECREMENT</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink }]}
                value={minDecrement}
                onChangeText={setMinDecrement}
                placeholder="0.50"
                placeholderTextColor={theme.inkDim}
                keyboardType="numeric"
              />
              <Text style={[styles.helperUnit, { color: theme.inkDim }]}>₹ / {unit}</Text>
            </View>
          </View>

          {/* Ceiling Price & Reserve Price */}
          <Text style={[styles.label, { color: theme.inkDim }]}>STARTING CEILING PRICE</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink }]}
            value={ceilingPrice}
            onChangeText={setCeilingPrice}
            placeholder="₹40.00"
            placeholderTextColor={theme.inkDim}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: theme.inkDim }]}>
            RESERVE PRICE (OPTIONAL, HIDDEN FROM SUPPLIERS)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink }]}
            value={reservePrice}
            onChangeText={setReservePrice}
            placeholder="₹38.00 / L"
            placeholderTextColor={theme.inkDim}
            keyboardType="numeric"
          />
        </View>

        {/* INVITED SUPPLIERS Section */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={[styles.sectionTitle, { color: theme.inkDim }]}>
            INVITED SUPPLIERS · {invitedSuppliers.length}
          </Text>
          <Text style={{ fontSize: 11, color: theme.brass, marginBottom: 4 }}>
            ⚡ All {contacts.length} supplier contacts in your directory will be autonomously notified upon launch.
          </Text>

          <View style={styles.suppliersWrap}>
            {invitedSuppliers.map((s, idx) => {
              const name = s.name || s.companyName || s.phone || 'Supplier';
              return (
                <View
                  key={idx}
                  style={[styles.supplierPill, { backgroundColor: theme.surface2, borderColor: theme.brass }]}
                >
                  <Text style={[styles.supplierPillText, { color: theme.ink }]}>{name}</Text>
                  <TouchableOpacity onPress={() => handleRemoveSupplier(name)}>
                    <Text style={[styles.removeX, { color: theme.rust }]}> ✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.addListBtn, { borderColor: theme.brass, backgroundColor: 'rgba(217, 131, 36, 0.08)' }]}
              onPress={openPickerModal}
            >
              <Text style={[styles.addListBtnText, { color: theme.brass }]}>+ Add from list</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Launch Button matching mockup */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.brass }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
        >
          <Text style={[styles.submitBtnText, { color: theme.primaryText }]}>Launch auction</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Supplier Contact Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.ink }]}>Select Invited Suppliers</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={{ color: theme.inkDim, fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.pickerSearch, { backgroundColor: theme.surface2, borderColor: theme.line, color: theme.ink }]}
              placeholder="Search contacts by name or phone..."
              placeholderTextColor={theme.inkDim}
              value={contactSearch}
              onChangeText={setContactSearch}
            />

            {loadingContacts ? (
              <ActivityIndicator color={theme.brass} style={{ padding: 20 }} />
            ) : (
              <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item._id || item.id || item.phone}
                style={{ maxHeight: 280 }}
                renderItem={({ item }) => {
                  const suppName = item.name || item.companyName || item.phone;
                  const isChecked = tempSelected.some(
                    (s) => (s.name || s.companyName || s.phone) === suppName
                  );
                  return (
                    <TouchableOpacity
                      style={[
                        styles.contactItem,
                        { borderColor: theme.line },
                        isChecked && { backgroundColor: 'rgba(217, 131, 36, 0.1)', borderColor: theme.brass },
                      ]}
                      onPress={() => toggleSupplierSelection(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.contactName, { color: theme.ink }]}>
                          {item.name || item.companyName || 'Contact'}
                        </Text>
                        <Text style={[styles.contactMeta, { color: theme.inkDim }]}>
                          {item.phone ? `📞 ${item.phone}` : ''} {item.companyName ? `· ${item.companyName}` : ''}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, color: isChecked ? theme.brass : theme.inkDim }}>
                        {isChecked ? '☑' : '☐'}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: theme.inkDim, fontSize: 13, textAlign: 'center' }}>
                      No contacts found. Add suppliers from the Supplier Directory or import contacts.
                    </Text>
                  </View>
                }
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalApplyBtn, { backgroundColor: theme.brass }]}
                onPress={handleApplyContacts}
              >
                <Text style={[styles.modalApplyText, { color: theme.primaryText }]}>
                  Apply ({tempSelected.length} Selected)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootView: { flex: 1 },
  container: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 4 },
  backBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTextCol: { flex: 1 },
  heading: { fontSize: 20, fontWeight: '700' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  halfColumn: { flex: 1 },
  qtyRow: { gap: 6 },
  qtyInput: { width: '100%' },
  unitPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  unitChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  unitChipText: { fontSize: 10, fontWeight: '700' },
  durationWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  presetChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, borderWidth: 1 },
  presetChipText: { fontSize: 11, fontWeight: '700' },
  helperUnit: { fontSize: 10, marginTop: 2 },
  suppliersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  supplierPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  supplierPillText: { fontSize: 12, fontWeight: '600' },
  removeX: { fontSize: 11, fontWeight: 'bold' },
  addListBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  addListBtnText: { fontSize: 12, fontWeight: '700' },
  submitBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 36 },
  submitBtnText: { fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 16, borderWidth: 1, padding: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  pickerSearch: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, marginBottom: 10 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  contactName: { fontSize: 13.5, fontWeight: '600' },
  contactMeta: { fontSize: 11 },
  modalActions: { marginTop: 12 },
  modalApplyBtn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  modalApplyText: { fontSize: 14, fontWeight: '700' },
});
