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
  Pressable,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { posService, Product, User, CartItem } from '@/services/posService';
import { ManagerProductModal } from '@/components/ManagerProductModal';
import StaffRegisterModal from '@/components/StaffRegisterModal';

/**
 * Bouton CTA Animé "S'abonner" avec effet de pulsation (Pulse via react-native-reanimated)
 */
function PulseSubscribeButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 800 }),
        withTiming(0.2, { duration: 800 }),
      ),
      -1,
      true,
    );
  }, [scale, glowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.12 }],
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseHalo, haloStyle]} />
      <Animated.View style={[styles.pulseBtnWrapper, animatedStyle]}>
        <TouchableOpacity
          style={styles.pulseButton}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <Text style={styles.pulseButtonIcon}>✨</Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.pulseButtonText}>S'ABONNER</Text>
            <Text style={styles.pulseButtonSub}>7 Jours d'essai gratuit • Dès 9 900 F CFA</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function PosScreen() {
  const router = useRouter();
  const [secretTaps, setSecretTaps] = useState<number[]>([]);
  // --- Auth state ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [phoneInput, setPhoneInput] = useState('70123456');
  const [pinInput, setPinInput] = useState('3333');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isStaffRegisterVisible, setIsStaffRegisterVisible] = useState(false);
  const [staffDefaultRole, setStaffDefaultRole] = useState<'SERVEUSE' | 'GERANT'>('SERVEUSE');

  // --- POS state ---
  const { width } = useWindowDimensions();
  const numColumns = width >= 600 ? 3 : 2;
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');
  const [isManagerModalVisible, setIsManagerModalVisible] = useState(false);

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

  // Code couleur dynamique par catégorie : Bière (Ambre #f59e0b), Sucrerie (Rouge #ef4444), Eau (Bleu #0ea5e9)
  const getCategoryColor = (category?: string, name?: string) => {
    const cat = (category || '').toLowerCase();
    const n = (name || '').toLowerCase();
    if (
      cat.includes('bière') ||
      cat.includes('biere') ||
      n.includes('brakina') ||
      n.includes('beaufort') ||
      n.includes('guinness') ||
      n.includes('sobebra') ||
      n.includes('doppel')
    ) {
      return '#f59e0b'; // Ambre Bière
    }
    if (
      cat.includes('sucr') ||
      n.includes('coca') ||
      n.includes('fanta') ||
      n.includes('sprite') ||
      n.includes('youki')
    ) {
      return '#ef4444'; // Rouge Sucrerie
    }
    if (cat.includes('eau') || n.includes('laafi') || n.includes('babali')) {
      return '#0ea5e9'; // Bleu Eau
    }
    return '#10b981'; // Vert par défaut
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategory === 'TOUS') return true;
    const catColor = getCategoryColor(p.category, p.name);
    if (selectedCategory === 'Bière') return p.category === 'Bière' || catColor === '#f59e0b';
    if (selectedCategory === 'Sucrerie') return p.category === 'Sucrerie' || catColor === '#ef4444';
    if (selectedCategory === 'Eau') return p.category === 'Eau' || catColor === '#0ea5e9';
    return true;
  });

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
      setAuthError('Veuillez saisir le téléphone et votre code PIN');
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

  // Cart operations avec confirmation physique haptique (vibration légère)
  const addToCart = async (productId: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const removeFromCart = async (productId: string) => {
    if (!cart[productId]) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
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

  // Geste secret : 5 appuis en moins de 2 secondes sur le logo
  const handleSecretLogoPress = () => {
    const now = Date.now();
    const recentTaps = [...secretTaps.filter(t => now - t <= 2000), now];
    setSecretTaps(recentTaps);
    if (recentTaps.length >= 5) {
      setSecretTaps([]);
      router.push('/boss-admin');
    }
  };

  // --- VUE CONNEXION & ONBOARDING CLIENT ---
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.loginScroll} showsVerticalScrollIndicator={false}>
          {/* BOUTON D'APPEL À L'ACTION (CTA) ANIMÉ AVEC PULSATION (PULSE) */}
          <PulseSubscribeButton
            onPress={() => router.push('/subscription/register' as any)}
          />

          <View style={styles.loginCard}>
            <Pressable onPress={handleSecretLogoPress}>
              <Text style={styles.loginLogo}>MAQUIS<Text style={{ color: '#10b981' }}>SYNC</Text></Text>
            </Pressable>
            <Text style={styles.loginSubtitle}>Caisse Tactique Serveuse & Établissement</Text>

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

          {/* SÉPARATEUR REJOINDRE ÉTABLISSEMENT */}
          <View style={styles.registerSectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>NOUVEAU PERSONNEL ?</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.staffRegisterButtonsRow}>
            <TouchableOpacity
              style={styles.staffRegisterBtn}
              onPress={() => {
                setStaffDefaultRole('SERVEUSE');
                setIsStaffRegisterVisible(true);
              }}
            >
              <Text style={styles.staffRegisterBtnIcon}>🍹</Text>
              <View>
                <Text style={styles.staffRegisterBtnTitle}>Rejoindre comme</Text>
                <Text style={[styles.staffRegisterBtnRole, { color: '#f59e0b' }]}>Serveuse</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.staffRegisterBtn}
              onPress={() => {
                setStaffDefaultRole('GERANT');
                setIsStaffRegisterVisible(true);
              }}
            >
              <Text style={styles.staffRegisterBtnIcon}>👔</Text>
              <View>
                <Text style={styles.staffRegisterBtnTitle}>Rejoindre comme</Text>
                <Text style={[styles.staffRegisterBtnRole, { color: '#38bdf8' }]}>Gérant</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal d'auto-inscription Staff */}
        <StaffRegisterModal
          visible={isStaffRegisterVisible}
          defaultRole={staffDefaultRole}
          onClose={() => setIsStaffRegisterVisible(false)}
          onRegisteredSuccess={(role, phone) => {
            setPhoneInput(phone);
            setIsStaffRegisterVisible(false);
          }}
        />
      </ScrollView>
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

      {/* QUICK CATEGORY FILTER BAR FOR INSTANT RECOGNITION */}
      <View style={styles.categoryFilterBar}>
        <TouchableOpacity
          style={[styles.filterPill, selectedCategory === 'TOUS' && styles.filterPillActive]}
          onPress={() => setSelectedCategory('TOUS')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPillText, selectedCategory === 'TOUS' && styles.filterPillTextActive]}>
            🍻 TOUT ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            styles.filterPillBiere,
            selectedCategory === 'Bière' && styles.filterPillActiveBiere,
          ]}
          onPress={() => setSelectedCategory('Bière')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPillText, { color: '#f59e0b' }, selectedCategory === 'Bière' && styles.filterPillTextActive]}>
            🍺 BIÈRES
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            styles.filterPillSucrerie,
            selectedCategory === 'Sucrerie' && styles.filterPillActiveSucrerie,
          ]}
          onPress={() => setSelectedCategory('Sucrerie')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPillText, { color: '#ef4444' }, selectedCategory === 'Sucrerie' && styles.filterPillTextActive]}>
            🥤 SUCRES
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            styles.filterPillEau,
            selectedCategory === 'Eau' && styles.filterPillActiveEau,
          ]}
          onPress={() => setSelectedCategory('Eau')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPillText, { color: '#0ea5e9' }, selectedCategory === 'Eau' && styles.filterPillTextActive]}>
            💧 EAU
          </Text>
        </TouchableOpacity>

        {(currentUser.role === 'MANAGER' || currentUser.role === 'OWNER') && (
          <TouchableOpacity
            style={styles.addDrinkPill}
            onPress={() => setIsManagerModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addDrinkPillText}>+ 📸 Boisson</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* DRINKS CATALOGUE GRID (100% VISUEL - 80% IMAGE BOUTEILLE) */}
      {isLoadingProducts ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Chargement des bouteilles...</Text>
        </View>
      ) : (
        <FlatList
          key={`grid_${numColumns}`}
          data={filteredProducts}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const qtyInCart = cart[item.id] || 0;
            const isOutOfStock = item.current_stock === 0;
            const borderColor = getCategoryColor(item.category, item.name);

            return (
              <TouchableOpacity
                style={[
                  styles.visualCard,
                  { borderColor },
                  isOutOfStock && styles.visualCardDisabled,
                  qtyInCart > 0 && styles.visualCardSelected,
                ]}
                activeOpacity={0.75}
                onPress={() => {
                  if (!isOutOfStock) addToCart(item.id);
                }}
                disabled={isOutOfStock}
              >
                {/* Pastille Catégorie (Haut Gauche) */}
                <View style={[styles.categoryBadge, { backgroundColor: borderColor }]}>
                  <Text style={styles.categoryBadgeText}>
                    {borderColor === '#f59e0b' ? '🍺' : borderColor === '#ef4444' ? '🥤' : '💧'}
                  </Text>
                </View>

                {/* Pastille Quantité Flottante (Haut Droite) */}
                {qtyInCart > 0 && (
                  <View style={styles.floatingCartBadge}>
                    <Text style={styles.floatingCartBadgeText}>{qtyInCart}</Text>
                  </View>
                )}

                {/* 1. ZONE IMAGE BOUTEILLE (OCCUPE 80% DE L'ESPACE) */}
                <View style={styles.cardImageContainer}>
                  <Image
                    source={{
                      uri: item.imageUrl || 'https://via.placeholder.com/200?text=Boisson',
                    }}
                    style={styles.bottleImage}
                    resizeMode="contain"
                  />
                  {isOutOfStock && (
                    <View style={styles.outOfStockOverlay}>
                      <Text style={styles.outOfStockText}>ÉPUISÉ</Text>
                    </View>
                  )}
                </View>

                {/* 2. ZONE PRIX EN TRÈS GROS CARACTÈRES (AUCUNE DESCRIPTION TEXTUELLE) */}
                <View style={styles.cardBottomBar}>
                  {qtyInCart > 0 && (
                    <TouchableOpacity
                      style={styles.quickMinusBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        removeFromCart(item.id);
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Text style={styles.quickMinusBtnText}>−</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={[styles.giantPriceText, qtyInCart > 0 && { color: '#fbbf24' }]}>
                    {item.price.toLocaleString('fr-FR')} F
                  </Text>
                </View>
              </TouchableOpacity>
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

      {/* MODALE GÉRANT - AJOUT DE BOISSON AVEC CAMÉRA EXPO-IMAGE-PICKER */}
      <ManagerProductModal
        visible={isManagerModalVisible}
        onClose={() => setIsManagerModalVisible(false)}
        establishmentId={currentUser.establishment_id}
        onProductAdded={(newProd) => {
          setProducts(prev => [newProd, ...prev]);
        }}
      />
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
    padding: 10,
    paddingBottom: 110,
  },
  // --- BARRE DE FILTRES CATÉGORIES VISUELLES ---
  categoryFilterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#162032',
    borderBottomWidth: 1,
    borderBottomColor: '#243247',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  filterPillActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  filterPillBiere: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  filterPillActiveBiere: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  filterPillSucrerie: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  filterPillActiveSucrerie: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  filterPillEau: {
    borderColor: 'rgba(14, 165, 233, 0.4)',
  },
  filterPillActiveEau: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
  },
  filterPillTextActive: {
    color: '#0f172a',
  },
  addDrinkPill: {
    marginLeft: 'auto',
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addDrinkPillText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // --- CARTE BOISSON 100% VISUELLE (80% IMAGE BOUTEILLE) ---
  visualCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#131e33',
    borderRadius: 22,
    borderWidth: 3.5,
    height: 255,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  visualCardSelected: {
    backgroundColor: '#1b2a48',
  },
  visualCardDisabled: {
    opacity: 0.35,
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  categoryBadgeText: {
    fontSize: 13,
  },
  floatingCartBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
    paddingHorizontal: 6,
  },
  floatingCartBadgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  // L'image de la bouteille occupe 80% de la hauteur de la carte
  cardImageContainer: {
    height: '78%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#0c1322',
  },
  bottleImage: {
    width: '100%',
    height: '100%',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    letterSpacing: 1,
  },
  // Zone inférieure : Prix en très gros caractères
  cardBottomBar: {
    height: '22%',
    width: '100%',
    backgroundColor: '#080d18',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    position: 'relative',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  giantPriceText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  quickMinusBtn: {
    position: 'absolute',
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#263449',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3b4e6b',
  },
  quickMinusBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
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
  // Login & Onboarding Styles
  loginContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  loginScroll: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  pulseHalo: {
    position: 'absolute',
    width: '100%',
    height: 70,
    borderRadius: 20,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  pulseBtnWrapper: {
    width: '100%',
  },
  pulseButton: {
    backgroundColor: '#10b981',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#34d399',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  pulseButtonIcon: {
    fontSize: 22,
  },
  pulseButtonText: {
    color: '#090d16',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  pulseButtonSub: {
    color: '#064e3b',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
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
  registerSectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 10,
    letterSpacing: 0.8,
  },
  staffRegisterButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  staffRegisterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  staffRegisterBtnIcon: {
    fontSize: 22,
  },
  staffRegisterBtnTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  staffRegisterBtnRole: {
    fontSize: 13,
    fontWeight: '800',
  },
});
