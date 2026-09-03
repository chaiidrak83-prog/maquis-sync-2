import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { posService, Product, User, CartItem } from '@/services/posService';

export default function PosScreen() {
  // --- Auth state ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [phoneInput, setPhoneInput] = useState('70123456');
  const [pinInput, setPinInput] = useState('3333');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // --- POS state ---
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // --- Payment Modal state ---
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY'>('CASH');
  const [clientPhone, setClientPhone] = useState('');
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Check stored user on start
  useEffect(() => {
    posService.getStoredUser().then(user => {
      if (user) setCurrentUser(user);
    });
  }, []);

  // Load products & sync queue count
  const loadData = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const prods = await posService.getProducts();
      setProducts(prods);
      const queueCount = await posService.getOfflineQueueCount();
      setPendingSyncCount(queueCount);
    } catch (err) {
      console.warn('Erreur chargement données:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Login handler
  const handleLogin = async () => {
    if (!phoneInput || !pinInput) {
      setAuthError('Veuillez saisir votre numéro et votre code PIN');
      return;
    }
    setAuthError('');
    setIsLoggingIn(true);
    try {
      const user = await posService.loginWaitress(phoneInput, pinInput);
      setCurrentUser(user);
    } catch (err: any) {
      setAuthError(err.message || 'Identifiants invalides');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Cart operations
  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const removeFromCart = (productId: string) => {
    if (!cart[productId]) return;
    setCart(prev => {
      const updated = { ...prev };
      if (updated[productId] <= 1) {
        delete updated[productId];
      } else {
        updated[productId] -= 1;
      }
      return updated;
    });
  };

  const clearCart = () => setCart({});

  // Calculations
  const cartItemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [pId, qty]) => {
    const prod = products.find(p => p.id === pId);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);

  // USSD calculation
  const ussdCode = `*144*4*2*${cartTotal}*${clientPhone || '70000000'}#`;

  const handleDialUssd = () => {
    if (!clientPhone || clientPhone.length < 8) {
      Alert.alert('Numéro client requis', 'Veuillez renseigner le numéro Orange / Moov du client.');
      return;
    }
    const dialUrl = `tel:${encodeURIComponent(ussdCode)}`;
    Linking.openURL(dialUrl).catch(() => {
      Alert.alert('Erreur', 'Impossible de lancer le composeur téléphonique');
    });
  };

  // Finalize Sale
  const handleFinalizeSale = async () => {
    if (!currentUser) return;
    if (cartItemCount === 0) return;

    setIsProcessingSale(true);
    try {
      const items: CartItem[] = Object.entries(cart).map(([pId, qty]) => {
        const prod = products.find(p => p.id === pId);
        return {
          productId: pId,
          name: prod ? prod.name : 'Boisson',
          volume: prod ? prod.volume : '',
          quantity: qty,
          unitPrice: prod ? prod.price : 0,
        };
      });

      const saleData = {
        id: 'sale_' + Date.now(),
        establishment_id: currentUser.establishment_id,
        user_id: currentUser.id,
        waitress_name: currentUser.name,
        total_amount: cartTotal,
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
        is_synced: isOnline,
        items,
      };

      const result = await posService.recordSale(saleData, isOnline);

      // Met à jour localement les stocks affichés
      setProducts(prev =>
        prev.map(p => {
          if (cart[p.id]) {
            return { ...p, current_stock: Math.max(0, p.current_stock - cart[p.id]) };
          }
          return p;
        })
      );

      clearCart();
      setIsPaymentModalVisible(false);
      setClientPhone('');

      const queueCount = await posService.getOfflineQueueCount();
      setPendingSyncCount(queueCount);

      Alert.alert(
        'Commande Validée !',
        result.synced
          ? `Vente de ${cartTotal.toLocaleString()} FCFA enregistrée sur Supabase.`
          : `Mode Hors-Ligne : Vente de ${cartTotal.toLocaleString()} FCFA stockée en local (${queueCount} en attente de synchro).`
      );
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’enregistrer la vente');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Synchronisation manuelle de la file
  const handleSyncQueue = async () => {
    if (!isOnline) {
      Alert.alert('Réseau indisponible', 'Activez votre connexion pour synchroniser les ventes.');
      return;
    }
    const res = await posService.syncOfflineQueue();
    setPendingSyncCount(res.remainingCount);
    Alert.alert(
      'Synchronisation terminée',
      `${res.syncedCount} vente(s) synchronisée(s) vers Supabase. Restantes : ${res.remainingCount}`
    );
  };

  // --- VUE CONNEXION SERVEUSE ---
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <Text style={styles.loginLogo}>MAQUIS<Text style={{ color: '#10b981' }}>SYNC</Text></Text>
          <Text style={styles.loginSubtitle}>Caisse Tactique Serveuse</Text>

          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

          <Text style={styles.label}>Téléphone :</Text>
          <TextInput
            style={styles.input}
            value={phoneInput}
            onChangeText={setPhoneInput}
            placeholder="Ex: 70123456"
            placeholderTextColor="#64748b"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Code PIN (4 chiffres) :</Text>
          <TextInput
            style={styles.input}
            value={pinInput}
            onChangeText={setPinInput}
            placeholder="Ex: 3333"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Prendre mon service</Text>
            )}
          </TouchableOpacity>

          <View style={styles.demoAccounts}>
            <Text style={styles.demoTitle}>Comptes de test pré-remplis :</Text>
            <TouchableOpacity
              style={styles.demoBadge}
              onPress={() => { setPhoneInput('70123456'); setPinInput('3333'); }}
            >
              <Text style={styles.demoBadgeText}>Awa Diallo (70123456 / PIN: 3333)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --- VUE CAISSE ACTIVE (POS) ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* TOP STATUS BAR */}
      <View style={styles.header}>
        <View>
          <Text style={styles.waitressName}>{currentUser.name}</Text>
          <Text style={styles.establishmentName}>Maquis Le Grand Faso</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Toggle réseau simulation */}
          <TouchableOpacity
            style={[styles.networkBadge, isOnline ? styles.networkOnline : styles.networkOffline]}
            onPress={() => setIsOnline(!isOnline)}
          >
            <View style={[styles.networkDot, { backgroundColor: isOnline ? '#10b981' : '#f43f5e' }]} />
            <Text style={styles.networkText}>{isOnline ? 'En ligne' : 'Hors-ligne'}</Text>
          </TouchableOpacity>

          {/* Sync badge si ventes en attente */}
          {pendingSyncCount > 0 && (
            <TouchableOpacity style={styles.syncBadge} onPress={handleSyncQueue}>
              <Text style={styles.syncBadgeText}>⏳ {pendingSyncCount} à synchro</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* DRINKS CATALOGUE GRID */}
      {isLoadingProducts ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Chargement des boissons...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const qtyInCart = cart[item.id] || 0;
            const isLowStock = item.current_stock <= 5;

            return (
              <View style={[styles.productCard, isLowStock && styles.productCardLow]}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productVolume}>{item.volume}</Text>
                </View>

                <Text style={styles.productPrice}>{item.price.toLocaleString()} FCFA</Text>

                <View style={styles.stockRow}>
                  <Text style={[styles.stockText, isLowStock && styles.stockLowText]}>
                    Stock: {item.current_stock}
                  </Text>
                </View>

                {/* Actions boutons */}
                <View style={styles.cardActions}>
                  {qtyInCart > 0 ? (
                    <View style={styles.counterRow}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => removeFromCart(item.id)}
                      >
                        <Text style={styles.counterBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{qtyInCart}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => addToCart(item.id)}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addBtn, item.current_stock === 0 && styles.addBtnDisabled]}
                      onPress={() => addToCart(item.id)}
                      disabled={item.current_stock === 0}
                    >
                      <Text style={styles.addBtnText}>
                        {item.current_stock === 0 ? 'Épuisé' : '+ Ajouter'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* BOTTOM CART DRAWER / BAR */}
      {cartItemCount > 0 && (
        <View style={styles.bottomDrawer}>
          <View style={styles.drawerInfo}>
            <Text style={styles.drawerCount}>{cartItemCount} article(s)</Text>
            <Text style={styles.drawerTotal}>{cartTotal.toLocaleString()} FCFA</Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => setIsPaymentModalVisible(true)}
          >
            <Text style={styles.checkoutBtnText}>Encaisser ➔</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL DE PAIEMENT */}
      <Modal
        visible={isPaymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Règlement de la Commande</Text>
            <Text style={styles.modalTotal}>{cartTotal.toLocaleString()} FCFA</Text>

            {/* Sélecteur de méthode de paiement */}
            <View style={styles.paymentMethodsRow}>
              <TouchableOpacity
                style={[styles.paymentMethodTab, paymentMethod === 'CASH' && styles.paymentMethodTabActive]}
                onPress={() => setPaymentMethod('CASH')}
              >
                <Text style={[styles.paymentMethodTabText, paymentMethod === 'CASH' && styles.paymentMethodTabTextActive]}>
                  💵 Espèces (Cash)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentMethodTab, paymentMethod === 'MOBILE_MONEY' && styles.paymentMethodTabActive]}
                onPress={() => setPaymentMethod('MOBILE_MONEY')}
              >
                <Text style={[styles.paymentMethodTabText, paymentMethod === 'MOBILE_MONEY' && styles.paymentMethodTabTextActive]}>
                  📱 Mobile Money
                </Text>
              </TouchableOpacity>
            </View>

            {paymentMethod === 'MOBILE_MONEY' && (
              <View style={styles.mobileMoneyBox}>
                <Text style={styles.label}>Numéro Orange / Moov du client :</Text>
                <TextInput
                  style={styles.input}
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  placeholder="Ex: 76123456"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                />

                <TouchableOpacity style={styles.ussdDialBtn} onPress={handleDialUssd}>
                  <Text style={styles.ussdDialBtnText}>📞 Composer USSD : {ussdCode}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Boutons d'action */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsPaymentModalVisible(false)}
                disabled={isProcessingSale}
              >
                <Text style={styles.cancelBtnText}>Retour</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleFinalizeSale}
                disabled={isProcessingSale}
              >
                {isProcessingSale ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmBtnText}>✓ Valider Vente</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  waitressName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  establishmentName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  networkOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  networkOffline: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  networkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  networkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  syncBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
  },
  listContent: {
    padding: 12,
    paddingBottom: 90,
  },
  productCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  productCardLow: {
    borderColor: '#f59e0b',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  productVolume: {
    fontSize: 12,
    color: '#94a3b8',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
    marginVertical: 4,
  },
  stockRow: {
    marginVertical: 4,
  },
  stockText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  stockLowText: {
    color: '#f59e0b',
    fontWeight: '700',
  },
  cardActions: {
    marginTop: 8,
  },
  addBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#475569',
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 2,
  },
  counterBtn: {
    backgroundColor: '#334155',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  counterValue: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 15,
  },
  bottomDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
  },
  drawerInfo: {
    flex: 1,
  },
  drawerCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  drawerTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  checkoutBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  // Login Styles
  loginContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 24,
  },
  loginCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loginLogo: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  demoAccounts: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  demoTitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  demoBadge: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoBadgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
  },
  modalTotal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#10b981',
    textAlign: 'center',
    marginVertical: 10,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 14,
  },
  paymentMethodTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  paymentMethodTabActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  paymentMethodTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  paymentMethodTabTextActive: {
    color: '#10b981',
    fontWeight: '800',
  },
  mobileMoneyBox: {
    marginTop: 6,
    marginBottom: 12,
  },
  ussdDialBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  ussdDialBtnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
});
