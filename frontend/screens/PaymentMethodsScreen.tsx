import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { PaymentMethod } from '../types';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';

export const PaymentMethodsScreen = () => {
  const { colors } = useTheme();
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const res = await api.get<PaymentMethod[]>('/users/payments');
      setPayments(res.data);
    } catch (e) {
      console.warn('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: PaymentMethod }) => (
    <Card style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardInfo}>
          <Ionicons name="card-outline" size={24} color={colors.primary} style={styles.icon} />
          <View>
            <View style={styles.brandRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.brand} •••• {item.last4}
              </Text>
              {item.isDefault && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Default</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardExp, { color: colors.textMuted }]}>
              Expires {item.expMonth}/{item.expYear}
            </Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No payment methods found.</Text>
          }
        />
      )}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <PrimaryButton title="Add Payment Method" onPress={() => alert('Open Stripe UI')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { marginBottom: 12, padding: 16 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  badge: { backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  badgeText: { color: '#065F46', fontSize: 10, fontWeight: 'bold' },
  cardExp: { fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  footer: { padding: 16, borderTopWidth: 1, position: 'absolute', bottom: 0, left: 0, right: 0 }
});
