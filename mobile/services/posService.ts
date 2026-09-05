import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Product {
  id: string;
  establishment_id?: string;
  name: string;
  volume: string;
  price: number;
  current_stock: number;
  category?: 'Bière' | 'Sucrerie' | 'Eau' | string;
  imageUrl?: string;
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

const isServer = typeof window === 'undefined' && Platform.OS === 'web';

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isServer) return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isServer) return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (isServer) return;
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

const STORAGE_KEYS = {
  CURRENT_USER: '@maquis_current_waitress',
  CACHED_PRODUCTS: '@maquis_cached_products',
  OFFLINE_SALES: '@maquis_offline_sales_queue',
  SHIFT_SALES: '@maquis_shift_sales',
};

// Illustrations bouteilles vectorielles intégrées pour le mode 100% hors-ligne
export const DEFAULT_BOTTLE_IMAGES = {
  biere_ambre: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100%" height="100%"><rect width="100" height="160" rx="16" fill="%231c150c"/><path d="M42 12 h16 v22 h-16 Z" fill="%23d97706"/><rect x="40" y="34" width="20" height="24" rx="4" fill="%23b45309"/><path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="%23f59e0b"/><rect x="28" y="80" width="44" height="40" rx="6" fill="%23d97706"/><circle cx="50" cy="100" r="12" fill="%23fef3c7"/><path d="M47 92 l6 8 l-6 8" stroke="%2378350f" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  biere_verte: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100%" height="100%"><rect width="100" height="160" rx="16" fill="%230c1c14"/><path d="M42 12 h16 v22 h-16 Z" fill="%23059669"/><rect x="40" y="34" width="20" height="24" rx="4" fill="%23047857"/><path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="%2310b981"/><rect x="28" y="80" width="44" height="40" rx="6" fill="%23047857"/><circle cx="50" cy="100" r="12" fill="%23d1fae5"/><path d="M44 100 h12 M50 94 v12" stroke="%23064e3b" stroke-width="3" stroke-linecap="round"/></svg>`,
  stout_noire: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100%" height="100%"><rect width="100" height="160" rx="16" fill="%23121214"/><path d="M42 12 h16 v22 h-16 Z" fill="%23451a03"/><rect x="40" y="34" width="20" height="24" rx="4" fill="%2327150a"/><path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="%231c1917"/><rect x="28" y="78" width="44" height="44" rx="6" fill="%23ca8a04"/><circle cx="50" cy="100" r="13" fill="%23000000"/><path d="M45 95 Q50 90 55 95 Q50 110 45 95" fill="%23eab308"/></svg>`,
  sucrerie_rouge: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100%" height="100%"><rect width="100" height="160" rx="16" fill="%23240f12"/><path d="M42 12 h16 v22 h-16 Z" fill="%23dc2626"/><rect x="40" y="34" width="20" height="24" rx="4" fill="%23991b1b"/><path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="%23ef4444"/><rect x="28" y="80" width="44" height="40" rx="6" fill="%23b91c1c"/><circle cx="50" cy="100" r="12" fill="%23fee2e2"/><path d="M44 104 Q50 94 56 104" stroke="%23991b1b" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  eau_bleue: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100%" height="100%"><rect width="100" height="160" rx="16" fill="%230c1b29"/><path d="M42 10 h16 v22 h-16 Z" fill="%230284c7"/><rect x="40" y="32" width="20" height="24" rx="4" fill="%230369a1"/><path d="M30 56 Q24 70 24 92 L24 138 Q24 148 36 148 L64 148 Q76 148 76 138 L76 92 Q76 70 70 56 Z" fill="%230ea5e9"/><rect x="28" y="80" width="44" height="38" rx="6" fill="%23bae6fd"/><circle cx="50" cy="99" r="11" fill="%23ffffff"/><path d="M50 92 C46 98 46 104 50 106 C54 104 54 98 50 92 Z" fill="%230284c7"/></svg>`,
};

// Produits de secours locaux si pas de réseau au premier lancement (100% visuel)
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Brakina',
    volume: '65cl',
    price: 900,
    current_stock: 120,
    category: 'Bière',
    imageUrl: DEFAULT_BOTTLE_IMAGES.biere_ambre,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    name: 'Beaufort',
    volume: '65cl',
    price: 1000,
    current_stock: 80,
    category: 'Bière',
    imageUrl: DEFAULT_BOTTLE_IMAGES.biere_verte,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    name: 'Guinness',
    volume: '33cl',
    price: 1200,
    current_stock: 15,
    category: 'Bière',
    imageUrl: DEFAULT_BOTTLE_IMAGES.stout_noire,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    name: 'Coca-Cola',
    volume: '33cl',
    price: 700,
    current_stock: 65,
    category: 'Sucrerie',
    imageUrl: DEFAULT_BOTTLE_IMAGES.sucrerie_rouge,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    name: 'Eau Laafi',
    volume: '1.5L',
    price: 500,
    current_stock: 35,
    category: 'Eau',
    imageUrl: DEFAULT_BOTTLE_IMAGES.eau_bleue,
  },
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
        await safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
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

      await safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    } catch (err: any) {
      // Si réseau indisponible, vérifier le cache de la dernière serveuse connectée
      const cached = await safeStorage.getItem(STORAGE_KEYS.CURRENT_USER);
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
    const raw = await safeStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  },

  async logout(): Promise<void> {
    await safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
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
          const mapped: Product[] = data.map(p => ({
            id: p.id,
            establishment_id: p.establishment_id,
            name: p.name,
            volume: p.volume,
            price: Number(p.price),
            current_stock: p.current_stock,
            category: p.category || (p.name.toLowerCase().includes('eau') ? 'Eau' : p.name.toLowerCase().includes('coca') || p.name.toLowerCase().includes('fanta') || p.name.toLowerCase().includes('sucr') ? 'Sucrerie' : 'Bière'),
            imageUrl: p.imageUrl || p.image_base64 || DEFAULT_BOTTLE_IMAGES.biere_ambre,
          }));
          await safeStorage.setItem(STORAGE_KEYS.CACHED_PRODUCTS, JSON.stringify(mapped));
          return mapped;
        }
      } catch (e) {
        console.warn('Erreur lecture Supabase produits, utilisation du cache local');
      }
    }

    // Récupération depuis le cache local safeStorage
    const cached = await safeStorage.getItem(STORAGE_KEYS.CACHED_PRODUCTS);
    if (cached) {
      try {
        const parsed: Product[] = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    await safeStorage.setItem(STORAGE_KEYS.CACHED_PRODUCTS, JSON.stringify(FALLBACK_PRODUCTS));
    return FALLBACK_PRODUCTS;
  },

  /**
   * Ajoute une nouvelle boisson par le Gérant (avec photo prise par la caméra ou galerie)
   */
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const newProd: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...product,
      category: product.category || 'Bière',
      imageUrl: product.imageUrl || DEFAULT_BOTTLE_IMAGES.biere_ambre,
    };

    // 1. Sauvegarde dans le cache local hors-ligne
    const existing = await this.getProducts();
    const updated = [newProd, ...existing];
    await safeStorage.setItem(STORAGE_KEYS.CACHED_PRODUCTS, JSON.stringify(updated));

    // 2. Synchronisation Supabase / Backend si connecté
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('products').insert({
          id: newProd.id,
          name: newProd.name,
          volume: newProd.volume,
          price: newProd.price,
          category: newProd.category,
          initial_stock: newProd.current_stock,
          current_stock: newProd.current_stock,
          image_base64: newProd.imageUrl,
          establishment_id: newProd.establishment_id,
        });
      } catch (e) {
        console.warn('Erreur synchronisation produit Supabase (gardé en local):', e);
      }
    }

    return newProd;
  },

  /**
   * Met à jour une boisson (prix, stock ou photo)
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const existing = await this.getProducts();
    let updatedItem: Product | null = null;
    const updated = existing.map(p => {
      if (p.id === id) {
        updatedItem = { ...p, ...updates };
        return updatedItem;
      }
      return p;
    });

    if (updatedItem) {
      await safeStorage.setItem(STORAGE_KEYS.CACHED_PRODUCTS, JSON.stringify(updated));
      return updatedItem;
    }
    throw new Error('Boisson introuvable');
  },

  // --- PRISE DE COMMANDE & GESTION HORS-LIGNE ---
  async recordSale(sale: Sale, isOnline: boolean): Promise<{ success: boolean; synced: boolean }> {
    // 1. Sauvegarder dans l'historique du shift local
    const shiftRaw = await safeStorage.getItem(STORAGE_KEYS.SHIFT_SALES);
    const shiftSales: Sale[] = shiftRaw ? JSON.parse(shiftRaw) : [];
    shiftSales.unshift(sale);
    await safeStorage.setItem(STORAGE_KEYS.SHIFT_SALES, JSON.stringify(shiftSales));

    // 2. Décrémenter le stock dans le cache local
    const cachedProductsRaw = await safeStorage.getItem(STORAGE_KEYS.CACHED_PRODUCTS);
    if (cachedProductsRaw) {
      const prods: Product[] = JSON.parse(cachedProductsRaw);
      const updated = prods.map(p => {
        const item = sale.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, current_stock: Math.max(0, p.current_stock - item.quantity) };
        }
        return p;
      });
      await safeStorage.setItem(STORAGE_KEYS.CACHED_PRODUCTS, JSON.stringify(updated));
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
    const queueRaw = await safeStorage.getItem(STORAGE_KEYS.OFFLINE_SALES);
    const queue: Sale[] = queueRaw ? JSON.parse(queueRaw) : [];
    queue.push({ ...sale, is_synced: false });
    await safeStorage.setItem(STORAGE_KEYS.OFFLINE_SALES, JSON.stringify(queue));

    return { success: true, synced: false };
  },

  // --- SYNCHRONISATION DE LA FILE HORS-LIGNE ---
  async getOfflineQueueCount(): Promise<number> {
    const queueRaw = await safeStorage.getItem(STORAGE_KEYS.OFFLINE_SALES);
    if (!queueRaw) return 0;
    const queue: Sale[] = JSON.parse(queueRaw);
    return queue.length;
  },

  async syncOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
    if (!isSupabaseConfigured()) {
      return { syncedCount: 0, remainingCount: await this.getOfflineQueueCount() };
    }

    const queueRaw = await safeStorage.getItem(STORAGE_KEYS.OFFLINE_SALES);
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

    await safeStorage.setItem(STORAGE_KEYS.OFFLINE_SALES, JSON.stringify(failedSales));
    return { syncedCount, remainingCount: failedSales.length };
  },

  // --- HISTORIQUE LOCAL DU SHIFT ---
  async getShiftSales(): Promise<Sale[]> {
    const raw = await safeStorage.getItem(STORAGE_KEYS.SHIFT_SALES);
    return raw ? JSON.parse(raw) : [];
  },
};
