import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { gsmGatewayService, SmsSendResult } from './gsmGatewayService';

export interface ClientCreditConsignment {
  id: string;
  establishment_id: string;
  user_id?: string | null;
  client_phone: string;
  type: 'AVOIR' | 'CONSIGNATION';
  product_id?: string | null;
  quantity: number;
  amount: number;
  item_details: string;
  validation_code: string;
  status: 'ACTIF' | 'UTILISE' | 'EXPIRE' | 'ANNULE';
  used_at?: string | null;
  used_by?: string | null;
  created_at: string;
}

const STORAGE_KEY = '@maquissync_mobile_credits';

async function getLocalRecords(): Promise<ClientCreditConsignment[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalRecords(records: ClientCreditConsignment[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Erreur sauvegarde locale mobile crédits:', e);
  }
}

export const creditsService = {
  generatePinCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  },

  async createCreditOrConsignment(params: {
    establishmentId: string;
    userId?: string | null;
    clientPhone: string;
    type: 'AVOIR' | 'CONSIGNATION';
    productId?: string | null;
    quantity?: number;
    amount?: number;
    itemDetails: string;
    establishmentName?: string;
  }): Promise<{ success: boolean; record: ClientCreditConsignment; pinCode: string; smsResult: SmsSendResult }> {
    const pinCode = this.generatePinCode();
    const cleanPhone = (params.clientPhone || '').replace(/\s+/g, '');

    const record: ClientCreditConsignment = {
      id: 'cc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      establishment_id: params.establishmentId,
      user_id: params.userId || null,
      client_phone: cleanPhone,
      type: params.type,
      product_id: params.productId || null,
      quantity: params.quantity || 1,
      amount: params.amount || 0,
      item_details: params.itemDetails,
      validation_code: pinCode,
      status: 'ACTIF',
      used_at: null,
      used_by: null,
      created_at: new Date().toISOString()
    };

    // 1. Sauvegarde locale Offline-First
    const local = await getLocalRecords();
    local.unshift(record);
    await saveLocalRecords(local);

    // 2. Sauvegarde Supabase si disponible
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('client_credits_consignments')
          .insert([{
            establishment_id: params.establishmentId,
            user_id: params.userId && params.userId.length > 20 ? params.userId : null,
            client_phone: cleanPhone,
            type: params.type,
            product_id: params.productId || null,
            quantity: params.quantity || 1,
            amount: params.amount || 0,
            item_details: params.itemDetails,
            validation_code: pinCode,
            status: 'ACTIF'
          }])
          .select()
          .single();

        if (!error && data) {
          record.id = data.id;
        }
      } catch (err) {
        console.warn('[CreditsService Mobile] Supabase indisponible, conservé en local:', err);
      }
    }

    // 3. Envoi SMS via passerelle GSM locale
    let smsText = '';
    if (params.type === 'AVOIR') {
      smsText = gsmGatewayService.formatCreditSms({
        establishmentName: params.establishmentName,
        amount: record.amount,
        pinCode
      });
    } else {
      smsText = gsmGatewayService.formatConsignmentSms({
        establishmentName: params.establishmentName,
        itemDetails: params.itemDetails,
        quantity: record.quantity,
        pinCode
      });
    }

    const smsResult = await gsmGatewayService.sendSms(cleanPhone, smsText);

    return {
      success: true,
      record,
      pinCode,
      smsResult
    };
  },

  async findByPhoneOrCode(establishmentId: string, query: string): Promise<ClientCreditConsignment[]> {
    const cleanQuery = (query || '').trim().replace(/\s+/g, '');
    if (!cleanQuery) return [];

    let results: ClientCreditConsignment[] = [];

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
        console.warn('[CreditsService Mobile] Recherche Supabase indisponible:', err);
      }
    }

    const local = await getLocalRecords();
    const localMatches = local.filter(r => 
      r.establishment_id === establishmentId &&
      r.status === 'ACTIF' &&
      (r.validation_code === cleanQuery || r.client_phone.includes(cleanQuery))
    );

    const seen = new Set(results.map(r => r.validation_code));
    for (const item of localMatches) {
      if (!seen.has(item.validation_code)) {
        results.push(item);
        seen.add(item.validation_code);
      }
    }

    return results;
  },

  async redeemCreditOrConsignment(params: {
    establishmentId: string;
    validationCode: string;
    userId?: string | null;
    waitressName?: string;
    establishmentName?: string;
    onLocalStockDeduct?: (productId: string, qty: number) => void;
  }): Promise<{ success: boolean; message: string; record?: ClientCreditConsignment; smsResult?: SmsSendResult }> {
    const cleanCode = (params.validationCode || '').trim();
    if (!cleanCode) {
      return { success: false, message: 'Code PIN manquant' };
    }

    let redeemedRecord: ClientCreditConsignment | null = null;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.rpc('redeem_credit_consignment', {
          p_code: cleanCode,
          p_establishment_id: params.establishmentId,
          p_user_id: params.userId && params.userId.length > 20 ? params.userId : null
        });

        if (!error && data && data.success) {
          redeemedRecord = data.record;
        }
      } catch (err) {
        console.warn('[CreditsService Mobile] RPC Supabase indisponible:', err);
      }
    }

    if (!redeemedRecord) {
      const local = await getLocalRecords();
      const index = local.findIndex(
        r => r.establishment_id === params.establishmentId && 
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
      local[index].used_by = params.userId || null;
      redeemedRecord = local[index];
      await saveLocalRecords(local);
    }

    if (redeemedRecord.type === 'CONSIGNATION' && redeemedRecord.product_id && params.onLocalStockDeduct) {
      params.onLocalStockDeduct(redeemedRecord.product_id, redeemedRecord.quantity || 1);
    }

    const confirmationSms = gsmGatewayService.formatRedemptionSms({
      establishmentName: params.establishmentName,
      itemDetails: redeemedRecord.item_details,
      waitressName: params.waitressName
    });

    const smsResult = await gsmGatewayService.sendSms(redeemedRecord.client_phone, confirmationSms);

    return {
      success: true,
      message: 'Validation et déstockage réussis !',
      record: redeemedRecord,
      smsResult
    };
  }
};
