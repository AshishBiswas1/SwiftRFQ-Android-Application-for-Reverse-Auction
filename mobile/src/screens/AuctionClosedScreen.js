import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { darkPalette } from '../theme/tokens';
import { showCustomAlert } from '../services/customAlert';
import api from '../services/api';

export default function AuctionClosedScreen({
  rfq,
  onBack,
  onDelete,
  theme = darkPalette,
  user,
  role,
}) {
  const [fulfillmentStatus, setFulfillmentStatus] = useState(rfq?.fulfillmentStatus || 'AWARDED');
  const [updatingFulfillment, setUpdatingFulfillment] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 45, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const unit = rfq?.unit || 'L';
  const rawBids = rfq?.standings || rfq?.bids || [];
  const sortedBids = [...rawBids].sort((a, b) => Number(a.amount) - Number(b.amount));

  // Determine winner: either from rfq.winner or lowest bid
  const winner = rfq?.winner || (sortedBids.length > 0 ? sortedBids[0] : null);

  const ceiling = rfq?.ceilingPrice ? Number(rfq.ceilingPrice) : winner ? Number(winner.amount) : 0;
  const winnerAmount = winner ? Number(winner.amount) : 0;
  const quantity = Number(rfq?.quantity) || 1;
  const totalOrderValue = winnerAmount * quantity;
  const savingsPerUnit = ceiling > winnerAmount ? ceiling - winnerAmount : 0;
  const savingsPercent =
    ceiling > 0 && savingsPerUnit > 0 ? ((savingsPerUnit / ceiling) * 100).toFixed(1) : '0.0';

  // Determine if viewing user is the winner
  const myId = user?._id || user?.id;
  const myName = user?.name || user?.companyName || '';
  const myPhone = user?.phone || '';
  const isMeWinner =
    role === 'SUPPLIER' &&
    winner &&
    ((myId && String(winner.supplierId) === String(myId)) ||
      (myName && winner.supplierName?.toLowerCase() === myName.toLowerCase()) ||
      (myPhone && winner.supplierPhone && winner.supplierPhone === myPhone));

  // Winner phone lookup with fallbacks
  const winnerPhone =
    winner?.supplierPhone ||
    (rfq?.invitedSuppliers || []).find(
      (s) =>
        (winner?.supplierId && String(s.id) === String(winner.supplierId)) ||
        s.name?.toLowerCase() === winner?.supplierName?.toLowerCase()
    )?.phone ||
    '';

  const buyerPhone = rfq?.buyerPhone || '';

  const standings = sortedBids.map((b, index) => ({
    rank: `${index + 1}. ${b.supplierName || 'Verified Supplier'}`,
    amount: `₹${Number(b.amount).toFixed(2)}`,
    isWinner: index === 0,
  }));

  // ── Contact Handlers ────────────────────────────────────────────────────────
  const handleCall = (phone, personName = 'Supplier') => {
    const digits = (phone || '').replace(/[^0-9+]/g, '');
    if (!digits) {
      showCustomAlert(
        'Phone Not Available',
        `No direct mobile number was registered for ${personName}. You can reach them via their listed contact details or directory.`
      );
      return;
    }
    Linking.openURL(`tel:${digits}`).catch(() => {
      showCustomAlert('Unable to Dial', `Could not initiate call to ${digits}.`);
    });
  };

  const handleWhatsApp = (phone, personName = 'Supplier', isBuyerTarget = false) => {
    const digits = (phone || '').replace(/[^0-9]/g, '');
    const commodity = rfq?.commodity || 'Order';
    const totalValStr = totalOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 2 });

    let message = '';
    if (isBuyerTarget) {
      message = `Hi ${personName}, I am ${myName || 'your winning supplier'} regarding SwiftRFQ auction for ${quantity.toLocaleString()} ${unit} of ${commodity}. I am confirming our winning bid of ₹${winnerAmount.toFixed(2)}/${unit} (Total: ₹${totalValStr}). Please let me know the delivery and invoice schedule.`;
    } else {
      message = `Hi ${personName}, congratulations! You have won our SwiftRFQ reverse auction for ${quantity.toLocaleString()} ${unit} of ${commodity} at ₹${winnerAmount.toFixed(2)}/${unit} (Total Order: ₹${totalValStr}).\n\nPlease confirm delivery schedule and dispatch details.`;
    }

    if (digits) {
      const appUrl = `whatsapp://send?phone=${digits}&text=${encodeURIComponent(message)}`;
      const webUrl = `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
      Linking.canOpenURL(appUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(appUrl);
          }
          return Linking.openURL(webUrl);
        })
        .catch(() => {
          Linking.openURL(webUrl);
        });
    } else {
      // Open WhatsApp share chooser if no phone specified
      const shareUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      Linking.openURL(shareUrl).catch(() => {
        showCustomAlert('WhatsApp Not Available', 'Could not open WhatsApp on this device.');
      });
    }
  };

  const FULFILLMENT_STAGES = [
    { key: 'AWARDED', label: 'Won', icon: '🏆' },
    { key: 'PO_ISSUED', label: 'PO Issued', icon: '📄' },
    { key: 'DISPATCHED', label: 'Dispatched', icon: '🚚' },
    { key: 'DELIVERED', label: 'Delivered', icon: '✅' },
  ];

  const currentStageIdx = FULFILLMENT_STAGES.findIndex((s) => s.key === fulfillmentStatus);
  const safeStageIdx = currentStageIdx !== -1 ? currentStageIdx : 0;

  const handleUpdateFulfillment = (nextStatus, label) => {
    const rfqId = rfq?.id || rfq?._id || rfq?.rfqId;
    if (!rfqId) return;

    showCustomAlert(
      'Update Fulfillment',
      `Advance fulfillment progress to "${label}"? This updates both buyer and supplier records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update Status',
          onPress: async () => {
            setUpdatingFulfillment(true);
            try {
              await api.updateFulfillmentStatus(rfqId, nextStatus);
              setFulfillmentStatus(nextStatus);
              showCustomAlert('Fulfillment Updated', `Status is now ${label}.`, null, { type: 'success' });
            } catch (err) {
              setFulfillmentStatus(nextStatus);
              showCustomAlert('Status Updated', `Status updated locally to ${label}.`);
            } finally {
              setUpdatingFulfillment(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    const commodity = rfq?.commodity || 'Requirement';
    showCustomAlert(
      'Delete Requirement Session?',
      `Are you sure you want to permanently delete the session for "${commodity}"? This will remove it from your history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            const rfqId = rfq?.id || rfq?._id || rfq?.rfqId;
            if (onDelete) onDelete(rfqId);
            if (onBack) onBack();
          },
        },
      ],
      { type: 'warning' }
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Top Header / Trophy Wrap */}
      <View style={styles.winnerWrap}>
        <Animated.View
          style={[
            styles.checkCircle,
            {
              borderColor: isMeWinner ? theme.brass : theme.olive,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={{ fontSize: 32 }}>{isMeWinner ? '🏆' : '✓'}</Text>
        </Animated.View>

        <Text style={[styles.kicker, { color: isMeWinner ? theme.brass : theme.olive }]}>
          {isMeWinner ? 'YOU ARE THE WINNER' : 'AUCTION CONCLUDED'}
        </Text>
        <Text style={[styles.heading, { color: theme.ink }]} numberOfLines={1}>
          {isMeWinner
            ? 'Congratulations, You Won!'
            : winner
            ? `${winner.supplierName} Won`
            : 'Auction Concluded'}
        </Text>

        <View style={styles.bigNumRow}>
          <Text style={[styles.bigNum, { color: isMeWinner ? theme.brass : theme.olive }]}>
            {winner ? `₹${winnerAmount.toFixed(2)}` : '—'}
          </Text>
          <Text style={[styles.unitText, { color: theme.inkDim }]}> /{unit}</Text>
        </View>

        <Text style={[styles.subText, { color: theme.inkDim }]}>
          {winner
            ? `${quantity.toLocaleString()} ${unit} ${rfq?.commodity || 'Commodity'}${
                rfq?.grade ? ', ' + rfq.grade : ''
              } · Total: ₹${totalOrderValue.toLocaleString('en-IN', {
                maximumFractionDigits: 2,
              })} (${savingsPercent}% savings)`
            : `${rfq?.commodity || 'Requirement'} closed without winning bids.`}
        </Text>
      </View>

      {/* ── WINNER & DIRECT CONTACT CARD (FOR BUYER) ─────────────────────────── */}
      {winner && role !== 'SUPPLIER' && (
        <View style={[styles.contactCard, { backgroundColor: theme.surface, borderColor: theme.brass }]}>
          <View style={styles.contactHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactBadge, { color: theme.brass }]}>🏆 WINNING BIDDER</Text>
              <Text style={[styles.winnerName, { color: theme.ink }]}>{winner.supplierName}</Text>
              {winner.supplierCompany ? (
                <Text style={[styles.winnerCompany, { color: theme.inkDim }]}>
                  🏢 {winner.supplierCompany}
                </Text>
              ) : null}
              {winnerPhone ? (
                <Text style={[styles.winnerPhone, { color: theme.inkDim }]}>
                  📱 {winnerPhone}
                </Text>
              ) : (
                <Text style={[styles.winnerPhone, { color: theme.inkDim, fontStyle: 'italic' }]}>
                  📱 Mobile available upon contact
                </Text>
              )}
            </View>
            <View style={styles.priceTag}>
              <Text style={[styles.priceTagLabel, { color: theme.inkDim }]}>ORDER VALUE</Text>
              <Text style={[styles.priceTagValue, { color: theme.olive }]}>
                ₹{totalOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>

          {/* Contact Action Buttons: WhatsApp & Direct Call */}
          <View style={styles.contactBtnRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.callBtn, { backgroundColor: theme.surface2, borderColor: theme.line }]}
              onPress={() => handleCall(winnerPhone, winner.supplierName)}
            >
              <Text style={styles.btnEmoji}>📞</Text>
              <Text style={[styles.callBtnText, { color: theme.ink }]}>Call Supplier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.whatsappBtn, { backgroundColor: '#25D366' }]}
              onPress={() => handleWhatsApp(winnerPhone, winner.supplierName, false)}
            >
              <Text style={styles.btnEmoji}>💬</Text>
              <Text style={styles.whatsappBtnText}>WhatsApp Winner</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── SUPPLIER WON: CONTACT BUYER CARD (FOR WINNING SUPPLIER) ───────────── */}
      {isMeWinner && (
        <View style={[styles.contactCard, { backgroundColor: theme.surface, borderColor: theme.brass }]}>
          <View style={styles.contactHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactBadge, { color: theme.brass }]}>🤝 BUYER CONTACT</Text>
              <Text style={[styles.winnerName, { color: theme.ink }]}>
                {rfq?.buyerName || 'Verified Buyer'}
              </Text>
              {buyerPhone ? (
                <Text style={[styles.winnerPhone, { color: theme.inkDim }]}>📱 {buyerPhone}</Text>
              ) : (
                <Text style={[styles.winnerPhone, { color: theme.inkDim, fontStyle: 'italic' }]}>
                  📱 Buyer reachable via direct message
                </Text>
              )}
            </View>
            <View style={styles.priceTag}>
              <Text style={[styles.priceTagLabel, { color: theme.inkDim }]}>PAYOUT VALUE</Text>
              <Text style={[styles.priceTagValue, { color: theme.brass }]}>
                ₹{totalOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>

          <View style={styles.contactBtnRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.callBtn, { backgroundColor: theme.surface2, borderColor: theme.line }]}
              onPress={() => handleCall(buyerPhone, rfq?.buyerName || 'Buyer')}
            >
              <Text style={styles.btnEmoji}>📞</Text>
              <Text style={[styles.callBtnText, { color: theme.ink }]}>Call Buyer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.whatsappBtn, { backgroundColor: '#25D366' }]}
              onPress={() => handleWhatsApp(buyerPhone, rfq?.buyerName || 'Buyer', true)}
            >
              <Text style={styles.btnEmoji}>💬</Text>
              <Text style={styles.whatsappBtnText}>WhatsApp Buyer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── ORDER FULFILLMENT & LOGISTICS CARD (FOR BOTH WINNER & BUYER) ────────── */}
      {winner && (
        <View style={[styles.fulfillmentCard, { backgroundColor: theme.surface, borderColor: theme.brass }]}>
          {/* Header */}
          <View style={styles.fulfillmentHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fulfillmentBadge, { color: theme.brass }]}>📦 ORDER FULFILLMENT & LOGISTICS</Text>
              <Text style={[styles.fulfillmentPoNum, { color: theme.ink }]}>
                PO Ref: PO-{(rfq?.id || rfq?._id || rfq?.rfqId || '1001').replace(/^RFQ-/, '')}
              </Text>
            </View>
            <View
              style={[
                styles.fulfillmentStatusPill,
                {
                  backgroundColor:
                    fulfillmentStatus === 'DELIVERED'
                      ? 'rgba(95, 107, 69, 0.25)'
                      : fulfillmentStatus === 'DISPATCHED'
                      ? 'rgba(217, 131, 36, 0.2)'
                      : 'rgba(217, 131, 36, 0.12)',
                  borderColor: fulfillmentStatus === 'DELIVERED' ? theme.olive : theme.brass,
                },
              ]}
            >
              <Text
                style={[
                  styles.fulfillmentStatusText,
                  { color: fulfillmentStatus === 'DELIVERED' ? theme.olive : theme.brass },
                ]}
              >
                {FULFILLMENT_STAGES[safeStageIdx]?.label.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Stepper Progress Tracker */}
          <View style={styles.stepperContainer}>
            {FULFILLMENT_STAGES.map((st, idx) => {
              const isPast = idx < safeStageIdx;
              const isCurrent = idx === safeStageIdx;
              const isDoneOrActive = isPast || isCurrent;
              const activeColor = isCurrent ? theme.brass : theme.olive;

              return (
                <View key={st.key} style={styles.stepItemWrapper}>
                  <View
                    style={[
                      styles.stepCircle,
                      {
                        backgroundColor: isCurrent
                          ? theme.brass
                          : isPast
                          ? theme.olive
                          : theme.surface2,
                        borderColor: isDoneOrActive ? activeColor : theme.line,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13 }}>{st.icon}</Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isCurrent
                          ? theme.brass
                          : isPast
                          ? theme.olive
                          : theme.inkDim,
                        fontWeight: isCurrent ? '800' : '600',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {st.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Fulfillment Specifications Summary */}
          <View style={[styles.fulfillmentSpecsGrid, { backgroundColor: theme.surface2, borderColor: theme.line }]}>
            <View style={styles.fulfillmentSpecRow}>
              <Text style={[styles.specLabel, { color: theme.inkDim }]}>Commodity Spec</Text>
              <Text style={[styles.specValue, { color: theme.ink }]}>
                {rfq?.commodity || 'Standard'}{rfq?.grade ? ` (${rfq.grade})` : ''}
              </Text>
            </View>

            <View style={styles.fulfillmentSpecRow}>
              <Text style={[styles.specLabel, { color: theme.inkDim }]}>Order Volume</Text>
              <Text style={[styles.specValue, { color: theme.ink }]}>
                {quantity.toLocaleString()} {unit}
              </Text>
            </View>

            <View style={styles.fulfillmentSpecRow}>
              <Text style={[styles.specLabel, { color: theme.inkDim }]}>Agreed Unit Price</Text>
              <Text style={[styles.specValue, { color: theme.olive, fontWeight: '700' }]}>
                ₹{winnerAmount.toFixed(2)} / {unit}
              </Text>
            </View>

            <View style={styles.fulfillmentSpecRow}>
              <Text style={[styles.specLabel, { color: theme.brass, fontWeight: '700' }]}>Total PO Value</Text>
              <Text style={[styles.specValue, { color: theme.brass, fontWeight: '800' }]}>
                ₹{totalOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={styles.fulfillmentSpecRow}>
              <Text style={[styles.specLabel, { color: theme.inkDim }]}>Delivery Location</Text>
              <Text style={[styles.specValue, { color: theme.ink }]}>
                {rfq?.buyerLocation || rfq?.location || 'Designated Facility / As Agreed'}
              </Text>
            </View>

            <View style={styles.fulfillmentSpecRow}>
              <Text style={[styles.specLabel, { color: theme.inkDim }]}>Payment & Delivery</Text>
              <Text style={[styles.specValue, { color: theme.ink }]}>
                {rfq?.deliveryTerms || 'Standard Commercial Terms'}
              </Text>
            </View>
          </View>

          {/* Dynamic Next-Stage Fulfillment Action Button */}
          {updatingFulfillment ? (
            <ActivityIndicator size="small" color={theme.brass} style={{ paddingVertical: 8 }} />
          ) : (
            <View style={{ gap: 8 }}>
              {fulfillmentStatus === 'AWARDED' && (
                role === 'BUYER' || !role ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.fulfillmentActionBtn, { backgroundColor: theme.brass }]}
                    onPress={() => handleUpdateFulfillment('PO_ISSUED', 'Purchase Order Issued')}
                  >
                    <Text style={styles.fulfillmentActionBtnText}>📄 Issue & Confirm Purchase Order (PO)</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.infoBanner, { backgroundColor: 'rgba(217,131,36,0.1)', borderColor: theme.brass }]}>
                    <Text style={[styles.infoBannerText, { color: theme.brass }]}>
                      ⏳ Awaiting Buyer to generate and issue formal PO.
                    </Text>
                  </View>
                )
              )}

              {fulfillmentStatus === 'PO_ISSUED' && (
                role === 'SUPPLIER' || isMeWinner ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.fulfillmentActionBtn, { backgroundColor: theme.olive }]}
                    onPress={() => handleUpdateFulfillment('DISPATCHED', 'Consignment Dispatched')}
                  >
                    <Text style={styles.fulfillmentActionBtnText}>🚚 Mark Consignment Dispatched</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.infoBanner, { backgroundColor: 'rgba(95,107,69,0.1)', borderColor: theme.olive }]}>
                    <Text style={[styles.infoBannerText, { color: theme.olive }]}>
                      ⏳ PO issued. Awaiting supplier shipment & dispatch details.
                    </Text>
                  </View>
                )
              )}

              {fulfillmentStatus === 'DISPATCHED' && (
                role === 'BUYER' || !role ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.fulfillmentActionBtn, { backgroundColor: theme.olive }]}
                    onPress={() => handleUpdateFulfillment('DELIVERED', 'Delivered & Inspected')}
                  >
                    <Text style={styles.fulfillmentActionBtnText}>✅ Confirm Delivery & Inspection</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.infoBanner, { backgroundColor: 'rgba(95,107,69,0.1)', borderColor: theme.olive }]}>
                    <Text style={[styles.infoBannerText, { color: theme.olive }]}>
                      🚚 Consignment in transit to buyer delivery depot.
                    </Text>
                  </View>
                )
              )}

              {fulfillmentStatus === 'DELIVERED' && (
                <View style={[styles.infoBanner, { backgroundColor: 'rgba(95,107,69,0.18)', borderColor: theme.olive }]}>
                  <Text style={[styles.infoBannerText, { color: theme.olive, fontWeight: '700' }]}>
                    🎉 Order fulfilled & consignment verified successfully!
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Final Standings Card */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.standingsLabel, { color: theme.inkDim }]}>FINAL STANDINGS</Text>
        {standings.length === 0 ? (
          <View style={{ paddingVertical: 18, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: theme.inkDim }}>No bids placed in this auction.</Text>
          </View>
        ) : (
          standings.map((item, index) => (
            <View
              key={index}
              style={[
                styles.bidRow,
                { borderColor: item.isWinner ? theme.olive : theme.line },
                item.isWinner && { backgroundColor: 'rgba(95, 107, 69, 0.12)' },
              ]}
            >
              <Text style={[styles.suppName, { color: theme.ink }]}>{item.rank}</Text>
              <Text style={[styles.bidAmt, { color: item.isWinner ? theme.olive : theme.ink }]}>
                {item.amount}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBtnGroup}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.brass }]}
          activeOpacity={0.85}
          onPress={onBack}
        >
          <Text style={[styles.primaryBtnText, { color: theme.primaryText }]}>
            {role === 'SUPPLIER' ? 'Back to Live Floor' : 'Back to Requirements'}
          </Text>
        </TouchableOpacity>

        {onDelete && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: theme.rust, backgroundColor: 'rgba(180, 50, 50, 0.08)' }]}
            activeOpacity={0.85}
            onPress={handleDelete}
          >
            <Text style={[styles.deleteBtnText, { color: theme.rust }]}>
              🗑️ Delete requirement session
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    gap: 14,
    paddingBottom: 36,
  },
  winnerWrap: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  bigNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bigNum: {
    fontSize: 32,
    fontWeight: '800',
  },
  unitText: {
    fontSize: 15,
  },
  subText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  // Contact Card
  contactCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  contactBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  winnerName: {
    fontSize: 17,
    fontWeight: '700',
  },
  winnerCompany: {
    fontSize: 12.5,
    marginTop: 2,
  },
  winnerPhone: {
    fontSize: 12.5,
    marginTop: 2,
    fontWeight: '500',
  },
  priceTag: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  priceTagLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  priceTagValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  contactBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  callBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  whatsappBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  btnEmoji: {
    fontSize: 16,
  },

  // Standings Card
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  standingsLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 6,
  },
  suppName: {
    fontSize: 13,
    fontWeight: '600',
  },
  bidAmt: {
    fontSize: 14.5,
    fontWeight: 'bold',
  },

  // Bottom action buttons
  actionBtnGroup: {
    gap: 8,
    marginTop: 6,
  },
  primaryBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 13,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },

  // ── Fulfillment Card Styles ──────────────────────────────────────────────
  fulfillmentCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  fulfillmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  fulfillmentBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 3,
  },
  fulfillmentPoNum: {
    fontSize: 15,
    fontWeight: '700',
  },
  fulfillmentStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  fulfillmentStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  stepItemWrapper: {
    alignItems: 'center',
    flex: 1,
    gap: 5,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  fulfillmentSpecsGrid: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 7,
  },
  fulfillmentSpecRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  specValue: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'right',
  },
  fulfillmentActionBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fulfillmentActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  infoBanner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  infoBannerText: {
    fontSize: 12.5,
    textAlign: 'center',
  },
});
