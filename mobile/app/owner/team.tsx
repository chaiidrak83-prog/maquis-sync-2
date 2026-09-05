import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { teamService, GerantsTeamResponse, StaffMember } from '@/services/teamService';
import { posService } from '@/services/posService';

export default function OwnerTeamScreen() {
  const router = useRouter();
  const [teamData, setTeamData] = useState<GerantsTeamResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await teamService.getGerants();
      setTeamData(data);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de charger les gérants.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleShareCode = async () => {
    if (!teamData?.code_etablissement) return;
    try {
      await Share.share({
        message: `Bonjour ! Voici le code pour rejoindre notre maquis "${teamData.nom_maquis}" sur MaquisSaaS : ${teamData.code_etablissement}\nTélécharge l'application et inscris-toi en tant que Gérant avec ce code.`,
      });
    } catch (e) {}
  };

  const handleApprove = async (gerant: StaffMember) => {
    if (teamData?.quota_plein) {
      Alert.alert(
        'Quota Atteint',
        'Votre formule actuelle a atteint son quota maximal de gérants. Passez à l’offre supérieure pour en ajouter davantage.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Voir les Formules', onPress: () => router.push('/subscription/plans' as any) },
        ],
      );
      return;
    }

    setActionId(gerant.id);
    try {
      await teamService.approuverGerant(gerant.id);
      Alert.alert('Gérant Validé !', `${gerant.name} peut désormais se connecter à la plateforme.`);
      loadTeam();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec lors de l’approbation.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = (gerant: StaffMember) => {
    Alert.alert(
      'Refuser la demande',
      `Voulez-vous rejeter l'inscription de ${gerant.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            setActionId(gerant.id);
            try {
              await teamService.rejeterGerant(gerant.id);
              Alert.alert('Demande Rejetée', 'La demande d’accès a été refusée.');
              loadTeam();
            } catch (err: any) {
              Alert.alert('Erreur', err.message);
            } finally {
              setActionId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validation des Gérants</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* CARTE CODE ÉTABLISSEMENT MIS EN ÉVIDENCE */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>VOTRE CODE ÉTABLISSEMENT :</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeValue}>{teamData?.code_etablissement || 'MQ-8492'}</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode}>
              <Text style={styles.shareBtnText}>📲 Partager</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.codeHint}>
            Transmettez ce code unique à vos gérants pour qu'ils puissent s'auto-inscrire depuis leur téléphone.
          </Text>
        </View>

        {/* CARTE QUOTAS & FORFAIT */}
        <View style={styles.quotaCard}>
          <View style={styles.quotaHeader}>
            <Text style={styles.planName}>Formule {teamData?.plan || 'Découverte'}</Text>
            <View
              style={[
                styles.quotaBadge,
                teamData?.quota_plein ? styles.quotaBadgeFull : styles.quotaBadgeOk,
              ]}
            >
              <Text style={styles.quotaBadgeText}>
                {teamData?.quota_actuel ?? 0} / {teamData?.quota_max ?? 2} Gérant(s)
              </Text>
            </View>
          </View>

          {/* BANNIÈRE UPSELL SI QUOTA ATTEINT */}
          {teamData?.quota_plein ? (
            <View style={styles.upsellBanner}>
              <Text style={styles.upsellIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.upsellTitle}>Limite de gérants atteinte !</Text>
                <Text style={styles.upsellDesc}>
                  Votre forfait limite à {teamData.quota_max} gérants. Passez à la formule supérieure pour débloquer de nouveaux accès.
                </Text>
                <TouchableOpacity
                  style={styles.upgradeBtn}
                  onPress={() => router.push('/subscription/plans' as any)}
                >
                  <Text style={styles.upgradeBtnText}>🚀 Découvrir nos offres supérieures</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.quotaAvailableText}>
              ✓ Il vous reste {(teamData?.quota_max ?? 2) - (teamData?.quota_actuel ?? 0)} place(s) disponible(s).
            </Text>
          )}
        </View>

        {/* SECTION 1 : DEMANDES EN ATTENTE */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Demandes en attente ({teamData?.en_attente.length || 0})
          </Text>
          {teamData?.en_attente.length ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>À valider</Text>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#f59e0b" style={{ marginVertical: 20 }} />
        ) : !teamData?.en_attente.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune demande d'inscription en attente.</Text>
          </View>
        ) : (
          teamData.en_attente.map((item) => {
            const isProcessing = actionId === item.id;
            return (
              <View key={item.id} style={styles.staffCard}>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{item.name}</Text>
                  <Text style={styles.staffPhone}>📞 {item.phone}</Text>
                  <Text style={styles.staffDate}>
                    Inscrit le {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>

                <View style={styles.actionButtonsRow}>
                  {/* BOUTON ACCEPTER (Grisé si quota plein) */}
                  <TouchableOpacity
                    style={[
                      styles.acceptBtn,
                      teamData?.quota_plein && styles.acceptBtnDisabled,
                    ]}
                    onPress={() => handleApprove(item)}
                    disabled={isProcessing || teamData?.quota_plein}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.acceptBtnText}>✓ Accepter</Text>
                    )}
                  </TouchableOpacity>

                  {/* BOUTON REFUSER */}
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(item)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.rejectBtnText}>✕ Refuser</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* SECTION 2 : GÉRANTS ACTIFS */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>
            Gérants Actifs ({teamData?.actifs.length || 0})
          </Text>
        </View>

        {!teamData?.actifs.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucun gérant actif pour le moment.</Text>
          </View>
        ) : (
          teamData.actifs.map((item) => (
            <View key={item.id} style={styles.activeStaffCard}>
              <View>
                <Text style={styles.activeStaffName}>{item.name}</Text>
                <Text style={styles.staffPhone}>📞 {item.phone}</Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>✓ Actif</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  backBtnText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 13,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  codeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: '#f97316',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fb923c',
    letterSpacing: 1,
    marginBottom: 6,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
  },
  shareBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  codeHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 10,
    lineHeight: 17,
  },
  quotaCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  quotaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quotaBadgeOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  quotaBadgeFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  quotaBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38bdf8',
  },
  quotaAvailableText: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 8,
    fontWeight: '600',
  },
  upsellBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 10,
  },
  upsellIcon: {
    fontSize: 20,
  },
  upsellTitle: {
    color: '#f87171',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 3,
  },
  upsellDesc: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  upgradeBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  upgradeBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  pendingBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingBadgeText: {
    color: '#090d16',
    fontWeight: '800',
    fontSize: 11,
  },
  emptyCard: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  staffCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  staffInfo: {
    marginBottom: 12,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  staffPhone: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  staffDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtnDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  acceptBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#f43f5e',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#f43f5e',
    fontWeight: '800',
    fontSize: 13,
  },
  activeStaffCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  activeStaffName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 12,
  },
});
