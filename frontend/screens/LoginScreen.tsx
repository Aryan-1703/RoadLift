import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';

export const LoginScreen = () => {
  const { colors } = useTheme();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('user@roadlift.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Ionicons name="car-sport" size={40} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>RoadLift</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>On-demand roadside assistance.</Text>
        </View>

        <Card style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Password</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          {error ? <Text style={styles.error}>{error}</Text> : null}
          
          <PrimaryButton 
            title="Sign In" 
            onPress={handleLogin} 
            isLoading={isSubmitting} 
            style={styles.button} 
          />
        </Card>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: { padding: 16, borderRadius: 20, marginBottom: 16, transform: [{ rotate: '-5deg' }] },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginTop: 8 },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  error: { color: '#DC2626', marginTop: 12, textAlign: 'center' },
  button: { marginTop: 24 },
});
