import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, Platform, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useJob } from '../context/JobContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { SERVICES } from '../constants';
import { PrimaryButton } from '../components/PrimaryButton';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { PaymentMethod } from '../types';
import { usePlatformPay, PlatformPay } from '@stripe/stripe-react-native';

type PaymentMode = 'card' | 'apple_pay';

export const RequestConfirmationScreen = () => {
  const { job, setJobStatus, setNotes, requestService } = useJob();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const navigation = useNavigation<any>();

  const [localNotes, setLocalNotes]       = useState(job.notes || '');
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [isLoadingCard, setIsLoadingCard] = useState(true);

  const [allCards, setAllCards]           = useState<PaymentMethod[]>([]);
  const [selectedCard, setSelectedCard]   = useState<PaymentMethod | null>(null);
  const [paymentMode, setPaymentMode]     = useState<PaymentMode>('card');
  const [showPicker, setShowPicker]       = useState(false);

  // Stores the paymentIntentId created before Apple Pay sheet opens
  const applePayIntentIdRef  = useRef<string | null>(null);
  const estimatedCostRef     = useRef<number | null>(null);
  const [applePaySupported, setApplePaySupported] = useState(false);

  const service = SERVICES.find(s => s.id === job.serviceType);

  useEffect(() => {
    estimatedCostRef.current = job.estimatedPrice ?? null;
  }, [job.estimatedPrice]);

  // ── Platform Pay (Apple Pay on iOS) ────────────────────────────────────────
  const { isPlatformPaySupported, confirmPlatformPayPayment } = usePlatformPay();

  useEffect(() => {
    isPlatformPaySupported().then(supported => setApplePaySupported(supported));
  }, [isPlatformPaySupported]);

  // ── Load saved cards ───────────────────────────────────────────────────────
  useEffect(() => {
    api.get<PaymentMethod[]>('/payments/methods')
      .then(res => {
        const methods = Array.isArray(res.data) ? res.data : [];
        setAllCards(methods);
        const def = methods.find(m => m.isDefault) ?? methods[0] ?? null;
        setSelectedCard(def);
      })
      .catch(() => {})
      .finally(() => setIsLoadingCard(false));
  }, []);

  // Default to Apple Pay on iOS when no cards saved
  useEffect(() => {
    if (Platform.OS === 'ios' && applePaySupported && !isLoadingCard && allCards.length === 0) {
      setPaymentMode('apple_pay');
    }
  }, [applePaySupported, isLoadingCard, allCards.length]);

  // ── Confirm ────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setIsSubmitting(true);
    setNotes(localNotes);

    try {
      if (paymentMode === 'apple_pay') {
        // 1. Create a manual-capture PI on backend
        const preAuthRes = await api.post('/payments/apple-pay-pre-auth', {
          estimatedCost: estimatedCostRef.current,
        });
        const { clientSecret, paymentIntentId } = preAuthRes.data;
        applePayIntentIdRef.current = paymentIntentId;

        // 2. Present Apple Pay sheet and confirm the PI in one call
        //    On success the PI enters requires_capture (hold placed, no charge yet)
        const { error: applePayErr } = await confirmPlatformPayPayment(clientSecret, {
          applePay: {
            cartItems: [{
              paymentType: PlatformPay.PaymentType.Immediate,
              label:       service?.title ?? 'Roadside Service',
              amount:      String(estimatedCostRef.current ?? 0),
            }],
            merchantCountryCode: 'CA',
            currencyCode:        'CAD',
          },
        });
        if (applePayErr) {
          showToast(applePayErr.message, 'error');
          return;
        }

        // 3. Create job, skip off-session auth (PI already authorized via Apple Pay)
        await requestService(paymentIntentId);

      } else {
        if (!selectedCard) {
          showToast('Please add a payment method before requesting service.', 'error');
          return;
        }
        await requestService();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error   ||
        err.message                 ||
        'Failed to request service';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Payment row ────────────────────────────────────────────────────────────
  const renderPaymentRow = () => {
    if (isLoadingCard) {
      return (
        <View style={styles.cardRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.cardText, { color: colors.textMuted, marginLeft: 12, flex: 1 }]}>
            Loading payment method…
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.cardRow}
        onPress={() => setShowPicker(true)}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        {paymentMode === 'apple_pay' ? (
          <>
            <Ionicons name="logo-apple" size={20} color={colors.text} />
            <Text style={[styles.cardText, { color: colors.text, marginLeft: 12, flex: 1 }]}>
              Apple Pay
            </Text>
          </>
        ) : selectedCard ? (
          <>
            <Ionicons name="card" size={20} color={colors.green} />
            <Text style={[styles.cardText, { color: colors.text, marginLeft: 12, flex: 1 }]}>
              {selectedCard.brand.charAt(0).toUpperCase() + selectedCard.brand.slice(1)} •••• {selectedCard.last4} will be held
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={[styles.cardText, { color: colors.danger, marginLeft: 12, flex: 1 }]}>
              No payment method on file
            </Text>
          </>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  // ── Payment picker bottom sheet ────────────────────────────────────────────
  const renderPicker = () => (
    <Modal
      visible={showPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPicker(false)}
    >
      <Pressable style={styles.overlay} onPress={() => setShowPicker(false)} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.text }]}>Payment Method</Text>

        {/* Apple Pay — iOS only */}
        {Platform.OS === 'ios' && applePaySupported && (
          <TouchableOpacity
            style={[
              styles.option,
              { borderColor: colors.border },
              paymentMode === 'apple_pay' && { backgroundColor: colors.primary + '12' },
            ]}
            onPress={() => { setPaymentMode('apple_pay'); setShowPicker(false); }}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.text + '15' }]}>
              <Ionicons name="logo-apple" size={18} color={colors.text} />
            </View>
            <Text style={[styles.optionLabel, { color: colors.text, flex: 1 }]}>Apple Pay</Text>
            {paymentMode === 'apple_pay' && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}

        {/* Saved cards */}
        {allCards.map(card => {
          const isSelected = paymentMode === 'card' && selectedCard?.id === card.id;
          const brand = card.brand.charAt(0).toUpperCase() + card.brand.slice(1);
          return (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.option,
                { borderColor: colors.border },
                isSelected && { backgroundColor: colors.primary + '12' },
              ]}
              onPress={() => { setPaymentMode('card'); setSelectedCard(card); setShowPicker(false); }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="card" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>
                  {brand} •••• {card.last4}
                </Text>
                <Text style={[styles.optionSub, { color: colors.textMuted }]}>
                  Expires {card.expMonth}/{card.expYear}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Add card */}
        <TouchableOpacity
          style={[styles.option, styles.optionLast, { borderColor: colors.border }]}
          onPress={() => {
            setShowPicker(false);
            navigation.navigate('SettingsNav', { screen: 'PaymentMethods' });
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.green + '20' }]}>
            <Ionicons name="add" size={20} color={colors.green} />
          </View>
          <Text style={[styles.optionLabel, { color: colors.green, flex: 1 }]}>Add Card</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  const isConfirmDisabled =
    isSubmitting ||
    isLoadingCard ||
    (paymentMode === 'card' && !selectedCard);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setJobStatus('selecting')} disabled={isSubmitting}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Confirm Request</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SERVICE DETAILS</Text>
          <View style={[styles.serviceRow, { borderBottomColor: colors.border }]}>
            <View style={styles.serviceLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="car" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.serviceName, { color: colors.text }]}>{service?.title}</Text>
            </View>
            <Text style={[styles.price, { color: colors.primary }]}>${job.estimatedPrice}</Text>
          </View>

          <View style={[styles.locationRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="location" size={20} color={colors.textMuted} style={styles.locIcon} />
            <Text style={[styles.locationText, { color: colors.text }]}>{job.customerLocation?.address}</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 14, marginBottom: 6 }]}>
            PAYMENT
          </Text>
          {renderPaymentRow()}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 8 }]}>NOTE FOR PROVIDER (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            multiline
            numberOfLines={4}
            placeholder="E.g., Parked in the underground garage, level P2..."
            placeholderTextColor={colors.textMuted}
            value={localNotes}
            onChangeText={setLocalNotes}
            editable={!isSubmitting}
          />
        </Card>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          A hold will be placed on your payment method now. You will only be charged when the service is complete.
        </Text>
        <PrimaryButton
          title={paymentMode === 'apple_pay' ? 'Confirm with Apple Pay' : 'Confirm Request'}
          onPress={handleConfirm}
          isLoading={isSubmitting}
          disabled={isConfirmDisabled}
        />
      </View>

      {renderPicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { padding: 16, paddingBottom: 20, borderBottomWidth: 1 },
  backBtn:      { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backText:     { fontSize: 16, fontWeight: 'bold' },
  title:        { fontSize: 24, fontWeight: 'bold' },
  content:      { padding: 16 },
  card:         { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 12 },
  serviceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 16 },
  serviceLeft:  { flexDirection: 'row', alignItems: 'center' },
  iconBox:      { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  serviceName:  { fontSize: 18, fontWeight: 'bold' },
  price:        { fontSize: 18, fontWeight: 'bold' },
  locationRow:  { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, marginBottom: 4 },
  locIcon:      { marginRight: 12 },
  locationText: { flex: 1, fontSize: 14, lineHeight: 20 },
  cardRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  cardText:     { fontSize: 14, fontWeight: '600' },
  input:        { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
  footer:       { padding: 16, borderTopWidth: 1 },
  disclaimer:   { fontSize: 12, textAlign: 'center', marginBottom: 16, lineHeight: 18 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18, fontWeight: '700', marginBottom: 16,
  },
  option: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 16, fontWeight: '600',
  },
  optionSub: {
    fontSize: 12, marginTop: 2,
  },
});
