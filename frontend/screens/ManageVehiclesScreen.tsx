import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Vehicle } from '../types';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';

export const ManageVehiclesScreen = () => {
  const { colors } = useTheme();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const res = await api.get<Vehicle[]>('/users/vehicles');
      setVehicles(res.data);
    } catch (e) {
      console.warn('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await api.delete(`/users/vehicles/${id}`);
      setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (e) {
      alert('Failed to delete vehicle');
    }
  };

  const renderItem = ({ item }: { item: Vehicle }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Text style={[styles.vehicleTitle, { color: colors.text }]}>{item.year} {item.make} {item.model}</Text>
          {item.isDefault && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Default</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => deleteVehicle(item.id)}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.vehicleDetails, { color: colors.textMuted }]}>
        Color: {item.color}  •  License: {item.licensePlate}
      </Text>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No vehicles added yet.</Text>
          }
        />
      )}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <PrimaryButton title="Add New Vehicle" onPress={() => alert('Open Add Vehicle Modal')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  vehicleTitle: { fontSize: 16, fontWeight: 'bold' },
  badge: { backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  badgeText: { color: '#1E40AF', fontSize: 10, fontWeight: 'bold' },
  vehicleDetails: { fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  footer: { padding: 16, borderTopWidth: 1, position: 'absolute', bottom: 0, left: 0, right: 0 }
});
