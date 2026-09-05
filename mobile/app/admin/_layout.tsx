import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import SuperAdminGuard from '../../components/SuperAdminGuard';
import { superAdminService } from '../../services/superAdminService';

export default function SuperAdminLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await superAdminService.logout();
    router.replace('/(tabs)');
  };

  const tabs = [
    { name: 'dashboard', label: 'Analyses', icon: '📊', path: '/admin/dashboard' },
    { name: 'validations', label: 'Validations', icon: '⏳', path: '/admin/validations' },
    { name: 'clients', label: 'Annuaire', icon: '🏢', path: '/admin/clients' },
    { name: 'communication', label: 'Diffusion', icon: '📣', path: '/admin/communication' },
  ];

  return (
    <SuperAdminGuard>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />

        {/* Master Super Admin Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.navBackBtn}>
            <Text style={styles.navBackText}>← App</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.neonBadge}>
              <Text style={styles.neonBadgeText}>⚡ CONSOLE SUPER ADMIN</Text>
            </View>
            <Text style={styles.brandTitle}>MaquisSaaS Central HQ</Text>
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Text style={styles.logoutBtnText}>Quitter</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Navigation Sub-Bar (4 primary tabs) */}
        <View style={styles.tabNav}>
          {tabs.map(tab => {
            const isActive = pathname.includes(tab.name);
            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => router.push(tab.path as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Active Route Content */}
        <View style={styles.content}>
          <Slot />
        </View>
      </SafeAreaView>
    </SuperAdminGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  navBackBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  navBackText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  headerCenter: {
    alignItems: 'center',
  },
  neonBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  neonBadgeText: {
    color: '#ef4444',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabItemActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  tabIcon: {
    fontSize: 15,
    marginBottom: 2,
  },
  tabLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#ef4444',
    fontWeight: '900',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#ef4444',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
});
