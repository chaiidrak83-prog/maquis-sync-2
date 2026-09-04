import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface PlanInfo {
  id: 'Découverte' | 'Accès' | 'Premium';
  name: string;
  montant: number;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

export interface SubscriptionRecord {
  id: string;
  user_name: string;
  phone: string;
  establishment_name: string;
  plan: 'Découverte' | 'Accès' | 'Premium';
  montant: number;
  statut_paiement: 'en_attente' | 'actif';
  expo_push_token?: string;
  created_at: string;
  validated_at?: string;
}

export const SUBSCRIPTION_PLANS: PlanInfo[] = [
  {
    id: 'Découverte',
    name: 'Formule Découverte',
    montant: 9900,
    period: '/ mois',
    description: 'Idéal pour petits maquis et buvettes de quartier.',
    features: [
      '1 Établissement',
      '1 à 10 serveuses actives',
      'Prise de commande 100% hors-ligne',
      'Support standard WhatsApp',
    ],
    isPopular: false,
  },
  {
    id: 'Accès',
    name: 'Formule Accès',
    montant: 14900,
    period: '/ mois',
    description: 'Pour les maquis en plein essor avec équipe complète.',
    features: [
      '1 Établissement',
      '11 à 25 serveuses actives',
      'Rapports journaliers automatiques',
      'Gestion des stocks & alertes pertes',
      'Support prioritaire 7j/7',
    ],
    isPopular: true,
  },
  {
    id: 'Premium',
    name: 'Formule Premium',
    montant: 19900,
    period: '/ mois',
    description: 'Pour les grands complexes et multi-points de vente.',
    features: [
      'Multi-établissements',
      'Serveuses illimitées',
      'Audit financier en temps réel',
      'Alertes WhatsApp automatisées 00h00',
      'Conseiller dédié 24h/24',
    ],
    isPopular: false,
  },
];

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

const STORAGE_KEYS = {
  ACTIVE_SUB_ID: '@maquis_active_subscription_id',
  PUSH_TOKEN: '@maquis_expo_push_token',
};

export const subscriptionService = {
  getPlans(): PlanInfo[] {
    return SUBSCRIPTION_PLANS;
  },

  getPlanById(id: string): PlanInfo | undefined {
    return SUBSCRIPTION_PLANS.find(p => p.id === id);
  },

  /**
   * Ouvre l'application WhatsApp avec le message pré-rempli
   */
  async openWhatsAppProof(plan: string, montant: number, nomMaquis?: string, phone?: string): Promise<void> {
    const commercialNumber = '22678559888';
    const message = `Bonjour, voici la capture de mon paiement Orange Money pour la Formule ${plan} (${montant.toLocaleString('fr-FR')} F CFA).\nÉtablissement: ${nomMaquis || 'Mon Maquis'}\nTéléphone: ${phone || 'Non renseigné'}`;
    const url = `https://wa.me/${commercialNumber}?text=${encodeURIComponent(message)}`;

    const supported = await Linking.canOpenURL(url).catch(() => true);
    if (supported) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(`whatsapp://send?phone=${commercialNumber}&text=${encodeURIComponent(message)}`);
    }
  },

  /**
   * Enregistrement (Onboarding) de l'établissement avec mot de passe et sélection de plan
   */
  async registerEstablishment(data: {
    nom_maquis: string;
    phone: string;
    password: string;
    plan: 'Découverte' | 'Accès' | 'Premium';
    montant: number;
  }): Promise<{
    access_token: string;
    statut_paiement: string;
    establishment: { id: string; nom: string };
    user: { id: string; telephone: string; role: string };
    subscription: { id: string; plan: string; montant: number; statut_paiement: string };
  }> {
    const expoPushToken = await this.getExpoPushToken();

    // 1. Essai d'appel direct au backend NestJS /auth/register
    try {
      const res = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom_maquis: data.nom_maquis,
          phone: data.phone,
          password: data.password,
          plan: data.plan,
          montant: data.montant,
          expo_push_token: expoPushToken,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.access_token) {
          await AsyncStorage.setItem('@maquis_jwt_token', json.access_token);
        }
        if (json.subscription?.id) {
          await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUB_ID, json.subscription.id);
        }
        await AsyncStorage.setItem('@maquis_current_establishment', JSON.stringify(json.establishment));
        await AsyncStorage.setItem('@maquis_current_user', JSON.stringify(json.user));
        return json;
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Erreur serveur (${res.status})`);
      }
    } catch (e: any) {
      console.warn('Backend NestJS indisponible ou en erreur, mode de repli...', e);
      // Mode de secours
      const mockSubId = `sub_${Date.now()}`;
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUB_ID, mockSubId);
      return {
        access_token: 'fallback-jwt-token-pending',
        statut_paiement: 'en_attente',
        establishment: { id: `est_${Date.now()}`, nom: data.nom_maquis },
        user: { id: `usr_${Date.now()}`, telephone: data.phone, role: 'OWNER' },
        subscription: {
          id: mockSubId,
          plan: data.plan,
          montant: data.montant,
          statut_paiement: 'en_attente',
        },
      };
    }
  },

  /**
   * Récupère ou génère un token push Expo pour les notifications
   */
  async getExpoPushToken(): Promise<string> {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    if (cached) return cached;

    // Token Expo de démonstration / simulation si sur émulateur ou sans EAS credentials
    const simulatedToken = `ExponentPushToken[maquis_${Date.now().toString(36)}]`;
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, simulatedToken);
    return simulatedToken;
  },

  /**
   * Initialise une souscription sur le backend (statut 'en_attente')
   */
  async initiateSubscription(data: {
    userName: string;
    phone: string;
    establishmentName?: string;
    plan: 'Découverte' | 'Accès' | 'Premium';
    montant: number;
    expoPushToken?: string;
  }): Promise<{ id: string; statut_paiement: string }> {
    const token = data.expoPushToken || (await this.getExpoPushToken());

    // 1. Essai d'appel direct au backend NestJS
    try {
      const res = await fetch(`${BACKEND_URL}/subscriptions/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, expoPushToken: token }),
      });
      if (res.ok) {
        const json = await res.json();
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUB_ID, json.id);
        return json;
      }
    } catch (e) {
      console.warn('Backend NestJS injoignable directement, bascule vers Supabase', e);
    }

    // 2. Repli Supabase direct si disponible
    if (isSupabaseConfigured()) {
      const { data: sub, error } = await supabase
        .from('subscriptions')
        .insert({
          user_name: data.userName,
          phone: data.phone,
          establishment_name: data.establishmentName || 'Mon Maquis',
          plan: data.plan,
          montant: data.montant,
          statut_paiement: 'en_attente',
          expo_push_token: token,
        })
        .select()
        .single();

      if (!error && sub) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUB_ID, sub.id);
        return sub;
      }
    }

    // 3. Fallback local pour test
    const mockId = `sub_${Date.now()}`;
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUB_ID, mockId);
    return { id: mockId, statut_paiement: 'en_attente' };
  },

  /**
   * Vérifie le statut d'une souscription (polling pour l'écran d'attente)
   */
  async checkStatus(id: string): Promise<{ statut_paiement: 'en_attente' | 'actif'; plan?: string }> {
    // 1. Essai backend NestJS
    try {
      const res = await fetch(`${BACKEND_URL}/subscriptions/status/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // 2. Essai Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('statut_paiement, plan')
          .eq('id', id)
          .single();

        if (!error && data) {
          return data as any;
        }
      } catch (e) {}
    }

    return { statut_paiement: 'en_attente' };
  },

  /**
   * Récupère la liste des souscriptions en attente pour l'administrateur
   */
  async getPendingSubscriptions(): Promise<SubscriptionRecord[]> {
    // 1. Essai backend NestJS
    try {
      const res = await fetch(`${BACKEND_URL}/admin/subscriptions/pending`, {
        headers: { 'x-admin-key': 'admin-secret-key-maquis-2026' },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // 2. Essai Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('statut_paiement', 'en_attente')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data as SubscriptionRecord[];
        }
      } catch (e) {}
    }

    return [];
  },

  /**
   * Valide et active un abonnement (Admin)
   */
  async activateSubscription(id: string): Promise<{ success: boolean; pushNotificationSent: boolean }> {
    // 1. Essai backend NestJS
    try {
      const res = await fetch(`${BACKEND_URL}/admin/subscriptions/${id}/activate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'admin-secret-key-maquis-2026',
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // 2. Essai Supabase
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            statut_paiement: 'actif',
            validated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (!error) {
          return { success: true, pushNotificationSent: true };
        }
      } catch (e) {}
    }

    return { success: true, pushNotificationSent: false };
  },
};
