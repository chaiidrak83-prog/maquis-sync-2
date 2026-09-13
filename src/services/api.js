import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const authService = {
  // Connexion propriétaire/gérant par Email/Mot de passe via Supabase Auth
  async signInWithEmail(email, password) {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  // Inscription propriétaire/gérant
  async signUpWithEmail(email, password, metadata = {}) {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    return data;
  },

  // Déconnexion
  async signOut() {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Session utilisateur courante
  async getSession() {
    if (!isSupabaseConfigured()) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Validation Téléphone + Code PIN (pour serveuses et gérants en point de vente)
  async verifyStaffPin(phone, pin) {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    const { data, error } = await supabase
      .from('users')
      .select('*, establishments(*)')
      .eq('phone', phone)
      .eq('pin_hash', pin)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  }
};

export const establishmentService = {
  async getFirst() {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('establishments')
      .select('*')
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateUssdTemplate(id, ussd_template) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('establishments')
      .update({ ussd_template })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const productService = {
  async getAll(establishmentId) {
    if (!isSupabaseConfigured()) return [];
    let query = supabase.from('products').select('*').eq('is_active', true).order('name');
    if (establishmentId) {
      query = query.eq('establishment_id', establishmentId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateStock(productId, currentStock) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('products')
      .update({ current_stock: currentStock })
      .eq('id', productId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const salesService = {
  async getAll(establishmentId) {
    if (!isSupabaseConfigured()) return [];
    let query = supabase
      .from('sales')
      .select('*, users(name), sale_items(*, products(name, volume))')
      .order('created_at', { ascending: false });
    if (establishmentId) {
      query = query.eq('establishment_id', establishmentId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createSale({ establishmentId, userId, totalAmount, paymentMethod, items }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');

    // 1. Création de la transaction de vente
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        establishment_id: establishmentId,
        user_id: userId,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        is_synced: true
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // 2. Insertion des articles de la vente
    if (items && items.length > 0) {
      const saleItemsToInsert = items.map(item => ({
        sale_id: sale.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsToInsert);

      if (itemsError) throw itemsError;
    }

    return sale;
  },

  async updateSale({ saleId, establishmentId, totalAmount, paymentMethod, status = 'MODIFIED', items }) {
    if (!isSupabaseConfigured()) return null;

    // Mise à jour de la vente
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .update({
        total_amount: totalAmount,
        payment_method: paymentMethod,
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', saleId)
      .select()
      .single();

    if (saleError) throw saleError;

    // Si de nouveaux items sont fournis, remplacer les sale_items existants
    if (items && items.length > 0) {
      await supabase.from('sale_items').delete().eq('sale_id', saleId);
      const saleItemsToInsert = items.map(item => ({
        sale_id: saleId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice
      }));
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsToInsert);
      if (itemsError) console.warn('Erreur remplacement sale_items:', itemsError);
    }

    return sale;
  },

  async cancelSale({ saleId, reason }) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('sales')
      .update({ 
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', saleId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const staffService = {
  async getAll(establishmentId) {
    if (!isSupabaseConfigured()) return [];
    let query = supabase.from('users').select('*').order('created_at', { ascending: false });
    if (establishmentId) {
      query = query.eq('establishment_id', establishmentId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateStatus(userId, status) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggleActive(userId, is_active) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async registerUser({ establishmentId, name, phone, pin, role = 'WAITRESS' }) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('users')
      .insert({
        establishment_id: establishmentId,
        name,
        phone,
        pin_hash: pin,
        role,
        status: 'PENDING',
        is_active: true
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async registerWaitress({ establishmentId, name, phone, pin }) {
    return this.registerUser({ establishmentId, name, phone, pin, role: 'WAITRESS' });
  }
};

export const userService = staffService;

export const attendanceService = {
  async getAll(establishmentId) {
    if (!isSupabaseConfigured()) return [];
    let query = supabase
      .from('attendances')
      .select('*, users(name)')
      .order('check_in', { ascending: false });
    if (establishmentId) {
      query = query.eq('establishment_id', establishmentId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async checkIn({ establishmentId, userId, method = 'QR_CODE', latitude = null, longitude = null, accuracy = null, locationStatus = 'GPS_CAPTURED' }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    const { data, error } = await supabase
      .from('attendances')
      .insert({
        establishment_id: establishmentId,
        user_id: userId,
        check_in: new Date().toISOString(),
        check_in_method: method,
        latitude,
        longitude,
        accuracy,
        location_status: locationStatus
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async checkOut(attendanceId) {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    const { data, error } = await supabase
      .from('attendances')
      .update({ check_out: new Date().toISOString() })
      .eq('id', attendanceId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const orderAuditService = {
  async getAll(establishmentId) {
    if (!isSupabaseConfigured()) return [];
    let query = supabase
      .from('order_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (establishmentId) {
      query = query.eq('establishment_id', establishmentId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Supabase order_audit_logs fetch error:', error);
      return [];
    }
    return data || [];
  },

  async createLog({ establishmentId, saleId, managerId, managerName, action, reason, oldTotal, newTotal, details = {} }) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('order_audit_logs')
      .insert({
        establishment_id: establishmentId,
        sale_id: saleId,
        manager_id: managerId,
        manager_name: managerName,
        action,
        reason,
        old_total: oldTotal,
        new_total: newTotal,
        details
      })
      .select()
      .single();
    if (error) console.warn('Supabase order_audit_logs insert error:', error);
    return data;
  }
};
