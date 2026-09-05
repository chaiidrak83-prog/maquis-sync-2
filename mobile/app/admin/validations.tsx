import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { superAdminService, ClientAccount } from '../../services/superAdminService';

export default function SuperAdminValidationsScreen() {
  const [pendingList, setPendingList] = useState<ClientAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const loadPending = async () => {
    try {
      const allAccounts = await superAdminService.getAccounts();
      const filtered = allAccounts.filter(a => a.statut_paiement === 'en_attente');
      setPendingList(filtered);
    } catch (e) {
      console.warn('Erreur chargement validations:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPending();
  };

  const handleActivate = async (account: ClientAccount) => {
    Alert.alert(
      'Validation du Paiement',
      `Confirmez-vous la réception du paiement pour "${account.name}" ?\n\nFormule : ${account.plan}\nMontant : ${account.montant.toLocaleString('fr-FR')} F CFA\nClient : ${account.owner?.name || 'Inconnu'} (${account.owner?.phone || 'Non renseigné'})\n\nUne notification push d'activation sera instantanément envoyée sur son téléphone.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Activer l’accès',
          style: 'default',
          onPress: async () => {
            setActivatingId(account.id);
            try {
              const res = await superAdminService.validateAccount(account.id);
              if (res.success) {
                Alert.alert(
                  'Compte Activé ! 🎉',
                  `L'établissement "${account.name}" a été débloqué avec succès.\n${res.pushNotificationSent ? '🔔 Notification push délivrée au client.' : ''}`,
                );
                // Retirer de la liste en attente
                setPendingList(prev => prev.filter(a => a.id !== account.id));
              } else {
                Alert.alert('Erreur', res.message || 'Impossible de valider ce compte.');
              }
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Échec de validation.');
            } finally {
              setActivatingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Paiements en Attente de Validation</Text>
          <Text style={styles.headerSub}>
            {pendingList.length} demande(s) en attente de vérification Orange/Moov Money
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Chargement des souscriptions en attente...</Text>
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
              tintColor="#f59e0b"
              colors={['#f59e0b']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>Toutes les demandes sont traitées</Text>
              <Text style={styles.emptySub}>
                Aucun compte n'est actuellement en attente de validation de paiement.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isActivating = activatingId === item.id;
            const badgeColor =
              item.plan === 'Premium' ? '#a855f7' : item.plan === 'Accès' ? '#f59e0b' : '#10b981';

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.establishmentName}>{item.name}</Text>
                    <Text style={styles.ownerText}>
                      Gérant : {item.owner?.name || 'Inconnu'} • Tél :{' '}
                      <Text style={{ color: '#f8fafc', fontWeight: 'bold' }}>
                        {item.owner?.phone || 'Non renseigné'}
                      </Text>
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.planBadge,
                      { backgroundColor: `${badgeColor}15`, borderColor: badgeColor },
                    ]}
                  >
                    <Text style={[styles.planBadgeText, { color: badgeColor }]}>{item.plan}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardMiddle}>
                  <View>
                    <Text style={styles.metaLabel}>Montant à valider :</Text>
                    <Text style={styles.amount}>
                      {item.montant.toLocaleString('fr-FR')} F CFA
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.metaLabel}>Date de demande :</Text>
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

                {/* Bouton d'action 'Activer l'accès' */}
                <TouchableOpacity
                  style={[styles.actionBtn, isActivating && { opacity: 0.6 }]}
                  onPress={() => handleActivate(item)}
                  disabled={isActivating}
                  activeOpacity={0.85}
                >
                  {isActivating ? (
                    <ActivityIndicator color="#090d16" />
                  ) : (
                    <Text style={styles.actionBtnText}>✓ Activer l'accès (Validation + Push)</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#131b2e',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  refreshBtnText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  establishmentName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  ownerText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 3,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 12,
  },
  cardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 2,
  },
  amount: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '900',
  },
  dateText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnText: {
    color: '#090d16',
    fontWeight: '900',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
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
  emptySub: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
