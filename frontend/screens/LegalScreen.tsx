import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';

export const LegalScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await api.post('/users/export-data');
      alert('Data export started. Check your email.');
    } catch (e) {
      alert('Failed to request export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>POLICIES</Text>
        <Card style={styles.card}>
          <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.rowText, { color: colors.text }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={[styles.rowText, { color: colors.text }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 24 }]}>YOUR DATA</Text>
        <Card style={[styles.card, { padding: 16 }]}>
          <Text style={[styles.desc, { color: colors.textMuted }]}>
            Get a copy of your RoadLift data. We'll email you a link to download your account information, service history, and preferences.
          </Text>
          <PrimaryButton 
            title="Request Data Export" 
            variant="secondary" 
            onPress={handleExport} 
            isLoading={isExporting} 
          />
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
  card: { padding: 0, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  rowText: { fontSize: 16, fontWeight: '500' },
  desc: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
});
