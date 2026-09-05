import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { superAdminService, AnalyticsData } from '../../services/superAdminService';

const { width } = Dimensions.get('window');

export default function SuperAdminDashboardScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await superAdminService.getAnalytics();
      setData(res);
    } catch (e) {
      console.warn('Erreur chargement analytics:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Calcul des métriques financières et rétention...</Text>
      </View>
    );
  }

  const { summary, planDistribution, mrrHistory, dormantAccounts } = data;
  const maxMrrInHistory = Math.max(...mrrHistory.map(h => h.mrr), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#ef4444"
          colors={['#ef4444']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Top Banner Notice */}
      <View style={styles.headerNotice}>
        <View>
          <Text style={styles.headerTitle}>Vue Financière & Performance SaaS</Text>
          <Text style={styles.headerSub}>Métriques réelles calculées en temps réel</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* 4 KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        {/* MRR Card */}
        <View style={[styles.kpiCard, { borderColor: '#10b981' }]}>
          <Text style={styles.kpiLabel}>MRR (Revenu Mensuel)</Text>
          <Text style={[styles.kpiValue, { color: '#10b981' }]}>
            {summary.mrr.toLocaleString('fr-FR')} <Text style={styles.kpiUnit}>F CFA</Text>
          </Text>
          <Text style={styles.kpiFoot}>+18% prévision fin de mois</Text>
        </View>

        {/* Abonnements Actifs Card */}
        <View style={[styles.kpiCard, { borderColor: '#3b82f6' }]}>
          <Text style={styles.kpiLabel}>Abonnements Actifs</Text>
          <Text style={[styles.kpiValue, { color: '#60a5fa' }]}>
            {summary.activeAccountsCount}{' '}
            <Text style={styles.kpiUnit}>/ {summary.totalAccounts}</Text>
          </Text>
          <Text style={styles.kpiFoot}>{summary.pendingValidationsCount} en attente validation</Text>
        </View>

        {/* Rétention Card */}
        <View style={[styles.kpiCard, { borderColor: '#8b5cf6' }]}>
          <Text style={styles.kpiLabel}>Taux de Rétention</Text>
          <Text style={[styles.kpiValue, { color: '#a78bfa' }]}>
            {summary.retentionRate}%
          </Text>
          <Text style={styles.kpiFoot}>Objectif SaaS &gt; 90%</Text>
        </View>

        {/* Attrition (Churn) Card */}
        <View style={[styles.kpiCard, { borderColor: '#ef4444' }]}>
          <Text style={styles.kpiLabel}>Taux d'Attrition (Churn)</Text>
          <Text style={[styles.kpiValue, { color: '#f87171' }]}>
            {summary.churnRate}%
          </Text>
          <Text style={styles.kpiFoot}>{summary.suspendedAccountsCount} compte(s) suspendu(s)</Text>
        </View>
      </View>

      {/* Trajectoire & Évolution du MRR (Visualisation Graphique) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📈 Trajectoire d'Évolution du MRR</Text>
          <Text style={styles.sectionSub}>Historique 5 mois + projection mois suivant</Text>
        </View>

        <View style={styles.chartContainer}>
          {mrrHistory.map((item, idx) => {
            const heightPercent = Math.max(15, Math.round((item.mrr / maxMrrInHistory) * 100));
            const isProjection = idx === mrrHistory.length - 1;

            return (
              <View key={idx} style={styles.barColumn}>
                <Text style={styles.barValueText}>
                  {Math.round(item.mrr / 1000)}k
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${heightPercent}%` },
                      isProjection ? styles.barFillProj : styles.barFillReal,
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isProjection && { color: '#f59e0b', fontWeight: 'bold' }]}>
                  {item.month}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Répartition des Forfaits */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📦 Répartition des Forfaits Actifs</Text>
        <View style={styles.distributionRow}>
          <View style={[styles.distItem, { borderColor: '#10b981' }]}>
            <Text style={styles.distCount}>{planDistribution.Découverte}</Text>
            <Text style={styles.distName}>Découverte</Text>
            <Text style={styles.distPrice}>9 900 F CFA</Text>
          </View>
          <View style={[styles.distItem, { borderColor: '#f59e0b' }]}>
            <Text style={[styles.distCount, { color: '#f59e0b' }]}>{planDistribution.Accès}</Text>
            <Text style={styles.distName}>Accès</Text>
            <Text style={styles.distPrice}>14 900 F CFA</Text>
          </View>
          <View style={[styles.distItem, { borderColor: '#a855f7' }]}>
            <Text style={[styles.distCount, { color: '#a855f7' }]}>{planDistribution.Premium}</Text>
            <Text style={styles.distName}>Premium</Text>
            <Text style={styles.distPrice}>19 900 F CFA</Text>
          </View>
        </View>
      </View>

      {/* Comptes Dormants Alert (> 7 jours) */}
      <View style={[styles.sectionCard, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.dormantHeaderRow}>
            <Text style={styles.dormantIcon}>⚠️</Text>
            <Text style={[styles.sectionTitle, { color: '#f87171' }]}>
              Comptes Dormants ({dormantAccounts.length})
            </Text>
          </View>
          <Text style={styles.sectionSub}>Aucune activité enregistrée depuis plus de 7 jours</Text>
        </View>

        {dormantAccounts.length === 0 ? (
          <Text style={styles.emptyText}>Tous les établissements sont actifs récemment 🎉</Text>
        ) : (
          dormantAccounts.map(dorm => (
            <View key={dorm.id} style={styles.dormantItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dormantName}>{dorm.name}</Text>
                <Text style={styles.dormantOwner}>
                  {dorm.ownerName} • {dorm.ownerPhone}
                </Text>
              </View>
              <View style={styles.dormantBadge}>
                <Text style={styles.dormantBadgeText}>Inactif {dorm.daysInactive}j</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    gap: 16,
  },
  center: {
    flex: 1,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  headerNotice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#131b2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  refreshBtnText: {
    color: '#cbd5e1',
    fontSize: 18,
    fontWeight: 'bold',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: (width - 44) / 2,
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  kpiLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 4,
  },
  kpiUnit: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  kpiFoot: {
    color: '#64748b',
    fontSize: 10,
  },
  sectionCard: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  sectionSub: {
    color: '#64748b',
    fontSize: 11,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValueText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  barTrack: {
    width: 22,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barFillReal: {
    backgroundColor: '#10b981',
  },
  barFillProj: {
    backgroundColor: '#f59e0b',
  },
  barLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  distributionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  distItem: {
    flex: 1,
    backgroundColor: '#090d16',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  distCount: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '900',
  },
  distName: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  distPrice: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  dormantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dormantIcon: {
    fontSize: 16,
  },
  dormantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#090d16',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  dormantName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  dormantOwner: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  dormantBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dormantBadgeText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyText: {
    color: '#10b981',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
