import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { subscriptionService, SubscriptionRecord } from '../../services/subscriptionService';

export default function AdminSubscriptionsScreen() {
  const router = useRouter();
  const [pendingList, setPendingList] = useState<SubscriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const loadPendingSubscriptions = async () => {
    try {
      const data = await subscriptionService.getPendingSubscriptions();
      setPendingList(data);
    } catch (error) {
      console.warn('Erreur chargement souscriptions admin:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPendingSubscriptions();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPendingSubscriptions();
  };

  const handleActivate = async (item: SubscriptionRecord) => {
    Alert.alert(
      'Confirmer la validation',
      `Valider l'accès pour ${item.user_name} (${item.plan} - ${item.montant.toLocaleString('fr-FR')} F CFA) ?\nUne notification push sera envoyée au client.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider l’accès',
          style: 'default',
          onPress: async () => {
            setActivatingId(item.id);
            try {
              const res = await subscriptionService.activateSubscription(item.id);
              if (res.success) {
                Alert.alert(
                  'Succès',
                  `Abonnement activé avec succès !\n${res.pushNotificationSent ? '🔔 Notification push envoyée au client.' : 'Compte actif.'}`,
                );
                // Retirer de la liste locale
                setPendingList(prev => prev.filter(s => s.id !== item.id));
              } else {
                Alert.alert('Erreur', 'Impossible de valider cet abonnement.');
              }
            } catch (err) {
              Alert.alert('Erreur', 'Une erreur est survenue lors de l’activation.');
            } finally {
              setActivatingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* Admin Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={styles.badgeRow}>
            <Text style={styles.adminBadge}>ESPACE ADMIN</Text>
          </View>
          <Text style={styles.headerTitle}>Gestion des Abonnements</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.backButton}>
          <Text style={styles.backButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Subheader summary */}
      <View style={styles.statsBanner}>
        <Text style={styles.statsText}>
          Demandes en attente : <Text style={styles.statsCount}>{pendingList.length}</Text>
        </Text>
        <Text style={styles.statsSub}>Vérifiez la preuve WhatsApp avant de valider l'accès</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Chargement des souscriptions...</Text>
        </View>
      ) : (
        <FlatList
          data={pendingList}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#10b981"
              colors={['#10b981']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>Aucune souscription en attente</Text>
              <Text style={styles.emptySubtitle}>
                Tous les paiements ont été validés et les accès sont à jour.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isActivating = activatingId === item.id;
            const planBadgeColor =
              item.plan === 'Premium'
                ? '#a855f7'
                : item.plan === 'Accès'
                ? '#f59e0b'
                : '#10b981';

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.clientName}>{item.user_name}</Text>
                    <Text style={styles.establishmentName}>
                      {item.establishment_name || 'Établissement'} • Tél: {item.phone}
                    </Text>
                  </View>
                  <View style={[styles.planBadge, { backgroundColor: `${planBadgeColor}20`, borderColor: planBadgeColor }]}>
                    <Text style={[styles.planBadgeText, { color: planBadgeColor }]}>
                      {item.plan}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardDetails}>
                  <View>
                    <Text style={styles.label}>Montant attendu :</Text>
                    <Text style={styles.amount}>{item.montant.toLocaleString('fr-FR')} F CFA</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>Date demande :</Text>
                    <Text style={styles.dateText}>
                      {new Date(item.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                {/* Bouton Valider l'accès */}
                <TouchableOpacity
                  style={[styles.validateButton, isActivating && { opacity: 0.6 }]}
                  onPress={() => handleActivate(item)}
                  disabled={isActivating}
                  activeOpacity={0.85}
                >
                  {isActivating ? (
                    <ActivityIndicator size="small" color="#090d16" />
                  ) : (
                    <Text style={styles.validateButtonText}>✓ Valider l'accès (Activer + Push)</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
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
    paddingVertical: 12,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  badgeRow: {
    marginBottom: 2,
  },
  adminBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  statsBanner: {
    backgroundColor: '#131b2e',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  statsText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  statsCount: {
    color: '#f59e0b',
    fontWeight: '900',
  },
  statsSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  establishmentName: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  planBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 12,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  label: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 2,
  },
  amount: {
    color: '#10b981',
    fontSize: 17,
    fontWeight: '900',
  },
  dateText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  validateButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButtonText: {
    color: '#090d16',
    fontWeight: '900',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
