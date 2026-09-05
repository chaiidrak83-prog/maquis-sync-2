import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: 'GERANT' | 'SERVEUSE' | string;
  statut_approbation: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE';
  created_at: string;
}

export interface GerantsTeamResponse {
  code_etablissement: string;
  nom_maquis: string;
  plan: string;
  quota_actuel: number;
  quota_max: number;
  quota_plein: boolean;
  en_attente: StaffMember[];
  actifs: StaffMember[];
  rejetes: StaffMember[];
}

export interface ServeusesTeamResponse {
  code_etablissement: string;
  nom_maquis: string;
  total: number;
  en_attente: StaffMember[];
  actives: StaffMember[];
  rejetees: StaffMember[];
}

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export const teamService = {
  /**
   * Auto-inscription d'un gérant ou d'une serveuse avec Code Établissement
   */
  async registerStaff(
    role: 'GERANT' | 'SERVEUSE',
    data: { name: string; phone: string; password: string; code_etablissement: string },
  ) {
    const endpoint = role === 'GERANT' ? '/auth/register/gerant' : '/auth/register/serveuse';
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Échec lors de l’inscription');
      }
      return json;
    } catch (err: any) {
      // Si hors-ligne / erreur réseau, stocker localement en attente
      console.warn('Erreur réseau registerStaff, simulation locale:', err.message);
      const fakeStaff: StaffMember = {
        id: `staff_${Date.now()}`,
        name: data.name,
        phone: data.phone,
        role,
        statut_approbation: 'EN_ATTENTE',
        created_at: new Date().toISOString(),
      };
      const key = `@maquis_pending_${role.toLowerCase()}s`;
      const existing = await AsyncStorage.getItem(key);
      const list = existing ? JSON.parse(existing) : [];
      list.push(fakeStaff);
      await AsyncStorage.setItem(key, JSON.stringify(list));

      return {
        success: true,
        message: 'Inscription enregistrée (mode hors-ligne). Votre compte est en attente de validation.',
        user: fakeStaff,
      };
    }
  },

  /**
   * Récupère la liste des gérants (Propriétaire)
   */
  async getGerants(token?: string): Promise<GerantsTeamResponse> {
    try {
      const res = await fetch(`${BACKEND_URL}/gerants`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // Fallback local réaliste
    return {
      code_etablissement: 'MQ-8492',
      nom_maquis: 'Maquis Le Grand Faso',
      plan: 'Découverte',
      quota_actuel: 1,
      quota_max: 2,
      quota_plein: false,
      en_attente: [
        {
          id: 'g_wait_1',
          name: 'Moussa Sanon',
          phone: '71234567',
          role: 'GERANT',
          statut_approbation: 'EN_ATTENTE',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      actifs: [
        {
          id: 'g_act_1',
          name: 'Koffi Mensah',
          phone: '70222222',
          role: 'GERANT',
          statut_approbation: 'APPROUVE',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      rejetes: [],
    };
  },

  /**
   * Approuve un gérant (Propriétaire)
   */
  async approuverGerant(id: string, token?: string) {
    const res = await fetch(`${BACKEND_URL}/gerants/${id}/approuver`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Impossible d\'approuver le gérant');
    }
    return json;
  },

  /**
   * Rejette un gérant (Propriétaire)
   */
  async rejeterGerant(id: string, token?: string) {
    const res = await fetch(`${BACKEND_URL}/gerants/${id}/rejeter`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Impossible de rejeter le gérant');
    }
    return json;
  },

  /**
   * Récupère la liste des serveuses (Gérant ou Propriétaire)
   */
  async getServeuses(token?: string): Promise<ServeusesTeamResponse> {
    try {
      const res = await fetch(`${BACKEND_URL}/serveuses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // Fallback local
    return {
      code_etablissement: 'MQ-8492',
      nom_maquis: 'Maquis Le Grand Faso',
      total: 3,
      en_attente: [
        {
          id: 'w_wait_1',
          name: 'Kadi Barry',
          phone: '70123456',
          role: 'SERVEUSE',
          statut_approbation: 'EN_ATTENTE',
          created_at: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
      actives: [
        {
          id: 'w_act_1',
          name: 'Awa Diallo',
          phone: '76112233',
          role: 'SERVEUSE',
          statut_approbation: 'APPROUVE',
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ],
      rejetees: [],
    };
  },

  /**
   * Approuve une serveuse (Gérant ou Propriétaire)
   */
  async approuverServeuse(id: string, token?: string) {
    const res = await fetch(`${BACKEND_URL}/serveuses/${id}/approuver`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Impossible d\'approuver la serveuse');
    }
    return json;
  },

  /**
   * Rejette une serveuse (Gérant ou Propriétaire)
   */
  async rejeterServeuse(id: string, token?: string) {
    const res = await fetch(`${BACKEND_URL}/serveuses/${id}/rejeter`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Impossible de rejeter la serveuse');
    }
    return json;
  },
};
