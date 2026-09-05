import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { subscriptionService } from '../../services/subscriptionService';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string; montant?: string }>();

  const [selectedPlan, setSelectedPlan] = useState<'Découverte' | 'Accès' | 'Premium'>(
    (params.plan as any) || 'Accès',
  );

  const PLAN_PRICES: Record<'Découverte' | 'Accès' | 'Premium', number> = {
    Découverte: 9900,
    Accès: 14900,
    Premium: 19900,
  };

  const planMontant = PLAN_PRICES[selectedPlan];

  // Les 3 champs obligatoires requis par la spécification
  const [nomMaquis, setNomMaquis] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation des 3 champs
    if (!nomMaquis.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le nom de votre maquis.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir votre numéro de téléphone (utilisé comme identifiant).');
      return;
    }
    if (!password.trim() || password.length < 4) {
      Alert.alert('Mot de passe requis', 'Veuillez choisir un mot de passe d’au moins 4 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Appel vers l'endpoint d'inscription backend /auth/register
      const res = await subscriptionService.registerEstablishment({
        nom_maquis: nomMaquis.trim(),
        phone: phone.trim(),
        password: password.trim(),
        plan: selectedPlan,
        montant: planMontant,
      });

      // 2. Redirection immédiate vers l'écran d'attente post-commande
      router.replace({
        pathname: '/subscription/waiting' as any,
        params: {
          id: res.subscription.id,
          plan: selectedPlan,
          montant: planMontant.toString(),
          nom_maquis: nomMaquis.trim(),
          phone: phone.trim(),
        },
      });
    } catch (err: any) {
      Alert.alert('Erreur inscription', err.message || 'Impossible de créer le compte.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inscription & Onboarding</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Formula Selection Cards */}
        <View style={styles.planSelectContainer}>
          <Text style={styles.sectionHeading}>Sélectionnez votre Formule :</Text>
          <View style={styles.planPillsRow}>
            {(['Découverte', 'Accès', 'Premium'] as const).map(p => {
              const isSelected = selectedPlan === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.planPill, isSelected && styles.planPillActive]}
                  onPress={() => setSelectedPlan(p)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.planPillName, isSelected && styles.planPillNameActive]}>{p}</Text>
                  <Text style={[styles.planPillPrice, isSelected && styles.planPillPriceActive]}>
                    {PLAN_PRICES[p].toLocaleString('fr-FR')} F
                  </Text>
                  {p === 'Accès' && (
                    <View style={styles.miniBadge}>
                      <Text style={styles.miniBadgeText}>POPULAIRE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Plan Summary Banner */}
        <View style={styles.planSummaryCard}>
          <View style={styles.planSummaryHeader}>
            <Text style={styles.planSummarySub}>Formule active :</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedPlan}</Text>
            </View>
          </View>
          <Text style={styles.planSummaryPrice}>
            {planMontant.toLocaleString('fr-FR')} F CFA <Text style={styles.periodText}>/ mois</Text>
          </Text>
          <Text style={styles.planFeatureText}>
            ✓ 7 jours d'essai gratuit inclus • Statut initial : <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>en_attente</Text>
          </Text>
        </View>

        {/* The 3-field Form */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Création de votre Établissement</Text>
          <Text style={styles.formSubtitle}>
            Ces 3 champs sont nécessaires pour ouvrir votre compte et générer votre accès.
          </Text>

          {/* Champ 1 : Nom du maquis */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              1. Nom du maquis <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Maquis Le Régal, Bar La Paillote..."
              placeholderTextColor="#64748b"
              value={nomMaquis}
              onChangeText={setNomMaquis}
              autoCapitalize="words"
            />
          </View>

          {/* Champ 2 : Numéro de téléphone (Identifiant) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              2. Numéro de téléphone (Identifiant) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 76000000 ou 70123456"
              placeholderTextColor="#64748b"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Text style={styles.hint}>Ce numéro servira d'identifiant unique de connexion.</Text>
          </View>

          {/* Champ 3 : Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              3. Mot de passe de connexion <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Minimum 4 caractères"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Masquer' : 'Afficher'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Sera haché et sécurisé par cryptographie (bcrypt).</Text>
          </View>
        </View>

        {/* Security & WhatsApp Notice */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔒 Que se passe-t-il après l'inscription ?</Text>
          <Text style={styles.infoText}>
            1. Votre compte et votre établissement sont créés avec le statut <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>en_attente</Text>.{'\n'}
            2. Vous serez redirigé vers l'écran de paiement où un bouton WhatsApp pré-rempli contiendra automatiquement le nom de votre maquis ({nomMaquis || '...'}) et votre numéro ({phone || '...'}).{'\n'}
            3. Dès validation manuelle par l'administrateur, votre application se débloquera instantanément !
          </Text>
        </View>
      </ScrollView>

      {/* Submit Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitButton, isLoading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#090d16" />
          ) : (
            <Text style={styles.submitButtonText}>
              Créer mon compte & Enregistrer ma demande ➔
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  planSelectContainer: {
    marginBottom: 16,
  },
  sectionHeading: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  planPill: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    position: 'relative',
  },
  planPillActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  planPillName: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  planPillNameActive: {
    color: '#10b981',
    fontWeight: '900',
  },
  planPillPrice: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
  },
  planPillPriceActive: {
    color: '#f8fafc',
  },
  miniBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  miniBadgeText: {
    color: '#090d16',
    fontSize: 8,
    fontWeight: '900',
  },
  planSummaryCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  planSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planSummarySub: {
    color: '#94a3b8',
    fontSize: 12,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 11,
  },
  planSummaryPrice: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  periodText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  planFeatureText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  formTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  formSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  hint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  infoTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 17,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#090d16',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    padding: 16,
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: '#090d16',
    fontWeight: '900',
    fontSize: 14,
  },
});
