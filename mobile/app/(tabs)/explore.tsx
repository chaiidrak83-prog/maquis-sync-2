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
} from 'react-native';
import { posService, User, Sale } from '@/services/posService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function ShiftScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [shiftSales, setShiftSales] = useState<Sale[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  const loadShiftData = useCallback(async () => {
    const user = await posService.getStoredUser();
    setCurrentUser(user);

    const sales = await posService.getShiftSales();
    setShiftSales(sales);

    const count = await posService.getOfflineQueueCount();
    setPendingSyncCount(count);
  }, []);

  useEffect(() => {
    loadShiftData();
  }, [loadShiftData]);

  // Pointage arrivée / départ
  const handleToggleCheckIn = async () => {
    if (!currentUser) return;

    if (!isCheckedIn) {
      const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setIsCheckedIn(true);
      setCheckInTime(now);

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('attendances').insert({
            establishment_id: currentUser.establishment_id,
            user_id: currentUser.id,
            check_in: new Date().toISOString(),
            check_in_method: 'MANUAL',
          });
        } catch (e) {
          console.warn('Erreur pointage Supabase:', e);
        }
      }

      Alert.alert('Service Démarré', `Pointage arrivée enregistré à ${now}`);
    } else {
      Alert.alert(
        'Clôturer le service',
        'Voulez-vous clôturer votre shift et pointer votre départ ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer Départ',
            onPress: () => {
              setIsCheckedIn(false);
              setCheckInTime(null);
              Alert.alert('Service Clôturé', 'Bon repos ! Vos ventes sont conservées pour le rapport.');
            },
          },
        ]
      );
    }
  };

  // Synchronisation manuelle
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await posService.syncOfflineQueue();
      setPendingSyncCount(result.remainingCount);
      Alert.alert(
        'Synchronisation terminée',
        `${result.syncedCount} vente(s) synchronisée(s). Restantes : ${result.remainingCount}`
      );
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec de synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  // Déconnexion
  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter de la caisse ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await posService.logout();
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const totalShiftAmount = shiftSales.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Shift & Présences</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Quitter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* CARTE POINTAGE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pointage Présence</Text>
          <Text style={styles.cardSubtitle}>
            {isCheckedIn
              ? `En service depuis ${checkInTime}`
              : 'Vous n’êtes pas actuellement pointée'}
          </Text>

          <TouchableOpacity
            style={[styles.checkInBtn, isCheckedIn && styles.checkOutBtn]}
            onPress={handleToggleCheckIn}
          >
            <Text style={styles.checkInBtnText}>
              {isCheckedIn ? '⏹ Pointer mon départ' : '▶ Pointer mon arrivée'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* CARTE SYNCHRONISATION */}
        <View style={styles.card}>
          <View style={styles.syncRow}>
            <View>
              <Text style={styles.cardTitle}>Synchronisation Supabase</Text>
              <Text style={styles.cardSubtitle}>
                {pendingSyncCount > 0
                  ? `${pendingSyncCount} vente(s) enregistrée(s) hors-ligne`
                  : 'Toutes les ventes sont synchronisées'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
              onPress={handleManualSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.syncBtnText}>Synchroniser</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* STATISTIQUES DU SHIFT */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Ventes du shift</Text>
            <Text style={styles.statValue}>{shiftSales.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Recette générée</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>
              {totalShiftAmount.toLocaleString()} F
            </Text>
          </View>
        </View>

        {/* HISTORIQUE DES VENTES */}
        <Text style={styles.sectionTitle}>Historique de mes commandes :</Text>
        {shiftSales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune commande passée sur ce shift.</Text>
          </View>
        ) : (
          <FlatList
            data={shiftSales}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.saleItemCard}>
                <View style={styles.saleItemHeader}>
                  <Text style={styles.saleItemTime}>
                    {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text
                    style={[
                      styles.saleItemStatus,
                      item.is_synced ? styles.syncedText : styles.pendingText,
                    ]}
                  >
                    {item.is_synced ? '✓ Cloud' : '⏳ En attente'}
                  </Text>
                </View>

                <View style={styles.saleItemBody}>
                  <Text style={styles.saleItemMethod}>
                    {item.payment_method === 'CASH' ? '💵 Espèces' : '📱 Mobile Money'}
                  </Text>
                  <Text style={styles.saleItemAmount}>
                    {item.total_amount.toLocaleString()} FCFA
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#f43f5e',
    fontWeight: '700',
    fontSize: 13,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
    marginBottom: 12,
  },
  checkInBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkOutBtn: {
    backgroundColor: '#f43f5e',
  },
  checkInBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  syncBtnDisabled: {
    backgroundColor: '#64748b',
  },
  syncBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 10,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  saleItemCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  saleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  saleItemTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  saleItemStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncedText: {
    color: '#10b981',
  },
  pendingText: {
    color: '#f59e0b',
  },
  saleItemBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleItemMethod: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  saleItemAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
});
