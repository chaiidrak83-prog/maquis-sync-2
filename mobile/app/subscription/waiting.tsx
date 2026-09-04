import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { subscriptionService } from '../../services/subscriptionService';

export default function WaitingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    plan?: string;
    montant?: string;
    userName?: string;
    phone?: string;
  }>();

  const subscriptionId = params.id || 'current';
  const planName = params.plan || 'Accès';
  const planMontant = parseInt(params.montant || '14900', 10);
  const clientName = params.userName || 'Gérant';

  const [status, setStatus] = useState<'en_attente' | 'actif'>('en_attente');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const isMounted = useRef(true);

  // Polling léger toutes les 4 secondes
  useEffect(() => {
    isMounted.current = true;

    const checkSubscription = async () => {
      if (status === 'actif') return;

      try {
        const res = await subscriptionService.checkStatus(subscriptionId);
        if (isMounted.current && res.statut_paiement === 'actif') {
          setStatus('actif');
        }
      } catch (err) {
        console.warn('Erreur vérification statut:', err);
      } finally {
        if (isMounted.current) {
          setPollCount(c => c + 1);
        }
      }
    };

    // Premier appel immédiat
    checkSubscription();

    // Intervalle de 4s
    const timer = setInterval(checkSubscription, 4000);

    return () => {
      isMounted.current = false;
      clearInterval(timer);
    };
  }, [subscriptionId, status]);

  // Pull to refresh manuel
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await subscriptionService.checkStatus(subscriptionId);
      if (res.statut_paiement === 'actif') {
        setStatus('actif');
      } else {
        Alert.alert('Statut actuel', 'Paiement toujours en attente de validation par l’administrateur.');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEnterApp = () => {
    router.replace('/(tabs)');
  };

  const handleOpenWhatsAppReminder = () => {
    subscriptionService.openWhatsAppProof(planName, planMontant, clientName, params.phone);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Validation de l'Abonnement</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleManualRefresh}
            tintColor="#10b981"
            colors={['#10b981']}
          />
        }
      >
        {status === 'en_attente' ? (
          // --- ÉCRAN D'ATTENTE AVEC POLLING ---
          <View style={styles.stateContainer}>
            <View style={styles.pulseContainer}>
              <View style={styles.pulseRing} />
              <View style={styles.iconCircle}>
                <ActivityIndicator size="large" color="#10b981" />
              </View>
            </View>

            <Text style={styles.statusTitle}>Paiement en cours de vérification</Text>
            <Text style={styles.statusSubtitle}>
              Notre équipe commerciale vérifie votre capture de paiement WhatsApp pour activer votre compte.
            </Text>

            {/* Order details summary */}
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Formule :</Text>
                <Text style={styles.detailValue}>Formule {planName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Montant :</Text>
                <Text style={styles.detailValue}>{planMontant.toLocaleString('fr-FR')} F CFA</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Client :</Text>
                <Text style={styles.detailValue}>{clientName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Statut :</Text>
                <View style={styles.statusBadgeWaiting}>
                  <Text style={styles.statusBadgeWaitingText}>⏳ EN ATTENTE</Text>
                </View>
              </View>
            </View>

            {/* Polling Indicator */}
            <View style={styles.pollingNotice}>
              <View style={styles.pollingDot} />
              <Text style={styles.pollingText}>
                Vérification automatique active (actualisation toutes les 4s)
              </Text>
            </View>

            {/* Pull to refresh helper */}
            <Text style={styles.pullHint}>
              💡 Glissez l'écran vers le bas pour actualiser manuellement.
            </Text>

            {/* WhatsApp reminder button */}
            <TouchableOpacity
              style={styles.reminderButton}
              onPress={handleOpenWhatsAppReminder}
              activeOpacity={0.8}
            >
              <Text style={styles.reminderButtonText}>💬 Renvoyer ma capture WhatsApp</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // --- ÉCRAN DE DÉBLOCAGE IMMÉDIAT (ACTIF) ---
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', borderWidth: 2 }]}>
              <Text style={{ fontSize: 44 }}>🎉</Text>
            </View>

            <Text style={[styles.statusTitle, { color: '#10b981' }]}>Abonnement Activé !</Text>
            <Text style={styles.statusSubtitle}>
              Votre paiement a été validé avec succès. Votre application est désormais totalement débloquée !
            </Text>

            {/* Welcome banner */}
            <View style={styles.welcomeBanner}>
              <Text style={styles.welcomeBannerTitle}>✨ Bienvenue sur MaquisSync</Text>
              <Text style={styles.welcomeBannerText}>
                Toutes les fonctionnalités de la Formule {planName} sont actives pour votre établissement.
              </Text>
            </View>

            {/* Direct Access Button */}
            <TouchableOpacity
              style={styles.enterAppButton}
              onPress={handleEnterApp}
              activeOpacity={0.85}
            >
              <Text style={styles.enterAppButtonText}>Accéder à l'application ➔</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  stateContainer: {
    alignItems: 'center',
  },
  pulseContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#131b2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadgeWaiting: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  statusBadgeWaitingText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
  },
  pollingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  pollingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  pollingText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  pullHint: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 24,
  },
  reminderButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  reminderButtonText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  welcomeBanner: {
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  welcomeBannerTitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  welcomeBannerText: {
    color: '#cbd5e1',
    fontSize: 12,
    textAlign: 'center',
  },
  enterAppButton: {
    width: '100%',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  enterAppButtonText: {
    color: '#090d16',
    fontWeight: '900',
    fontSize: 15,
  },
});
