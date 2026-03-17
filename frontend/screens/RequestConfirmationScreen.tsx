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
import { useAuth } from '../context/AuthContext';
import { SERVICES } from '../constants';
import { PrimaryButton } from '../components/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { PaymentMethod } from '../types';
import { usePlatformPay, PlatformPay } from '@stripe/stripe-react-native';

// Service-specific icon + colour config (mirrors ServiceSelectionScreen)
const SERVICE_META: Record<string, {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  dark:  { iconColor: string; iconBg: string };
  light: { iconColor: string; iconBg: string };
}> = {
  towing:           { icon: 'car',          dark: { iconColor: '#60a5fa', iconBg: '#1e3a5f' }, light: { iconColor: '#1A6BFF', iconBg: '#DBEAFE' } },
  'tire-change':    { icon: 'disc-outline', dark: { iconColor: '#f59e0b', iconBg: '#451a03' }, light: { iconColor: '#B87000', iconBg: '#FEF3C7' } },
  'car-lockout':    { icon: 'key-outline',  dark: { iconColor: '#a78bfa', iconBg: '#2e1065' }, light: { iconColor: '#7C3AED', iconBg: '#EDE9FE' } },
  'fuel-delivery':  { icon: 'water-outline',dark: { iconColor: '#34d399', iconBg: '#064e3b' }, light: { iconColor: '#0B7B56', iconBg: '#D1FAE5' } },
  'battery-boost':  { icon: 'flash-outline',dark: { iconColor: '#fb7185', iconBg: '#4c0519' }, light: { iconColor: '#D93025', iconBg: '#FFE4E6' } },
};

type PaymentMode = 'card' | 'apple_pay';

interface VehicleItem {
  id: string | number;
  make: string;
  model: string;
  year: number | string;
  color?: string;
  licensePlate?: string;
}

export const RequestConfirmationScreen = () => {
  const { job, setJobStatus, setNotes, requestService } = useJob();
  const { colors, isDarkMode } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [localNotes, setLocalNotes]       = useState(job.notes || '');
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [isLoadingCard, setIsLoadingCard] = useState(true);

  // ── Payment state ──────────────────────────────────────────────────────────
  const [allCards, setAllCards]           = useState<PaymentMethod[]>([]);
  const [selectedCard, setSelectedCard]   = useState<PaymentMethod | null>(null);
  const [paymentMode, setPaymentMode]     = useState<PaymentMode>(Platform.OS === 'ios' ? 'apple_pay' : 'card');
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);

  // ── Vehicle state ──────────────────────────────────────────────────────────
  const [allVehicles, setAllVehicles]         = useState<VehicleItem[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

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

  // ── Load vehicles ──────────────────────────────────────────────────────────
  useEffect(() => {
    api.get<VehicleItem[]>('/vehicles')
      .then(res => {
        const vehicles = Array.isArray(res.data) ? res.data : [];
        setAllVehicles(vehicles);
        // Default to user's default vehicle, else first in list
        const def = vehicles.find(v => String(v.id) === String(user?.defaultVehicleId))
          ?? vehicles[0]
          ?? null;
        setSelectedVehicle(def);
      })
      .catch(() => {})
      .finally(() => setIsLoadingVehicles(false));
  }, [user?.defaultVehicleId]);

  // Default to Apple Pay on iOS whenever it's supported
  useEffect(() => {
    if (Platform.OS === 'ios' && applePaySupported) {
      setPaymentMode('apple_pay');
    }
  }, [applePaySupported]);

  // ── Confirm ────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setIsSubmitting(true);
    setNotes(localNotes);

    try {
      if (paymentMode === 'apple_pay') {
        const preAuthRes = await api.post<{ clientSecret: string; paymentIntentId: string }>('/payments/apple-pay-pre-auth', {
          estimatedCost: estimatedCostRef.current,
        });
        const { clientSecret, paymentIntentId } = preAuthRes.data;
        applePayIntentIdRef.current = paymentIntentId;

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

        await requestService(paymentIntentId, selectedVehicle?.id ?? null);

      } else {
        if (!selectedCard) {
          showToast('Please add a payment method before requesting service.', 'error');
          return;
        }
        await requestService(undefined, selectedVehicle?.id ?? null);
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
        <View style={styles.selectorRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.selectorText, { color: colors.textMuted, marginLeft: 12, flex: 1 }]}>
            Loading payment method…
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.selectorRow}
        onPress={() => setShowPaymentPicker(true)}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        {paymentMode === 'apple_pay' ? (
          <>
            <Ionicons name="logo-apple" size={20} color={colors.text} />
            <Text style={[styles.selectorText, { color: colors.text, marginLeft: 12, flex: 1 }]}>
              Apple Pay
            </Text>
          </>
        ) : selectedCard ? (
          <>
            <Ionicons name="card" size={20} color={colors.green} />
            <Text style={[styles.selectorText, { color: colors.text, marginLeft: 12, flex: 1 }]}>
              {selectedCard.brand.charAt(0).toUpperCase() + selectedCard.brand.slice(1)} •••• {selectedCard.last4}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={[styles.selectorText, { color: colors.danger, marginLeft: 12, flex: 1 }]}>
              No payment method on file
            </Text>
          </>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  // ── Vehicle row ────────────────────────────────────────────────────────────
  const renderVehicleRow = () => {
    if (isLoadingVehicles) {
      return (
        <View style={styles.selectorRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.selectorText, { color: colors.textMuted, marginLeft: 12, flex: 1 }]}>
            Loading vehicles…
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.selectorRow}
        onPress={() => setShowVehiclePicker(true)}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        {selectedVehicle ? (
          <>
            <Ionicons name="car-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.selectorText, { color: colors.text }]}>
                {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
              </Text>
              {selectedVehicle.licensePlate ? (
                <Text style={[styles.selectorSub, { color: colors.textMuted }]}>
                  {selectedVehicle.licensePlate}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <>
            <Ionicons name="car-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.selectorText, { color: colors.textMuted, marginLeft: 12, flex: 1 }]}>
              No vehicle selected
            </Text>
          </>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  // ── Payment picker modal ───────────────────────────────────────────────────
  const renderPaymentPicker = () => (
    <Modal
      visible={showPaymentPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPaymentPicker(false)}
    >
      <Pressable style={styles.overlay} onPress={() => setShowPaymentPicker(false)} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.text }]}>Payment Method</Text>

        {Platform.OS === 'ios' && applePaySupported && (
          <TouchableOpacity
            style={[styles.option, { borderColor: colors.border }, paymentMode === 'apple_pay' && { backgroundColor: colors.primary + '12' }]}
            onPress={() => { setPaymentMode('apple_pay'); setShowPaymentPicker(false); }}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.text + '15' }]}>
              <Ionicons name="logo-apple" size={18} color={colors.text} />
            </View>
            <Text style={[styles.optionLabel, { color: colors.text, flex: 1 }]}>Apple Pay</Text>
            {paymentMode === 'apple_pay' && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
          </TouchableOpacity>
        )}

        {allCards.map(card => {
          const isSelected = paymentMode === 'card' && selectedCard?.id === card.id;
          const brand = card.brand.charAt(0).toUpperCase() + card.brand.slice(1);
          return (
            <TouchableOpacity
              key={card.id}
              style={[styles.option, { borderColor: colors.border }, isSelected && { backgroundColor: colors.primary + '12' }]}
              onPress={() => { setPaymentMode('card'); setSelectedCard(card); setShowPaymentPicker(false); }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="card" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>{brand} •••• {card.last4}</Text>
                <Text style={[styles.optionSub, { color: colors.textMuted }]}>Expires {card.expMonth}/{card.expYear}</Text>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.option, styles.optionLast, { borderColor: colors.border }]}
          onPress={() => { setShowPaymentPicker(false); navigation.navigate('SettingsNav', { screen: 'PaymentMethods' }); }}
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

  // ── Vehicle picker modal ───────────────────────────────────────────────────
  const renderVehiclePicker = () => (
    <Modal
      visible={showVehiclePicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowVehiclePicker(false)}
    >
      <Pressable style={styles.overlay} onPress={() => setShowVehiclePicker(false)} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Vehicle</Text>

        {allVehicles.length === 0 ? (
          <View style={styles.emptyVehicle}>
            <Ionicons name="car-outline" size={36} color={colors.textMuted} />
            <Text style={[styles.optionSub, { color: colors.textMuted, textAlign: 'center', marginTop: 8 }]}>
              No vehicles saved yet.{'\n'}Add one from your profile.
            </Text>
          </View>
        ) : (
          allVehicles.map((vehicle, idx) => {
            const isSelected = String(selectedVehicle?.id) === String(vehicle.id);
            return (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.option,
                  { borderColor: colors.border },
                  idx === allVehicles.length - 1 && { borderBottomWidth: 0 },
                  isSelected && { backgroundColor: colors.primary + '12' },
                ]}
                onPress={() => { setSelectedVehicle(vehicle); setShowVehiclePicker(false); }}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="car-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Text>
                  {(vehicle.color || vehicle.licensePlate) && (
                    <Text style={[styles.optionSub, { color: colors.textMuted }]}>
                      {[vehicle.color, vehicle.licensePlate].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </TouchableOpacity>
            );
          })
        )}

        {/* Add vehicle shortcut */}
        <TouchableOpacity
          style={[styles.option, styles.optionLast, { borderColor: colors.border }]}
          onPress={() => { setShowVehiclePicker(false); navigation.navigate('SettingsNav', { screen: 'ManageVehicles' }); }}
          activeOpacity={0.7}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.green + '20' }]}>
            <Ionicons name="add" size={20} color={colors.green} />
          </View>
          <Text style={[styles.optionLabel, { color: colors.green, flex: 1 }]}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  const isConfirmDisabled =
    isSubmitting ||
    isLoadingCard ||
    (paymentMode === 'card' && !selectedCard);

  const isDark = isDarkMode ?? false;
  const cardBg     = isDark ? '#0d1424' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : '#E2DDD6';
  const inputBg    = isDark ? '#0a1020' : '#F7F4EF';
  const inputBorder = isDark ? 'rgba(255,255,255,0.10)' : '#D4CFC8';
  const svcMeta    = SERVICE_META[job.serviceType ?? 'towing'] ?? SERVICE_META['towing'];
  const svcTheme   = isDark ? svcMeta.dark : svcMeta.light;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: cardBorder, backgroundColor: cardBg }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setJobStatus('selecting')}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <View style={[styles.backIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EDE9E2' }]}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Confirm Request</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Review and confirm your service</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Service details card ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SERVICE DETAILS</Text>

          <View style={[styles.serviceRow, { borderBottomColor: cardBorder }]}>
            <View style={styles.serviceLeft}>
              <View style={[styles.iconBox, { backgroundColor: svcTheme.iconBg }]}>
                <Ionicons name={svcMeta.icon} size={20} color={svcTheme.iconColor} />
              </View>
              <Text style={[styles.serviceName, { color: colors.text }]}>{service?.title}</Text>
            </View>
            <Text style={[styles.price, { color: colors.primary }]}>${job.estimatedPrice}</Text>
          </View>

          <View style={[styles.locationRow, { borderBottomColor: cardBorder }]}>
            <View style={[styles.locationIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            </View>
            <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={2}>
              {job.customerLocation?.address}
            </Text>
          </View>

          {/* Vehicle selector */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>VEHICLE</Text>
          <View style={[styles.selectorBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            {renderVehicleRow()}
          </View>

          {/* Payment selector */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 14 }]}>PAYMENT</Text>
          <View style={[styles.selectorBox, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            {renderPaymentRow()}
          </View>
        </View>

        {/* ── Notes card ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>NOTE FOR PROVIDER (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: inputBorder }]}
            multiline
            numberOfLines={4}
            placeholder="E.g., Parked in the underground garage, level P2..."
            placeholderTextColor={colors.textMuted}
            value={localNotes}
            onChangeText={setLocalNotes}
            editable={!isSubmitting}
          />
        </View>
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

      {renderPaymentPicker()}
      {renderVehiclePicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn:       { marginRight: 14 },
  backIconWrap:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerText:    { flex: 1 },
  headerTitle:   { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  headerSubtitle:{ fontSize: 13, marginTop: 2 },

  // Content
  content: { padding: 16, paddingBottom: 24 },

  // Cards
  card: {
    borderRadius: 24, borderWidth: 1,
    padding: 18, marginBottom: 14,
  },

  // Section label (UPPERCASE)
  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
    marginBottom: 10,
  },

  // Service row
  serviceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, marginBottom: 14 },
  serviceLeft:  { flexDirection: 'row', alignItems: 'center' },
  iconBox:      { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  serviceName:  { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  price:        { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },

  // Location row
  locationRow:     { flexDirection: 'row', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, marginBottom: 4, gap: 10 },
  locationIconWrap:{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  locationText:    { flex: 1, fontSize: 13, lineHeight: 19 },

  // Selector box (wraps the vehicle / payment rows)
  selectorBox:  { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 2 },
  selectorRow:  { flexDirection: 'row', alignItems: 'center' },
  selectorText: { fontSize: 14, fontWeight: '600' },
  selectorSub:  { fontSize: 12, marginTop: 1 },

  // Notes input
  input: { borderWidth: 1.5, borderRadius: 14, padding: 14, fontSize: 14, minHeight: 96, textAlignVertical: 'top' },

  // Footer
  footer:     { padding: 16, paddingBottom: 20, borderTopWidth: 1 },
  disclaimer: { fontSize: 12, textAlign: 'center', marginBottom: 14, lineHeight: 18 },

  // Bottom sheet (modals)
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, paddingHorizontal: 20, paddingBottom: 36,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  option: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  optionLast: { borderBottomWidth: 0 },
  optionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 16, fontWeight: '600' },
  optionSub:   { fontSize: 12, marginTop: 2 },
  emptyVehicle:{ alignItems: 'center', paddingVertical: 24 },
});
