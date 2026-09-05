import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { superAdminService } from '../services/superAdminService';

export default function BossAdminScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('00000000');
  const [password, setPassword] = useState('SuperAdmin2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdminLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner vos identifiants d\'administration.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    const res = await superAdminService.login(phone.trim(), password.trim());
    setIsLoading(false);

    if (res.success) {
      router.replace('/admin/dashboard');
    } else {
      setErrorMsg(res.error || 'Accès refusé : privilèges insuffisants.');
      Alert.alert('Accès Interdit (403)', res.error || 'Accès refusé : privilèges insuffisants.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ZONE RESTREINTE</Text>
          </View>

          <Text style={styles.title}>Console de Direction</Text>
          <Text style={styles.subtitle}>
            Accès confidentiel réservé au Super Administrateur de la plateforme MaquisSaaS.
          </Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Identifiant (Téléphone) :</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="00000000"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe Maître :</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleAdminLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Déverrouiller l'accès ➔</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.cancelBtnText}>← Retour à l'application caisse</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          🔒 Toute tentative d'intrusion fait l'objet d'un audit de sécurité.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  badge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    color: '#ef4444',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
    gap: 6,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  loginBtn: {
    width: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  cancelBtn: {
    marginTop: 18,
    padding: 6,
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  footerNote: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
  },
});
