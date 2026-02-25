import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useJob } from '../context/JobContext';
import { useTheme } from '../context/ThemeContext';
import { MockMap } from '../components/MockMap';
import { PrimaryButton } from '../components/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';

export const LiveTrackingScreen = () => {
  const { job, providerLocation, eta, cancelJob } = useJob();
  const { colors } = useTheme();

  if (job.status === 'searching') {
    return (
      <SafeAreaView style={[styles.searchingContainer, { backgroundColor: colors.background }]}>
        <View style={styles.searchingContent}>
          <ActivityIndicator size="large" color={colors.primary} style={{ transform: [{ scale: 2 }], marginBottom: 40 }} />
          <Text style={[styles.searchingTitle, { color: colors.text }]}>Finding a Provider</Text>
          <Text style={[styles.searchingDesc, { color: colors.textMuted }]}>We're locating the nearest available truck in the GTA for you.</Text>
        </View>
        <View style={styles.cancelWrap}>
          <PrimaryButton title="Cancel Request" variant="danger" onPress={cancelJob} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeTop}>
        <View style={[styles.topBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bannerTitle, { color: colors.textMuted }]}>PROVIDER EN ROUTE</Text>
          <View style={styles.bannerRow}>
            <View>
              <Text style={[styles.etaText, { color: colors.primary }]}>{eta ? `${eta} min` : '--'}</Text>
              <Text style={[styles.etaLabel, { color: colors.text }]}>Estimated Arrival</Text>
            </View>
            <View style={[styles.vehicleBadge, { backgroundColor: colors.background }]}>
              <Text style={[styles.vehicleText, { color: colors.text }]}>{job.provider?.vehicle}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <MockMap userLocation={job.customerLocation} providerLocation={providerLocation} style={styles.map} />

      <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
        <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
        
        <View style={styles.providerRow}>
          <View style={[styles.avatar, { borderColor: colors.background }]}>
            <Ionicons name="person" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.providerInfo}>
            <Text style={[styles.providerName, { color: colors.text }]}>{job.provider?.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={[styles.ratingText, { color: colors.textMuted }]}> {job.provider?.rating} Rating</Text>
            </View>
          </View>
          <View style={[styles.callBtn, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="call" size={20} color={colors.primary} />
          </View>
        </View>

        <PrimaryButton title="Cancel Request" variant="secondary" onPress={cancelJob} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchingContainer: { flex: 1, justifyContent: 'space-between' },
  searchingContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  searchingTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  searchingDesc: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  cancelWrap: { padding: 24 },
  container: { flex: 1 },
  map: { flex: 1 },
  safeTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 16, paddingTop: 16 },
  topBanner: { padding: 16, borderRadius: 16, borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  bannerTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 8 },
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  etaText: { fontSize: 32, fontWeight: '900' },
  etaLabel: { fontSize: 12, fontWeight: 'bold' },
  vehicleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  vehicleText: { fontSize: 10, fontWeight: 'bold' },
  bottomSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5E7EB', borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 14, fontWeight: 'bold' },
  callBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }
});
