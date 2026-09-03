import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Product {
  id: string;
  establishment_id?: string;
  name: string;
  volume: string;
  price: number;
  current_stock: number;
}

export interface User {
  id: string;
  establishment_id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
}

export interface CartItem {
  productId: string;
  name: string;
  volume: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  establishment_id: string;
  user_id: string;
  waitress_name: string;
  total_amount: number;
  payment_method: 'CASH' | 'MOBILE_MONEY';
  created_at: string;
  is_synced: boolean;
  items: CartItem[];
}

const STORAGE_KEYS = {
  CURRENT_USER: '@maquis_current_waitress',
  CACHED_PRODUCTS: '@maquis_cached_products',
  OFFLINE_SALES: '@maquis_offline_sales_queue',
  SHIFT_SALES: '@maquis_shift_sales',
};

// Produits de secours locaux si pas de réseau au premier lancement
const FALLBACK_PRODUCTS: Product[] = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'Brakina', volume: '65cl', price: 900, current_stock: 120 },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'Sobebra', volume: '65cl', price: 1000, current_stock: 80 },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'Guinness', volume: '33cl', price: 1200, current_stock: 15 },
  { id: 'c0000000-0000-0000-0000-000000000004', name: 'Laafi (Eau)', volume: '1.5L', price: 500, current_stock: 4 },
];

export const posService = {
  // --- AUTHENTIFICATION SERVEUSE ---
  async loginWaitress(phone: string, pin: string): Promise<User> {
    if (!isSupabaseConfigured()) {
      // Mode démo hors-ligne
      if (pin === '3333' || pin === '1111' || pin === '2222') {
        const demoUser: User = {
          id: 'b0000000-0000-0000-0000-000000000003',
          establishment_id: 'a0000000-0000-0000-0000-000000000001',
          name: phone === '70123456' ? 'Awa Diallo' : 'Serveuse Démo',
          phone,
          role: 'WAITRESS',
          status: 'VALIDATED',
        };
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
        return demoUser;
      }
      throw new Error('Téléphone ou code PIN incorrect');
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('pin_hash', pin)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error('Téléphone ou code PIN incorrect');
      }

      if (data.status !== 'VALIDATED') {
        throw new Error(`Compte en attente de validation (${data.status}). Veuillez contacter le gérant.`);
      }

      const user: User = {
        id: data.id,
        establishment_id: data.establishment_id,
        name: data.name,
        phone: data.phone,
        role: data.role,
        status: data.status,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    } catch (err: any) {
      // Si réseau indisponible, vérifier le cache de la dernière serveuse connectée
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (cached) {
        const cachedUser: User = JSON.parse(cached);
        if (cachedUser.phone === phone) {
          return cachedUser;
        }
      }
      throw err;
    }
  },

  async getStoredUser(): Promise<User | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  // --- CATALOGUE DE BOISSONS & CACHE HORS-LIGNE ---
  async getProducts(establishmentId?: string): Promise<Product[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('products').select('*').eq('is_active', true).order('name');
        if (establishmentId) {
          query = query.eq('establishment_id', establishmentId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped = data.map(p => ({
            id: p.id,
            establishment_id: p.establishment_id,
            name: p.name,
            volume: p.volume,
            price: Number(p.price),
            current_stock: p.current_stock,
          }));
          await AsyncStorage.setItem(STORAGE_KEYS.CACHED_PRODUCTS, JSON.stringify(mapped));
          return mapped;
        }
      } catch (e) {
        console.warn('Erreur lecture Supabase produits, utilisation du cache local');
      }
    }

    // Récupération depuis le cache local AsyncStorage
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_PRODUCTS);
    if (cached) {
      return JSON.parse(cached);
    }

    return FALLBACK_PRODUCTS;
  },

  // --- PRISE DE COMMANDE & GESTION HORS-LIGNE ---
  async recordSale(sale: Sale, isOnline: boolean): Promise<{ success: boolean; synced: boolean }> {
    // 1. Sauvegarder dans l'historique du shift local
    const shiftRaw = await AsyncStorage.getItem(STORAGE_KEYS.SHIFT_SALES);
    const shiftSales: Sale[] = shiftRaw ? JSON.parse(shiftRaw) : [];
    shiftSales.unshift(sale);
    await AsyncStorage.setItem(STORAGE_KEYS.SHIFT_SALES, JSON.stringify(shiftSales));

    // 2. Décrémenter le stock dans le cache local
    const cachedProductsRaw = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_PRODUCTS);
    if (cachedProductsRaw) {
      const prods: Product[] = JSON.parse(cachedProductsRaw);
      const updated = prods.map(p => {
        const item = sale.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, current_stock: Math.max(0, p.current_stock - item.quantity) };
        }
        return p;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_PRODUCTS, JSON.stringify(updated));
    }

    // 3. Envoi Supabase ou mise en file d'attente
    if (isOnline && isSupabaseConfigured()) {
      try {
        const { data: createdSale, error: saleErr } = await supabase
          .from('sales')
          .insert({
            establishment_id: sale.establishment_id,
            user_id: sale.user_id,
            total_amount: sale.total_amount,
            payment_method: sale.payment_method,
            is_synced: true,
          })
          .select()
          .single();

        if (!saleErr && createdSale) {
          if (sale.items.length > 0) {
            const saleItems = sale.items.map(i => ({
              sale_id: createdSale.id,
              product_id: i.productId,
              quantity: i.quantity,
              unit_price: i.unitPrice,
            }));
            await supabase.from('sale_items').insert(saleItems);
          }
          return { success: true, synced: true };
        }
      } catch (err) {
        console.warn('Échec envoi vente en direct, basculement en file d’attente locale', err);
      }
    }

    // Sauvegarde en file d'attente hors-ligne
    const queueRaw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_SALES);
    const queue: Sale[] = queueRaw ? JSON.parse(queueRaw) : [];
    queue.push({ ...sale, is_synced: false });
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_SALES, JSON.stringify(queue));

    return { success: true, synced: false };
  },

  // --- SYNCHRONISATION DE LA FILE HORS-LIGNE ---
  async getOfflineQueueCount(): Promise<number> {
    const queueRaw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_SALES);
    if (!queueRaw) return 0;
    const queue: Sale[] = JSON.parse(queueRaw);
    return queue.length;
  },

  async syncOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
    if (!isSupabaseConfigured()) {
      return { syncedCount: 0, remainingCount: await this.getOfflineQueueCount() };
    }

    const queueRaw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_SALES);
    if (!queueRaw) return { syncedCount: 0, remainingCount: 0 };

    const queue: Sale[] = JSON.parse(queueRaw);
    if (queue.length === 0) return { syncedCount: 0, remainingCount: 0 };

    const failedSales: Sale[] = [];
    let syncedCount = 0;

    for (const sale of queue) {
      try {
        const { data: createdSale, error: saleErr } = await supabase
          .from('sales')
          .insert({
            establishment_id: sale.establishment_id,
            user_id: sale.user_id,
            total_amount: sale.total_amount,
            payment_method: sale.payment_method,
            is_synced: true,
          })
          .select()
          .single();

        if (saleErr || !createdSale) {
          failedSales.push(sale);
          continue;
        }

        if (sale.items.length > 0) {
          const saleItems = sale.items.map(i => ({
            sale_id: createdSale.id,
            product_id: i.productId,
            quantity: i.quantity,
            unit_price: i.unitPrice,
          }));
          await supabase.from('sale_items').insert(saleItems);
        }

        syncedCount++;
      } catch (err) {
        failedSales.push(sale);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_SALES, JSON.stringify(failedSales));
    return { syncedCount, remainingCount: failedSales.length };
  },

  // --- HISTORIQUE LOCAL DU SHIFT ---
  async getShiftSales(): Promise<Sale[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SHIFT_SALES);
    return raw ? JSON.parse(raw) : [];
  },
};
