import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { NotificationPreferences, ThemeOption } from '../types';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';

export const PreferencesScreen = () => {
  const { colors, themeOption, setThemeOption } = useTheme();
  
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const res = await api.get<NotificationPreferences>('/users/preferences');
      setPrefs(res.data);
    } catch (e) {
      console.warn('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs); 

    try {
      await api.put('/users/preferences', newPrefs);
    } catch (e) {
      setPrefs(prefs); 
      alert('Failed to save preference');
    }
  };

  const themes: { label: string, value: ThemeOption }[] = [
    { label: 'System Default', value: 'system' },
    { label: 'Light Theme', value: 'light' },
    { label: 'Dark Theme', value: 'dark' }
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
      <Card style={styles.card}>
        {themes.map((t, idx) => (
          <TouchableOpacity 
            key={t.value} 
            style={[styles.row, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
            onPress={() => setThemeOption(t.value)}
          >
            <Text style={[styles.rowText, { color: colors.text }]}>{t.label}</Text>
            {themeOption === t.value && (
              <Ionicons name="checkmark" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>NOTIFICATIONS</Text>
      <Card style={styles.card}>
        {loading || !prefs ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
        ) : (
          <>
            <View style={styles.prefRow}>
              <View style={styles.prefTextContainer}>
                <Text style={[styles.rowText, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.subText, { color: colors.textMuted }]}>Driver updates & alerts</Text>
              </View>
              <Switch 
                value={prefs.push} 
                onValueChange={(val) => updatePreference('push', val)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.prefTextContainer}>
                <Text style={[styles.rowText, { color: colors.text }]}>SMS Updates</Text>
                <Text style={[styles.subText, { color: colors.textMuted }]}>Text messages for live tracking</Text>
              </View>
              <Switch 
                value={prefs.sms} 
                onValueChange={(val) => updatePreference('sms', val)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.prefTextContainer}>
                <Text style={[styles.rowText, { color: colors.text }]}>Email Receipts</Text>
                <Text style={[styles.subText, { color: colors.textMuted }]}>Invoices after job completion</Text>
              </View>
              <Switch 
                value={prefs.emailReceipts} 
                onValueChange={(val) => updatePreference('emailReceipts', val)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.prefTextContainer}>
                <Text style={[styles.rowText, { color: colors.text }]}>Promotions</Text>
                <Text style={[styles.subText, { color: colors.textMuted }]}>Special offers and discounts</Text>
              </View>
              <Switch 
                value={prefs.promotions} 
                onValueChange={(val) => updatePreference('promotions', val)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </>
        )}
      </Card>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { padding: 0, marginBottom: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  rowText: { fontSize: 16, fontWeight: '500' },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  prefTextContainer: { flex: 1, paddingRight: 16 },
  subText: { fontSize: 12, marginTop: 4 },
});
