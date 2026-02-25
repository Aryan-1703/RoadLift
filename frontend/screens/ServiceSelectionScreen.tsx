import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useJob } from '../context/JobContext';
import { useTheme } from '../context/ThemeContext';
import { SERVICES } from '../constants';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';

export const ServiceSelectionScreen = () => {
  const { setJobStatus, selectService } = useJob();
  const { colors } = useTheme();

  // Map service ID to Ionicons
  const getIcon = (id: string) => {
    switch(id) {
      case 'towing': return 'car';
      case 'tire': return 'disc';
      case 'lockout': return 'key';
      case 'fuel': return 'water';
      case 'accident': return 'warning';
      default: return 'build';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setJobStatus('idle')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Select Service</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>What do you need help with?</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {SERVICES.map((service) => (
          <Card key={service.id} onPress={() => selectService(service.id, service.basePrice)} style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name={getIcon(service.id)} size={24} color={colors.primary} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.serviceTitle, { color: colors.text }]}>{service.title}</Text>
              <Text style={[styles.serviceDesc, { color: colors.textMuted }]}>{service.description}</Text>
            </View>
            <View style={styles.price}>
              <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Est. base</Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>${service.basePrice}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingBottom: 20, borderBottomWidth: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  info: { flex: 1 },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  serviceDesc: { fontSize: 12 },
  price: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  priceValue: { fontSize: 16, fontWeight: 'bold' },
});
