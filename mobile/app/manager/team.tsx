import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { teamService, ServeusesTeamResponse, StaffMember } from '@/services/teamService';

export default function ManagerTeamScreen() {
  const router = useRouter();
  const [teamData, setTeamData] = useState<ServeusesTeamResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await teamService.getServeuses();
      setTeamData(data);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de charger les serveuses.');
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
        message: `Bonjour ! Voici le code pour rejoindre le maquis "${teamData.nom_maquis}" en tant que Serveuse : ${teamData.code_etablissement}\nTélécharge l'application MaquisSaaS et saisis ce code à l'inscription.`,
      });
    } catch (e) {}
  };

  const handleApprove = async (serveuse: StaffMember) => {
    setActionId(serveuse.id);
    try {
      await teamService.approuverServeuse(serveuse.id);
      Alert.alert(
        'Serveuse Validée ! 🎉',
        `${serveuse.name} a désormais accès à la prise de commande visuelle.`,
      );
      loadTeam();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec lors de l’approbation.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = (serveuse: StaffMember) => {
    Alert.alert(
      'Refuser la serveuse',
      `Voulez-vous refuser l'accès à ${serveuse.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            setActionId(serveuse.id);
            try {
              await teamService.rejeterServeuse(serveuse.id);
              Alert.alert('Demande Refusée', 'L’accès a été rejeté.');
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
        <Text style={styles.headerTitle}>Mon Équipe Serveuses</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* CARTE CODE ÉTABLISSEMENT MIS EN ÉVIDENCE */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>CODE ÉTABLISSEMENT POUR SERVEUSES :</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeValue}>{teamData?.code_etablissement || 'MQ-8492'}</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode}>
              <Text style={styles.shareBtnText}>📲 Partager</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.codeHint}>
            Donnez ce code à vos serveuses pour qu'elles puissent s'inscrire depuis leur écran d'accueil.
          </Text>
        </View>

        {/* SECTION 1 : NOUVELLES SERVEUSES EN ATTENTE */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Nouvelles serveuses (En attente) ({teamData?.en_attente.length || 0})
          </Text>
          {teamData?.en_attente.length ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>À valider</Text>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#10b981" style={{ marginVertical: 20 }} />
        ) : !teamData?.en_attente.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune nouvelle serveuse en attente.</Text>
          </View>
        ) : (
          teamData.en_attente.map((item) => {
            const isProcessing = actionId === item.id;
            return (
              <View key={item.id} style={styles.staffCard}>
                <View style={styles.staffInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.waitressIcon}>🍹</Text>
                    <Text style={styles.staffName}>{item.name}</Text>
                  </View>
                  <Text style={styles.staffPhone}>📞 {item.phone}</Text>
                  <Text style={styles.staffDate}>
                    Inscrite le {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>

                <View style={styles.actionButtonsRow}>
                  {/* BOUTON ACCEPTER (VERT) */}
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleApprove(item)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.acceptBtnText}>✓ Accepter</Text>
                    )}
                  </TouchableOpacity>

                  {/* BOUTON REFUSER (ROUGE) */}
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

        {/* SECTION 2 : SERVEUSES ACTIVES */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>
            Serveuses Actives ({teamData?.actives.length || 0})
          </Text>
        </View>

        {!teamData?.actives.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune serveuse active pour le moment.</Text>
          </View>
        ) : (
          teamData.actives.map((item) => (
            <View key={item.id} style={styles.activeStaffCard}>
              <View style={styles.nameRow}>
                <Text style={styles.activeIcon}>✨</Text>
                <View>
                  <Text style={styles.activeStaffName}>{item.name}</Text>
                  <Text style={styles.staffPhone}>📞 {item.phone}</Text>
                </View>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>✓ Caisse Active</Text>
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
    borderColor: '#10b981',
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34d399',
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
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareBtnText: {
    color: '#090d16',
    fontWeight: '800',
    fontSize: 13,
  },
  codeHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 10,
    lineHeight: 17,
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
    backgroundColor: '#10b981',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waitressIcon: {
    fontSize: 18,
  },
  activeIcon: {
    fontSize: 16,
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
