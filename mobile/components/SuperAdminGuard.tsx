import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { superAdminService } from '../services/superAdminService';

interface Props {
  children: React.ReactNode;
}

export default function SuperAdminGuard({ children }: Props) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [phone, setPhone] = useState('00000000');
  const [password, setPassword] = useState('SuperAdmin2026!');
  const [isLoading, setIsLoading] = useState(false);

  const verifyAuth = async () => {
    const ok = await superAdminService.isAuthenticated();
    setIsAuthorized(ok);
    setIsChecking(false);
  };

  useEffect(() => {
    verifyAuth();
  }, []);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre numéro et mot de passe Super Admin.');
      return;
    }

    setIsLoading(true);
    const res = await superAdminService.login(phone.trim(), password.trim());
    setIsLoading(false);

    if (res.success) {
      setIsAuthorized(true);
    } else {
      Alert.alert('Accès refusé', res.error || 'Identifiants Super Admin invalides.');
    }
  };

  if (isChecking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.checkingText}>Vérification des privilèges Super Admin...</Text>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>ACCÈS RESTREINT</Text>
        </View>
        <Text style={styles.loginTitle}>Portail Super Administrateur</Text>
        <Text style={styles.loginSubtitle}>
          Veuillez vous authentifier avec vos identifiants à privilèges élevés pour accéder à la console de gestion centrale.
        </Text>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Identifiant (Téléphone)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Ex: 00000000"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe d'administration</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Déverrouiller la Console ➔</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.securityNotice}>
          🔒 Les connexions Super Admin sont auditées et tracées par journalisation cryptographique.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  checkingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
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
  loginTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  loginSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  card: {
    width: '100%',
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 16,
  },
  inputGroup: {
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
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
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
  securityNotice: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 16,
  },
});
