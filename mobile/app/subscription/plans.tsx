import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SUBSCRIPTION_PLANS, PlanInfo } from '../../services/subscriptionService';

export default function PlansScreen() {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState<'Découverte' | 'Accès' | 'Premium'>('Accès');

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[1];

  const handleSelectPlan = (plan: PlanInfo) => {
    setSelectedPlanId(plan.id);
  };

  const handleProceedToCheckout = () => {
    router.push({
      pathname: '/subscription/register' as any,
      params: {
        plan: selectedPlan.id,
        montant: selectedPlan.montant.toString(),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />
      
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Formules d'Abonnement</Text>
          <Text style={styles.headerSubtitle}>Choisissez le forfait adapté à votre établissement</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Trial banner */}
        <View style={styles.trialBanner}>
          <Text style={styles.trialBannerTitle}>🎁 7 JOURS D'ESSAI GRATUIT INCLUS</Text>
          <Text style={styles.trialBannerText}>
            Testez toutes les fonctionnalités en toute sérénité sans engagement.
          </Text>
        </View>

        {/* Plans List */}
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.85}
              onPress={() => handleSelectPlan(plan)}
              style={[
                styles.planCard,
                isSelected && styles.planCardSelected,
                plan.isPopular && styles.planCardPopular,
              ]}
            >
              {plan.isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>LE PLUS POPULAIRE</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>
                <View style={styles.radioCircle}>
                  {isSelected && <View style={styles.radioInnerCircle} />}
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceAmount}>{plan.montant.toLocaleString('fr-FR')} F CFA</Text>
                <Text style={styles.pricePeriod}>{plan.period}</Text>
              </View>

              <View style={styles.divider} />

              {/* Features list */}
              <View style={styles.featuresList}>
                {plan.features.map((feat, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Text style={styles.checkIcon}>✓</Text>
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Floating Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomSelectedPlan}>{selectedPlan.name}</Text>
          <Text style={styles.bottomPrice}>{selectedPlan.montant.toLocaleString('fr-FR')} F CFA / mois</Text>
        </View>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleProceedToCheckout}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continuer ➔</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 14,
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
  headerTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  trialBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  trialBannerTitle: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  trialBannerText: {
    color: '#cbd5e1',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  planCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#142334',
  },
  planCardPopular: {
    borderColor: '#f59e0b',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 18,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#090d16',
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  planDescription: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
  },
  priceAmount: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '900',
  },
  pricePeriod: {
    color: '#64748b',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 12,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIcon: {
    color: '#10b981',
    fontWeight: '900',
    fontSize: 14,
  },
  featureText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#090d16',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomInfo: {
    flex: 1,
  },
  bottomSelectedPlan: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomPrice: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  continueButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  continueButtonText: {
    color: '#090d16',
    fontWeight: '900',
    fontSize: 14,
  },
});
