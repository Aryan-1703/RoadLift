import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ActiveSession } from '../types';
import { PrimaryButton } from '../components/PrimaryButton';
import { Card } from '../components/Card';

export const SecurityScreen = () => {
  const { colors } = useTheme();
  const { logout } = useAuth();
  
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await api.get<ActiveSession[]>('/users/sessions');
      setSessions(res.data);
    } catch (e) {
      console.warn('Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) return;
    setIsChangingPassword(true);
    try {
      await api.post('/users/password/change', { currentPassword, newPassword });
      alert('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      alert(e.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await api.post('/users/sessions/logout-all');
      alert('Logged out of all other devices');
      loadSessions();
    } catch (e) {
      alert('Failed to logout sessions');
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.post('/users/delete', { password: deletePassword });
      setShowDeleteModal(false);
      await logout();
    } catch (e: any) {
      alert(e.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CHANGE PASSWORD</Text>
      <Card style={styles.card}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Current Password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.label, { color: colors.textMuted, marginTop: 12 }]}>New Password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          placeholderTextColor={colors.textMuted}
        />
        <PrimaryButton 
          title="Update Password" 
          onPress={handlePasswordChange} 
          isLoading={isChangingPassword} 
          disabled={!currentPassword || !newPassword}
          style={styles.buttonSpacing}
        />
      </Card>

      <View style={styles.sessionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACTIVE SESSIONS</Text>
        <TouchableOpacity onPress={handleLogoutAll}>
          <Text style={[styles.logoutAll, { color: colors.primary }]}>Log out all</Text>
        </TouchableOpacity>
      </View>
      <Card style={styles.sessionCard}>
        {loadingSessions ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />
        ) : (
          sessions.map((sess, idx) => (
            <View key={sess.id} style={[styles.sessionRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View>
                <View style={styles.deviceRow}>
                  <Text style={[styles.deviceName, { color: colors.text }]}>{sess.device}</Text>
                  {sess.isCurrent && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Current</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.sessionInfo, { color: colors.textMuted }]}>{sess.location} • {sess.lastActive}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.danger, marginTop: 24 }]}>DANGER ZONE</Text>
      <Card style={[styles.dangerCard, { backgroundColor: colors.dangerBg, borderColor: colors.danger + '40' }]}>
        <Text style={[styles.dangerText, { color: colors.danger }]}>
          Once you delete your account, there is no going back. Please be certain.
        </Text>
        <PrimaryButton 
          title="Delete Account" 
          variant="danger" 
          onPress={() => setShowDeleteModal(true)} 
        />
      </Card>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Account?</Text>
            <Text style={[styles.modalBody, { color: colors.textMuted }]}>
              This action cannot be undone. Enter your password to confirm.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginBottom: 20 }]}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalActions}>
              <PrimaryButton title="Cancel" variant="secondary" onPress={() => setShowDeleteModal(false)} style={styles.modalBtn} />
              <View style={{ width: 12 }} />
              <PrimaryButton title="Confirm Delete" variant="danger" onPress={handleDeleteAccount} isLoading={isDeleting} disabled={!deletePassword} style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>

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
  card: { padding: 16, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttonSpacing: { marginTop: 16 },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  logoutAll: { fontSize: 12, fontWeight: 'bold' },
  sessionCard: { padding: 0, marginBottom: 24 },
  sessionRow: { padding: 16 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  deviceName: { fontSize: 16, fontWeight: 'bold' },
  badge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: { color: '#065F46', fontSize: 10, fontWeight: 'bold' },
  sessionInfo: { fontSize: 12 },
  dangerCard: { padding: 16 },
  dangerText: { fontSize: 14, marginBottom: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalBody: { fontSize: 14, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { flex: 1 },
});
