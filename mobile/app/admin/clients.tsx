import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { superAdminService, ClientAccount } from '../../services/superAdminService';

export default function SuperAdminClientsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TOUS' | 'ACTIF' | 'EN_ATTENTE' | 'SUSPENDU'>('TOUS');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal d'actions pour un client sélectionné
  const [selectedClient, setSelectedClient] = useState<ClientAccount | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await superAdminService.getAccounts();
      setAccounts(data);
    } catch (e) {
      console.warn('Erreur chargement comptes:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAccounts();
  };

  // Filtrage local dynamique
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.owner?.name && acc.owner.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (acc.owner?.phone && acc.owner.phone.includes(searchQuery));

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIF') return acc.statut_paiement === 'actif';
    if (statusFilter === 'EN_ATTENTE') return acc.statut_paiement === 'en_attente';
    if (statusFilter === 'SUSPENDU') return acc.statut_paiement === 'suspendu';

    return true;
  });

  // Action 1 : Suspendre ou Réactiver
  const handleToggleSuspend = async () => {
    if (!selectedClient) return;
    const isSuspended = selectedClient.statut_paiement === 'suspendu';
    const actionLabel = isSuspended ? 'Réactiver' : 'Suspendre';

    Alert.alert(
      `Confirmer : ${actionLabel} le compte`,
      `Voulez-vous vraiment ${actionLabel.toLowerCase()} l'établissement "${selectedClient.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: actionLabel,
          style: isSuspended ? 'default' : 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              if (isSuspended) {
                await superAdminService.reactivateAccount(selectedClient.id);
              } else {
                await superAdminService.suspendAccount(selectedClient.id);
              }
              Alert.alert('Succès', `Compte ${actionLabel.toLowerCase()} avec succès.`);
              setActionModalVisible(false);
              loadAccounts();
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Action impossible.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  // Action 2 : Changer de Forfait
  const handleChangePlan = async (newPlan: 'Découverte' | 'Accès' | 'Premium') => {
    if (!selectedClient) return;
    setIsProcessing(true);
    try {
      await superAdminService.changePlan(selectedClient.id, newPlan);
      Alert.alert('Succès', `Le forfait a été modifié vers ${newPlan}.`);
      setPlanModalVisible(false);
      setActionModalVisible(false);
      loadAccounts();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de changer de forfait.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Action 3 : Impersonation (Se connecter en tant que client)
  const handleImpersonate = async () => {
    if (!selectedClient || !selectedClient.owner?.id) {
      Alert.alert('Erreur', 'Ce client ne possède pas d’identifiant utilisateur rattaché.');
      return;
    }

    Alert.alert(
      'Mode Support Technique (Impersonation)',
      `Vous allez être connecté à l'interface de "${selectedClient.name}" en tant que ${selectedClient.owner.name}.\n\nVous pourrez visualiser les caisses, stocks et données du maquis sans connaître le mot de passe du client.\n\nUne bannière rouge en haut de l'écran vous permettra de revenir ici à tout moment.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se connecter en tant que client ➔',
          style: 'default',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const res = await superAdminService.impersonateClient(
                selectedClient.owner!.id,
                selectedClient.name,
              );
              setActionModalVisible(false);
              // Rediriger vers l'espace application client
              router.replace('/(tabs)');
            } catch (err: any) {
              Alert.alert('Erreur Impersonation', err.message || 'Échec de connexion.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Search & Filter Bar */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher maquis, gérant ou tél..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.chipsRow}>
          {(['TOUS', 'ACTIF', 'EN_ATTENTE', 'SUSPENDU'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, statusFilter === f && styles.chipActive]}
              onPress={() => setStatusFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, statusFilter === f && styles.chipTextActive]}>
                {f === 'TOUS' ? 'Tous' : f === 'ACTIF' ? 'Actifs' : f === 'EN_ATTENTE' ? 'En attente' : 'Suspendus'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Accounts List (DataGrid) */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Chargement de l'annuaire clients...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAccounts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={styles.emptyTitle}>Aucun établissement trouvé</Text>
              <Text style={styles.emptySub}>Modifiez vos filtres de recherche pour afficher des clients.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSuspended = item.statut_paiement === 'suspendu';
            const isPending = item.statut_paiement === 'en_attente';
            const statusColor = isSuspended ? '#ef4444' : isPending ? '#f59e0b' : '#10b981';

            return (
              <View style={[styles.card, isSuspended && styles.cardSuspended]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>{item.name}</Text>
                    <Text style={styles.ownerSub}>
                      {item.owner?.name || 'Gérant'} • Tél : {item.owner?.phone || 'Non renseigné'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: `${statusColor}15` }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {item.statut_paiement.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowDetails}>
                  <View>
                    <Text style={styles.metaKey}>Forfait Actuel</Text>
                    <Text style={styles.metaVal}>
                      {item.plan} ({item.montant.toLocaleString('fr-FR')} F)
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.metaKey}>Dernière Activité</Text>
                    <Text style={styles.metaVal}>
                      {item.last_active_at
                        ? new Date(item.last_active_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                          })
                        : 'Jamais'}
                    </Text>
                  </View>
                </View>

                {/* Actions Button */}
                <TouchableOpacity
                  style={styles.actionsMenuBtn}
                  onPress={() => {
                    setSelectedClient(item);
                    setActionModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionsMenuBtnText}>⚙️ Actions Client (Menu)</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Modal Actions Client */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Actions : {selectedClient?.name}</Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Gérant : {selectedClient?.owner?.name} ({selectedClient?.owner?.phone})
            </Text>

            <View style={styles.modalActionsList}>
              {/* Action 1 : Impersonation */}
              <TouchableOpacity
                style={[styles.modalActionItem, { borderColor: '#3b82f6', backgroundColor: '#1e3a8a25' }]}
                onPress={handleImpersonate}
                disabled={isProcessing}
              >
                <Text style={{ fontSize: 20 }}>👤</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalActionTitle, { color: '#60a5fa' }]}>
                    Se connecter en tant que (Impersonation)
                  </Text>
                  <Text style={styles.modalActionSub}>
                    Prendre la main sur l'application du client sans son mot de passe
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Action 2 : Changer Forfait */}
              <TouchableOpacity
                style={[styles.modalActionItem, { borderColor: '#f59e0b', backgroundColor: '#78350f20' }]}
                onPress={() => setPlanModalVisible(true)}
                disabled={isProcessing}
              >
                <Text style={{ fontSize: 20 }}>📦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalActionTitle, { color: '#fbbf24' }]}>
                    Changer de Forfait
                  </Text>
                  <Text style={styles.modalActionSub}>
                    Actuel : {selectedClient?.plan} • Passer en Découverte, Accès ou Premium
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Action 3 : Suspendre ou Réactiver */}
              <TouchableOpacity
                style={[
                  styles.modalActionItem,
                  selectedClient?.statut_paiement === 'suspendu'
                    ? { borderColor: '#10b981', backgroundColor: '#064e3b25' }
                    : { borderColor: '#ef4444', backgroundColor: '#7f1d1d25' },
                ]}
                onPress={handleToggleSuspend}
                disabled={isProcessing}
              >
                <Text style={{ fontSize: 20 }}>
                  {selectedClient?.statut_paiement === 'suspendu' ? '🔓' : '🔒'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modalActionTitle,
                      {
                        color:
                          selectedClient?.statut_paiement === 'suspendu'
                            ? '#34d399'
                            : '#f87171',
                      },
                    ]}
                  >
                    {selectedClient?.statut_paiement === 'suspendu'
                      ? 'Réactiver le compte'
                      : 'Suspendre le compte'}
                  </Text>
                  <Text style={styles.modalActionSub}>
                    {selectedClient?.statut_paiement === 'suspendu'
                      ? 'Rétablir les accès caisse et inventaire'
                      : 'Bloquer immédiatement l’accès aux modules du maquis'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sub-Modal : Sélection du Forfait */}
      <Modal
        visible={planModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPlanModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier la Formule</Text>
              <TouchableOpacity onPress={() => setPlanModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Sélectionnez le nouveau plan pour {selectedClient?.name} :
            </Text>

            <View style={{ gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.planOptionBtn, { borderColor: '#10b981' }]}
                onPress={() => handleChangePlan('Découverte')}
              >
                <Text style={[styles.planOptionTitle, { color: '#10b981' }]}>
                  Formule Découverte (9 900 F CFA / mois)
                </Text>
                <Text style={styles.planOptionDesc}>1 à 10 serveuses • Support standard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.planOptionBtn, { borderColor: '#f59e0b' }]}
                onPress={() => handleChangePlan('Accès')}
              >
                <Text style={[styles.planOptionTitle, { color: '#f59e0b' }]}>
                  Formule Accès (14 900 F CFA / mois)
                </Text>
                <Text style={styles.planOptionDesc}>11 à 25 serveuses • Rapports & Stocks complets</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.planOptionBtn, { borderColor: '#a855f7' }]}
                onPress={() => handleChangePlan('Premium')}
              >
                <Text style={[styles.planOptionTitle, { color: '#a855f7' }]}>
                  Formule Premium (19 900 F CFA / mois)
                </Text>
                <Text style={styles.planOptionDesc}>Serveuses illimitées • Multi-sites • Conseiller 24h</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  filterBar: {
    backgroundColor: '#131b2e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 10,
  },
  searchInput: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  chipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardSuspended: {
    opacity: 0.8,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  ownerSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#090d16',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  metaKey: {
    color: '#64748b',
    fontSize: 10,
  },
  metaVal: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsMenuBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionsMenuBtnText: {
    color: '#cbd5e1',
    fontWeight: '800',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900',
    flex: 1,
  },
  closeBtn: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 4,
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 16,
  },
  modalActionsList: {
    gap: 12,
  },
  modalActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  modalActionSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  planOptionBtn: {
    backgroundColor: '#090d16',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
  },
  planOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  planOptionDesc: {
    color: '#64748b',
    fontSize: 11,
  },
});
