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

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string; montant?: string }>();

  const planName = (params.plan as 'Découverte' | 'Accès' | 'Premium') || 'Accès';
  const planMontant = parseInt(params.montant || '14900', 10);

  const [userName, setUserName] = useState('Alassane Touré');
  const [phone, setPhone] = useState('76000000');
  const [establishmentName, setEstablishmentName] = useState('Maquis Le Régal');
  const [hasSentWhatsApp, setHasSentWhatsApp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenWhatsApp = async () => {
    if (!userName.trim() || !phone.trim()) {
      Alert.alert('Information requise', 'Veuillez saisir votre nom et votre numéro de téléphone.');
      return;
    }
    await subscriptionService.openWhatsAppProof(planName, planMontant, userName, phone);
    setHasSentWhatsApp(true);
  };

  const handleConfirmAndProceed = async () => {
    if (!userName.trim() || !phone.trim()) {
      Alert.alert('Champs obligatoires', 'Veuillez renseigner votre nom et votre numéro de téléphone.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Initialise la souscription avec le statut 'en_attente' et Push Token Expo
      const subscription = await subscriptionService.initiateSubscription({
        userName,
        phone,
        establishmentName,
        plan: planName,
        montant: planMontant,
      });

      // 2. Redirection vers l'écran d'attente avec polling
      router.push({
        pathname: '/subscription/waiting' as any,
        params: {
          id: subscription.id,
          plan: planName,
          montant: planMontant.toString(),
          userName,
          phone,
        },
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d’enregistrer la demande. Veuillez réessayer.');
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
        <Text style={styles.headerTitle}>Finaliser l'Abonnement</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dynamic Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summarySubtitle}>Formule sélectionnée</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{planName}</Text>
            </View>
          </View>
          <Text style={styles.summaryTitle}>Formule {planName}</Text>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Montant à régler :</Text>
            <Text style={styles.summaryRowPrice}>{planMontant.toLocaleString('fr-FR')} F CFA</Text>
          </View>
          <Text style={styles.taxNotice}>Tarif mensuel net, sans frais cachés.</Text>
        </View>

        {/* Client Info Inputs */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vos Coordonnées</Text>
          
          <Text style={styles.inputLabel}>Nom complet du gérant / propriétaire :</Text>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={setUserName}
            placeholder="Ex: Alassane Touré"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.inputLabel}>Numéro de Téléphone (Orange / Moov) :</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Ex: 76000000"
            keyboardType="phone-pad"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.inputLabel}>Nom de votre Établissement (Maquis) :</Text>
          <TextInput
            style={styles.input}
            value={establishmentName}
            onChangeText={setEstablishmentName}
            placeholder="Ex: Maquis Le Régal"
            placeholderTextColor="#64748b"
          />
        </View>

        {/* Payment Instructions & WhatsApp Button */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Procédure de Paiement</Text>
          <Text style={styles.instructionStep}>
            1. Effectuez le paiement de <Text style={{ fontWeight: 'bold', color: '#10b981' }}>{planMontant.toLocaleString('fr-FR')} F CFA</Text> par Orange Money ou Moov Money au :
          </Text>
          <View style={styles.phoneBox}>
            <Text style={styles.phoneNumber}>+226 78 55 98 88</Text>
            <Text style={styles.phoneRecipient}>Bénéficiaire : MaquisSync Support</Text>
          </View>

          <Text style={[styles.instructionStep, { marginTop: 12 }]}>
            2. Envoyez la capture du SMS de confirmation sur notre WhatsApp :
          </Text>

          {/* Button WhatsApp */}
          <TouchableOpacity
            style={[styles.whatsappButton, hasSentWhatsApp && styles.whatsappButtonDone]}
            onPress={handleOpenWhatsApp}
            activeOpacity={0.85}
          >
            <Text style={styles.whatsappIcon}>💬</Text>
            <Text style={styles.whatsappButtonText}>
              {hasSentWhatsApp ? '✓ Preuve WhatsApp Envoyée (Renvoyer)' : 'Envoyer ma capture sur WhatsApp'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.whatsappHint}>
            Message pré-rempli : "Bonjour, voici la capture de mon paiement Orange Money pour la Formule {planName}"
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Confirm Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.confirmButton, isLoading && { opacity: 0.7 }]}
          onPress={handleConfirmAndProceed}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#090d16" />
          ) : (
            <Text style={styles.confirmButtonText}>J'ai envoyé mon paiement ➔</Text>
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
  summaryCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summarySubtitle: {
    color: '#94a3b8',
    fontSize: 12,
  },
  planBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  planBadgeText: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 11,
  },
  summaryTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  summaryRowLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRowPrice: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '900',
  },
  taxNotice: {
    color: '#64748b',
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
  cardTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    marginBottom: 14,
  },
  instructionStep: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  phoneBox: {
    backgroundColor: '#090d16',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  phoneNumber: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  phoneRecipient: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  whatsappButtonDone: {
    backgroundColor: '#128C7E',
  },
  whatsappIcon: {
    fontSize: 18,
  },
  whatsappButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  whatsappHint: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
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
  confirmButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#090d16',
    fontWeight: '900',
    fontSize: 15,
  },
});
