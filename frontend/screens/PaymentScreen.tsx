import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useJob } from '../context/JobContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { PrimaryButton } from '../components/PrimaryButton';
import { Card } from '../components/Card';
import { SERVICES } from '../constants';
import { Ionicons } from '@expo/vector-icons';

export const PaymentScreen = () => {
  const { job, setJobStatus } = useJob();
  const { colors } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const service = SERVICES.find(s => s.id === job.serviceType);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError('');
    try {
      await api.post('/payment/charge', { amount: job.finalPrice });
      setJobStatus('rating');
    } catch (err: any) {
      setError('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Job Completed</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your provider has finished the service.</Text>
        </View>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted, borderBottomColor: colors.border }]}>RECEIPT SUMMARY</Text>
          
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: colors.text }]}>{service?.title} (Base)</Text>
            <Text style={[styles.rowText, { color: colors.text }]}>${job.estimatedPrice?.toFixed(2)}</Text>
          </View>
          
          {job.finalPrice && job.finalPrice > (job.estimatedPrice || 0) && (
            <View style={styles.row}>
              <Text style={[styles.rowText, { color: colors.text }]}>Additional Labor/Parts</Text>
              <Text style={[styles.rowText, { color: colors.text }]}>${(job.finalPrice - (job.estimatedPrice || 0)).toFixed(2)}</Text>
            </View>
          )}
          
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: colors.text }]}>Taxes & Fees</Text>
            <Text style={[styles.rowText, { color: colors.text }]}>${((job.finalPrice || 0) * 0.13).toFixed(2)}</Text>
          </View>
          
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Due</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>${((job.finalPrice || 0) * 1.13).toFixed(2)}</Text>
          </View>
        </Card>

        <Card style={styles.paymentCard}>
          <View style={styles.ccIcon}>
            <Text style={styles.ccText}>VISA</Text>
          </View>
          <View style={styles.ccInfo}>
            <Text style={[styles.ccNumber, { color: colors.text }]}>•••• •••• •••• 4242</Text>
            <Text style={[styles.ccDesc, { color: colors.textMuted }]}>Default Payment Method</Text>
          </View>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <PrimaryButton 
          title={isProcessing ? "Processing..." : "Pay & Complete"} 
          onPress={handlePayment} 
          isLoading={isProcessing} 
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  iconBox: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16 },
  card: { padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rowText: { fontSize: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 16, borderTopWidth: 1 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 24, fontWeight: '900' },
  paymentCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  ccIcon: { backgroundColor: '#1E3A8A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 16 },
  ccText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', fontStyle: 'italic' },
  ccInfo: { flex: 1 },
  ccNumber: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  ccDesc: { fontSize: 12 },
  error: { color: '#DC2626', textAlign: 'center', marginTop: 16 },
  footer: { padding: 16, paddingBottom: 32 }
});
