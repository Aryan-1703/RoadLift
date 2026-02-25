import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PrimaryButton } from '../components/PrimaryButton';

export const AdminOverviewScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const handleLogout = async () => {
    await logout();
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { label: 'Edit Profile', route: 'EditProfile', icon: 'person-outline' as const },
        { label: 'Manage Vehicles', route: 'ManageVehicles', icon: 'car-outline' as const },
        { label: 'Payment Methods', route: 'PaymentMethods', icon: 'card-outline' as const }
      ]
    },
    {
      title: 'Settings',
      items: [
        { label: 'Appearance & Notifications', route: 'Preferences', icon: 'options-outline' as const },
        { label: 'Security & Privacy', route: 'Security', icon: 'lock-closed-outline' as const },
      ]
    }
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Profile Header */}
        <View style={styles.profileContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{user?.name.charAt(0)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
            <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>
          </View>
        </View>

        {/* Sections */}
        {sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title}</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, itemIdx) => (
                <TouchableOpacity
                  key={itemIdx}
                  style={[
                    styles.row,
                    itemIdx !== section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                  ]}
                  onPress={() => navigation.navigate(item.route)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
                    <Ionicons name={item.icon} size={20} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.border} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <PrimaryButton 
            title="Log Out" 
            variant="danger" 
            onPress={handleLogout} 
          />
          <Text style={[styles.version, { color: colors.textMuted }]}>RoadLift v1.0.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginLeft: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    marginTop: 16,
  }
});
