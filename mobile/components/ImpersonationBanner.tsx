import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { superAdminService } from '../services/superAdminService';

export default function ImpersonationBanner() {
  const router = useRouter();
  const [impersonation, setImpersonation] = useState<{ isActive: boolean; targetName?: string }>({
    isActive: false,
  });

  const checkState = async () => {
    const state = await superAdminService.getImpersonationState();
    setImpersonation(state);
  };

  useEffect(() => {
    checkState();
    const interval = setInterval(checkState, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!impersonation.isActive) {
    return null;
  }

  const handleStop = async () => {
    await superAdminService.stopImpersonation();
    setImpersonation({ isActive: false });
    router.replace('/admin/clients' as any);
  };

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <View style={styles.indicator} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>MODE SUPPORT TECHNIQUE ACTIF</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Connecté en tant que : {impersonation.targetName || 'Client'}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={handleStop} style={styles.button} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Quitter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fef08a',
  },
  title: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#fee2e2',
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '800',
  },
});
