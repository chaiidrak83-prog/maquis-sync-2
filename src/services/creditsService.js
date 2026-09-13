import { supabase, isSupabaseConfigured } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'maquissync_local_credits_consignments';

// Helper pour le stockage local hors-ligne
function getLocalRecords() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRecords(records) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Erreur cache local crédits:', e);
  }
}

export const creditsService = {
  /**
   * Génère un code PIN aléatoire sécurisé à 4 chiffres
   */
  generatePinCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  },

  /**
   * Crée un Avoir (monnaie manquante) ou une Consignation (boisson laissée au frais)
   */
  async createCreditOrConsignment({
    establishmentId,
    userId = null,
    clientPhone,
    type, // 'AVOIR' | 'CONSIGNATION'
    productId = null,
    quantity = 1,
    amount = 0,
    itemDetails,
    establishmentName = 'MaquisSync'
  }) {
    const pinCode = this.generatePinCode();
    const cleanPhone = (clientPhone || '').replace(/\s+/g, '');

    const record = {
      id: 'cc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      establishment_id: establishmentId,
      user_id: userId,
      client_phone: cleanPhone,
      type,
      product_id: productId,
      quantity: Number(quantity) || 1,
      amount: Number(amount) || 0,
      item_details: itemDetails,
      validation_code: pinCode,
      status: 'ACTIF',
      used_at: null,
      used_by: null,
      created_at: new Date().toISOString()
    };

    // 1. Sauvegarde locale immédiate (Offline-First)
    const local = getLocalRecords();
    local.unshift(record);
    saveLocalRecords(local);

    // 2. Sauvegarde Supabase si connecté
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('client_credits_consignments')
          .insert([{
            establishment_id: establishmentId,
            user_id: userId && userId.length > 20 ? userId : null,
            client_phone: cleanPhone,
            type,
            product_id: productId,
            quantity: Number(quantity) || 1,
            amount: Number(amount) || 0,
            item_details: itemDetails,
            validation_code: pinCode,
            status: 'ACTIF'
          }])
          .select()
          .single();

        if (!error && data) {
          record.id = data.id;
        }
      } catch (err) {
        console.warn('[CreditsService] Sauvegarde Supabase échouée, conservation en local:', err);
      }
    }

    return {
      success: true,
      record,
      pinCode
    };
  },

  /**
   * Recherche un avoir ou une consignation active par code PIN ou par numéro de téléphone
   */
  async findByPhoneOrCode(establishmentId, query) {
    const cleanQuery = (query || '').trim().replace(/\s+/g, '');
    if (!cleanQuery) return [];

    let results = [];

    // 1. Recherche Supabase si connecté
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('client_credits_consignments')
          .select('*')
          .eq('establishment_id', establishmentId)
          .eq('status', 'ACTIF')
          .or(`validation_code.eq.${cleanQuery},client_phone.ilike.%${cleanQuery}%`);

        if (!error && data) {
          results = data;
        }
      } catch (err) {
        console.warn('[CreditsService] Recherche Supabase indisponible:', err);
      }
    }

    // 2. Recherche et fusion avec le cache local
    const local = getLocalRecords();
    const localMatches = local.filter(r => 
      r.establishment_id === establishmentId &&
      r.status === 'ACTIF' &&
      (r.validation_code === cleanQuery || r.client_phone.includes(cleanQuery))
    );

    // Dédoublonnage par validation_code
    const seen = new Set(results.map(r => r.validation_code));
    for (const item of localMatches) {
      if (!seen.has(item.validation_code)) {
        results.push(item);
        seen.add(item.validation_code);
      }
    }

    return results;
  },

  /**
   * Récupère tous les crédits/consignations actifs pour un établissement
   */
  async getActiveCredits(establishmentId) {
    let results = [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('client_credits_consignments')
          .select('*')
          .eq('establishment_id', establishmentId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          results = data;
        }
      } catch (err) {
        console.warn('[CreditsService] Liste Supabase indisponible:', err);
      }
    }

    const local = getLocalRecords().filter(r => r.establishment_id === establishmentId);
    const seen = new Set(results.map(r => r.validation_code));
    for (const item of local) {
      if (!seen.has(item.validation_code)) {
        results.push(item);
        seen.add(item.validation_code);
      }
    }

    return results;
  },

  /**
   * Valide un code PIN en caisse, déstocke automatiquement le produit si consignation,
   * et envoie un SMS de confirmation au client
   */
  async redeemCreditOrConsignment({
    establishmentId,
    validationCode,
    userId = null,
    waitressName = 'notre équipe',
    establishmentName = 'MaquisSync',
    onLocalStockDeduct = null // Callback pour déstocker dans le state React local si présent
  }) {
    const cleanCode = (validationCode || '').trim();
    if (!cleanCode) {
      return { success: false, message: 'Veuillez saisir un code PIN valide.' };
    }

    let redeemedRecord = null;

    // 1. Tenter la validation via la fonction RPC PostgreSQL atomique
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.rpc('redeem_credit_consignment', {
          p_code: cleanCode,
          p_establishment_id: establishmentId,
          p_user_id: userId && userId.length > 20 ? userId : null
        });

        if (!error && data && data.success) {
          redeemedRecord = data.record;
        }
      } catch (err) {
        console.warn('[CreditsService] RPC Supabase indisponible, traitement en mode local:', err);
      }
    }

    // 2. Traitement local si Supabase n'a pas répondu
    if (!redeemedRecord) {
      const local = getLocalRecords();
      const index = local.findIndex(
        r => r.establishment_id === establishmentId && 
             r.validation_code === cleanCode && 
             r.status === 'ACTIF'
      );

      if (index === -1) {
        return {
          success: false,
          message: 'Code PIN introuvable, expiré ou déjà utilisé.'
        };
      }

      local[index].status = 'UTILISE';
      local[index].used_at = new Date().toISOString();
      local[index].used_by = userId;
      redeemedRecord = local[index];
      saveLocalRecords(local);
    }

    // 3. Déstockage physique dans le state applicatif si callback fourni
    if (redeemedRecord.type === 'CONSIGNATION' && redeemedRecord.product_id && onLocalStockDeduct) {
      onLocalStockDeduct(redeemedRecord.product_id, redeemedRecord.quantity || 1);
    }

    return {
      success: true,
      message: 'Validation et déstockage effectués avec succès !',
      record: redeemedRecord
    };
  }
};
