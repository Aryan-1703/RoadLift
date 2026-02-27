import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl } from 'react-native';
import { useDriver } from '../context/DriverContext';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../components/PrimaryButton';
import { useNavigation } from '@react-navigation/native';

export const DriverDashboardScreen = () => {
  const { isOnline, goOnline, goOffline, availableJobs, fetchAvailableJobs, acceptJob, earnings, fetchEarnings } = useDriver();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAvailableJobs();
    await fetchEarnings();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isOnline ? 'You are online and visible' : 'You are offline'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('SettingsNav')} style={[styles.settingsBtn, { backgroundColor: colors.background }]}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Status Toggle */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10B981' : '#9CA3AF' }]} />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleBtn, { backgroundColor: isOnline ? '#FEE2E2' : '#D1FAE5' }]}
              onPress={isOnline ? goOffline : goOnline}
            >
              <Text style={[styles.toggleText, { color: isOnline ? '#DC2626' : '#059669' }]}>
                {isOnline ? 'Go Offline' : 'Go Online'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Earnings Summary */}
        <View style={styles.earningsGrid}>
          <Card style={styles.earningsCard}>
            <Text style={[styles.earningsLabel, { color: colors.textMuted }]}>TODAY'S EARNINGS</Text>
            <Text style={[styles.earningsValue, { color: colors.text }]}>${earnings.today.toFixed(2)}</Text>
          </Card>
          <Card style={styles.earningsCard}>
            <Text style={[styles.earningsLabel, { color: colors.textMuted }]}>COMPLETED</Text>
            <Text style={[styles.earningsValue, { color: colors.text }]}>{earnings.completedJobs.length}</Text>
          </Card>
        </View>

        {/* Available Jobs */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Requests</Text>
        
        {!isOnline ? (
          <View style={styles.emptyState}>
            <Ionicons name="moon-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Go online to see available requests.</Text>
          </View>
        ) : availableJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No requests in your area right now.</Text>
          </View>
        ) : (
          availableJobs.map(job => (
            <Card key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={[styles.serviceBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.serviceText, { color: colors.primary }]}>{job.serviceType}</Text>
                </View>
                <Text style={[styles.jobPrice, { color: colors.primary }]}>${job.estimatedPrice}</Text>
              </View>
              
              <View style={styles.jobRow}>
                <Ionicons name="location-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.jobAddress, { color: colors.text }]} numberOfLines={2}>
                  {job.customerLocation?.address || 'Unknown Location'}
                </Text>
              </View>

              <PrimaryButton 
                title="Accept Request" 
                onPress={() => acceptJob(job.id!)} 
                style={styles.acceptBtn}
              />
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 20, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 4 },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  statusCard: { marginBottom: 16, padding: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  statusText: { fontSize: 18, fontWeight: 'bold' },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  toggleText: { fontSize: 14, fontWeight: 'bold' },
  earningsGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  earningsCard: { flex: 1, padding: 16, alignItems: 'center' },
  earningsLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  earningsValue: { fontSize: 24, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { marginTop: 16, fontSize: 16, textAlign: 'center' },
  jobCard: { marginBottom: 16, padding: 16 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  serviceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  serviceText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  jobPrice: { fontSize: 20, fontWeight: 'bold' },
  jobRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  jobAddress: { flex: 1, marginLeft: 12, fontSize: 14, lineHeight: 20 },
  acceptBtn: { marginTop: 0 }
});
