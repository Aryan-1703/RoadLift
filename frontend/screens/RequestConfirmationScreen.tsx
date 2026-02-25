import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { useJob } from '../context/JobContext';
import { useTheme } from '../context/ThemeContext';
import { SERVICES } from '../constants';
import { PrimaryButton } from '../components/PrimaryButton';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';

export const RequestConfirmationScreen = () => {
  const { job, setJobStatus, setNotes, requestService } = useJob();
  const { colors } = useTheme();
  const [localNotes, setLocalNotes] = useState(job.notes || '');

  const service = SERVICES.find(s => s.id === job.serviceType);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setJobStatus('selecting')}>
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
          
          <View style={styles.locationRow}>
            <Ionicons name="location" size={20} color={colors.textMuted} style={styles.locIcon} />
            <Text style={[styles.locationText, { color: colors.text }]}>{job.customerLocation?.address}</Text>
          </View>
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
          />
        </Card>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          By confirming, you agree to the estimated base price. Final price may vary based on actual services rendered.
        </Text>
        <PrimaryButton 
          title="Confirm Request"
          onPress={() => { setNotes(localNotes); requestService(); }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingBottom: 20, borderBottomWidth: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backText: { fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold' },
  content: { padding: 16 },
  card: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 12 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 16 },
  serviceLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  serviceName: { fontSize: 18, fontWeight: 'bold' },
  price: { fontSize: 18, fontWeight: 'bold' },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locIcon: { marginRight: 12 },
  locationText: { flex: 1, fontSize: 14, lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
  footer: { padding: 16, borderTopWidth: 1 },
  disclaimer: { fontSize: 12, textAlign: 'center', marginBottom: 16, lineHeight: 18 }
});
