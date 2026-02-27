import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useJob } from '../context/JobContext';
import { useTheme } from '../context/ThemeContext';
import { SERVICES } from '../constants';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 16px padding on sides, 16px gap

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
        <View style={styles.grid}>
          {SERVICES.map((service) => (
            <Card key={service.id} onPress={() => selectService(service.id, service.basePrice)} style={[styles.card, { width: cardWidth }]}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name={getIcon(service.id)} size={32} color={colors.primary} />
              </View>
              <Text style={[styles.serviceTitle, { color: colors.text }]} numberOfLines={1}>{service.title}</Text>
              <Text style={[styles.serviceDesc, { color: colors.textMuted }]} numberOfLines={2}>{service.description}</Text>
              <View style={styles.priceContainer}>
                <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Est.</Text>
                <Text style={[styles.priceValue, { color: colors.text }]}>${service.basePrice}</Text>
              </View>
            </Card>
          ))}
        </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  card: { padding: 16, alignItems: 'center', marginBottom: 0 },
  iconBox: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  serviceDesc: { fontSize: 12, textAlign: 'center', marginBottom: 16, minHeight: 30 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 'auto' },
  priceLabel: { fontSize: 12, fontWeight: 'bold', marginRight: 4 },
  priceValue: { fontSize: 18, fontWeight: 'bold' },
});
