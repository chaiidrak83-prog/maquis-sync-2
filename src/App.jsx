import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { 
  productService, 
  salesService, 
  staffService, 
  attendanceService, 
  establishmentService 
} from './services/api';
import { 
  Wifi, 
  WifiOff, 
  UserCheck, 
  QrCode, 
  ShoppingBag, 
  TrendingUp, 
  Plus, 
  Minus, 
  Trash2, 
  AlertTriangle, 
  Smartphone, 
  Tablet, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  DollarSign, 
  Package, 
  Users, 
  Zap,
  LogOut, 
  RefreshCw, 
  Beer,
  Check,
  X,
  UserX,
  Lock,
  Phone,
  Percent,
  Settings,
  Calendar,
  Layers,
  FileText,
  Send,
  Printer,
  ShieldCheck
} from 'lucide-react';
import SuperAdminConsole from './components/SuperAdminConsole';
import AdminLoginScreen from './components/AdminLoginScreen';
import OnboardingModal from './components/OnboardingModal';

export default function App() {
  // --- Simulation & Database Global States ---
  const [viewMode, setViewMode] = useState('LANDING'); // 'LANDING' | 'MOBILE_POS' | 'SUPER_ADMIN' | 'BOSS_ADMIN'
  const [establishmentId, setEstablishmentId] = useState('a0000000-0000-0000-0000-000000000001');
  const [supabaseActive, setSupabaseActive] = useState(isSupabaseConfigured());
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState('DECOUVERTE'); // 'DECOUVERTE' | 'ACCES' | 'PREMIUM'
  const [ussdTemplate, setUssdTemplate] = useState('*144*4*2*[MONTANT]*[NUMERO_CLIENT]#');
  const [impersonatedEstablishment, setImpersonatedEstablishment] = useState(null);
  const [secretWebTaps, setSecretWebTaps] = useState([]);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingInitialPlan, setOnboardingInitialPlan] = useState('Accès');

  // Écoute de l'URL cachée #boss-admin ou /boss-admin
  useEffect(() => {
    const handleUrlCheck = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (hash === '#boss-admin' || hash === '#/boss-admin' || path === '/boss-admin') {
        setViewMode('BOSS_ADMIN');
      }
    };
    handleUrlCheck();
    window.addEventListener('hashchange', handleUrlCheck);
    return () => window.removeEventListener('hashchange', handleUrlCheck);
  }, []);

  // Geste secret : 5 clics rapides sur le logo en moins de 2 secondes
  const handleSecretLogoTrigger = () => {
    const now = Date.now();
    const recent = [...secretWebTaps.filter(t => now - t <= 2000), now];
    setSecretWebTaps(recent);
    if (recent.length >= 5) {
      setSecretWebTaps([]);
      window.location.hash = 'boss-admin';
      setViewMode('BOSS_ADMIN');
    }
  };

  // Multi-Rôle users database (Super Admin, Propriétaire, Gérant, Serveuses)
  const [users, setUsers] = useState([
    { id: 'sa1', name: 'Super Administrateur', phone: '00000000', pin: '9999', role: 'SUPER_ADMIN', status: 'VALIDATED', is_active: true },
    { id: 'u1', name: 'Alassane Touré', phone: '76000000', pin: '1111', role: 'OWNER', status: 'VALIDATED', is_active: true },
    { id: 'u2', name: 'Koffi Mensah', phone: '70222222', pin: '2222', role: 'MANAGER', status: 'VALIDATED', is_active: true },
    { id: 'w1', name: 'Awa Diallo', phone: '70123456', pin: '3333', role: 'WAITRESS', status: 'VALIDATED', is_active: true },
    { id: 'w2', name: 'Mariam Koné', phone: '70890123', pin: '4444', role: 'WAITRESS', status: 'PENDING', is_active: true },
    { id: 'w3', name: 'Fatou Bamba', phone: '77456789', pin: '5555', role: 'WAITRESS', status: 'VALIDATED', is_active: false }, // Soft deleted (turnover)
  ]);

  // Inline SVG drink icons acting as cached offline-first images
  const drinkImages = {
    beer_gold: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23d9a05b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5a2.5 2.5 0 0 0-4.9.6L9 9v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9l-.1-.9A2.5 2.5 0 0 0 14 7.5Z"/></svg>`,
    beer_green: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5a2.5 2.5 0 0 0-4.9.6L9 9v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9l-.1-.9A2.5 2.5 0 0 0 14 7.5Z"/></svg>`,
    stout_dark: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%238a5a36" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6Z"/><path d="M6 14V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10"/><line x1="6" y1="9" x2="18" y2="9"/><line x1="9" y1="14" x2="9" y2="22"/><line x1="15" y1="14" x2="15" y2="22"/></svg>`,
    water_blue: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5v10a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Z"/><path d="M7 10h10"/><path d="M7 14h10"/></svg>`
  };

  // Products (Catalogue) with offline image references
  const [products, setProducts] = useState([
    { id: 'p1', name: 'Brakina', volume: '65cl', price: 900, initial_stock: 120, current_stock: 120, image_base64: drinkImages.beer_gold, is_active: true },
    { id: 'p2', name: 'Sobebra', volume: '65cl', price: 1000, initial_stock: 80, current_stock: 80, image_base64: drinkImages.beer_green, is_active: true },
    { id: 'p3', name: 'Guinness', volume: '33cl', price: 1200, initial_stock: 15, current_stock: 15, image_base64: drinkImages.stout_dark, is_active: true },
    { id: 'p4', name: 'Laafi (Eau)', volume: '1.5L', price: 500, initial_stock: 4, current_stock: 4, image_base64: drinkImages.water_blue, is_active: true },
  ]);

  // Sales (Transactions)
  const [sales, setSales] = useState([
    { id: 's1', user_id: 'w1', waitress_name: 'Awa Diallo', total_amount: 3800, payment_method: 'CASH', created_at: new Date(Date.now() - 3600000).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}), is_synced: true },
    { id: 's2', user_id: 'w1', waitress_name: 'Awa Diallo', total_amount: 1000, payment_method: 'MOBILE_MONEY', created_at: new Date(Date.now() - 1800000).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}), is_synced: true },
  ]);

  // Sync Queue for Offline sales
  const [offlineSyncQueue, setOfflineSyncQueue] = useState([]);

  // Attendance shifts logs
  const [attendances, setAttendances] = useState([
    { id: 'a1', waitress_name: 'Awa Diallo', check_in: '18:30', check_out: null, method: 'QR_CODE' }
  ]);

  // --- Mobile Application Simulator States ---
  const [loggedInUserId, setLoggedInUserId] = useState(null); // Initial state: logged out
  const [phoneLoginInput, setPhoneLoginInput] = useState('');
  const [pinLoginInput, setPinLoginInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isRegisteringMode, setIsRegisteringMode] = useState(false);
  
  // Registration Inputs
  const [regNameInput, setRegNameInput] = useState('');
  const [regPhoneInput, setRegPhoneInput] = useState('');
  const [regPinInput, setRegPinInput] = useState('');

  // --- Owner (Propriétaire) View States ---
  const [ownerTimeFilter, setOwnerTimeFilter] = useState('JOUR'); // 'JOUR' | 'SEMAINE' | 'MOIS'
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('+226 76 00 00 00');
  const [whatsappSuccessMsg, setWhatsappSuccessMsg] = useState('');
  const [qrTableNumber, setQrTableNumber] = useState('Table 1');
  const [generatedQr, setGeneratedQr] = useState(null);
  const [printSuccessMsg, setPrintSuccessMsg] = useState('');
  const [showMobileContactModal, setShowMobileContactModal] = useState(false);

  // --- Gérant (Manager) App Interface States ---
  const [gerantTab, setGerantTab] = useState('validation'); // 'validation' | 'catalogue' | 'presences' | 'stocks'
  
  // Product Creation inside Manager View
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductVolume, setNewProductVolume] = useState('65cl');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductImageKey, setNewProductImageKey] = useState('beer_gold');

  // Manual stock adjustments
  const [adjustingProductId, setAdjustingProductId] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('LIVRAISON');

  // --- Serveuse App Interface States ---
  const [waitressTab, setWaitressTab] = useState('commande'); // 'commande' | 'pointage' | 'profil'
  const [checkoutStep, setCheckoutStep] = useState(1); // Step 1 (basket selection) | Step 2 (billing payment)
  const [customerPhone, setCustomerPhone] = useState(''); // Client phone for MoMo USSD
  const [cart, setCart] = useState({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // 'CASH' | 'MOBILE_MONEY'
  const [ussdCode, setUssdCode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // --- Waitress limit computation ---
  // Active waitresses count
  const activeWaitressesCount = useMemo(() => {
    return users.filter(u => u.role === 'WAITRESS' && u.is_active && u.status === 'VALIDATED').length;
  }, [users]);

  // Waitress limits based on subscription tier
  const activeWaitressLimit = useMemo(() => {
    if (subscriptionTier === 'DECOUVERTE') return 10;
    if (subscriptionTier === 'ACCES') return 50;
    return Infinity; // PREMIUM is unlimited
  }, [subscriptionTier]);

  const isWaitressLimitReached = useMemo(() => {
    return activeWaitressesCount >= activeWaitressLimit;
  }, [activeWaitressesCount, activeWaitressLimit]);

  // --- Sync Trigger Logic ---
  useEffect(() => {
    if (isOnline && offlineSyncQueue.length > 0) {
      setIsSyncing(true);
      const timer = setTimeout(() => {
        setSales(prev => [...prev, ...offlineSyncQueue.map(item => ({ ...item, is_synced: true }))]);
        setOfflineSyncQueue([]);
        setIsSyncing(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, offlineSyncQueue]);

  // --- Supabase Data Loading & Realtime Subscription ---
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    setIsDbLoading(true);
    Promise.all([
      establishmentService.getFirst(),
      productService.getAll(establishmentId),
      staffService.getAll(establishmentId),
      salesService.getAll(establishmentId),
      attendanceService.getAll(establishmentId)
    ])
      .then(([est, dbProducts, dbUsers, dbSales, dbAttendances]) => {
        if (est) {
          if (est.id) setEstablishmentId(est.id);
          if (est.subscription_tier) setSubscriptionTier(est.subscription_tier);
          if (est.ussd_template) setUssdTemplate(est.ussd_template);
        }
        if (dbProducts && dbProducts.length > 0) {
          setProducts(dbProducts.map(p => ({
            ...p,
            image_base64: p.image_base64 || drinkImages.beer_gold
          })));
        }
        if (dbUsers && dbUsers.length > 0) {
          setUsers([
            { id: 'sa1', name: 'Super Administrateur', phone: '00000000', pin: '9999', role: 'SUPER_ADMIN', status: 'VALIDATED', is_active: true },
            ...dbUsers.map(u => ({
              ...u,
              pin: u.pin_hash
            }))
          ]);
        }
        if (dbSales && dbSales.length > 0) {
          setSales(dbSales.map(s => ({
            id: s.id,
            user_id: s.user_id,
            waitress_name: s.users?.name || 'Serveuse',
            total_amount: Number(s.total_amount),
            payment_method: s.payment_method,
            created_at: new Date(s.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            is_synced: s.is_synced
          })));
        }
        if (dbAttendances && dbAttendances.length > 0) {
          setAttendances(dbAttendances.map(a => ({
            id: a.id,
            waitress_name: a.users?.name || 'Serveuse',
            check_in: new Date(a.check_in).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            check_out: a.check_out ? new Date(a.check_out).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null,
            method: a.check_in_method
          })));
        }
        setSupabaseActive(true);
      })
      .catch(err => {
        console.warn('Erreur chargement Supabase:', err);
      })
      .finally(() => {
        setIsDbLoading(false);
      });

    // Realtime channel
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        salesService.getAll(establishmentId).then(data => {
          if (data) {
            setSales(data.map(s => ({
              id: s.id,
              user_id: s.user_id,
              waitress_name: s.users?.name || 'Serveuse',
              total_amount: Number(s.total_amount),
              payment_method: s.payment_method,
              created_at: new Date(s.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              is_synced: s.is_synced
            })));
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        productService.getAll(establishmentId).then(data => {
          if (data) {
            setProducts(data.map(p => ({
              ...p,
              image_base64: p.image_base64 || drinkImages.beer_gold
            })));
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        staffService.getAll(establishmentId).then(data => {
          if (data) {
            setUsers([
              { id: 'sa1', name: 'Super Administrateur', phone: '00000000', pin: '9999', role: 'SUPER_ADMIN', status: 'VALIDATED', is_active: true },
              ...data.map(u => ({
                ...u,
                pin: u.pin_hash
              }))
            ]);
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishmentId]);

  // Find currently logged user in simulator
  const currentUser = useMemo(() => {
    return users.find(u => u.id === loggedInUserId);
  }, [users, loggedInUserId]);

  // Custom PIN keypad logic
  const handleKeypadPress = (val) => {
    if (isRegisteringMode) {
      if (regPinInput.length < 6) setRegPinInput(prev => prev + val);
    } else {
      if (pinLoginInput.length < 6) setPinLoginInput(prev => prev + val);
    }
  };

  const handleKeypadClear = () => {
    if (isRegisteringMode) {
      setRegPinInput(prev => prev.slice(0, -1));
    } else {
      setPinLoginInput(prev => prev.slice(0, -1));
    }
  };

  // Login handler
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!phoneLoginInput) {
      setAuthError('Veuillez renseigner votre téléphone.');
      return;
    }

    // ACCÈS DIRECT SUPER ADMINISTRATEUR (Tél: 00000000)
    if (phoneLoginInput === '00000000') {
      setAuthError('');
      setLoggedInUserId('sa1');
      setPhoneLoginInput('');
      setPinLoginInput('');
      setViewMode('SUPER_ADMIN');
      return;
    }

    if (!pinLoginInput) {
      setAuthError('Veuillez renseigner votre code PIN.');
      return;
    }

    const user = users.find(u => u.phone === phoneLoginInput && u.pin === pinLoginInput);
    if (!user) {
      setAuthError('Téléphone ou PIN incorrect.');
      return;
    }

    setAuthError('');
    setLoggedInUserId(user.id);
    setPhoneLoginInput('');
    setPinLoginInput('');

    // Reset default tabs depending on role
    if (user.role === 'WAITRESS') {
      setWaitressTab('commande');
      setCheckoutStep(1);
    } else if (user.role === 'MANAGER') {
      setGerantTab('validation');
    }
  };

  // Self Registration handler (côté serveuse)
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!regNameInput || !regPhoneInput || regPinInput.length < 4) {
      setAuthError('Veuillez remplir le nom, le téléphone et un PIN de 4-6 chiffres.');
      return;
    }

    // Check if phone number already exists
    if (users.some(u => u.phone === regPhoneInput)) {
      setAuthError('Ce numéro de téléphone est déjà enregistré.');
      return;
    }

    setAuthError('');
    const newId = 'u_' + Date.now();
    const newW = {
      id: newId,
      name: regNameInput,
      phone: regPhoneInput,
      pin: regPinInput,
      role: 'WAITRESS',
      status: 'PENDING',
      is_active: true
    };

    setUsers(prev => [...prev, newW]);
    setLoggedInUserId(newId);
    
    // Clear inputs
    setRegNameInput('');
    setRegPhoneInput('');
    setRegPinInput('');
    setIsRegisteringMode(false);
  };

  // Add to Cart Actions
  const handleAddToCart = (productId) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const handleRemoveFromCart = (productId) => {
    if (!cart[productId]) return;
    setCart(prev => {
      const updated = { ...prev };
      updated[productId] -= 1;
      if (updated[productId] <= 0) {
        delete updated[productId];
      }
      return updated;
    });
  };

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const prod = products.find(p => p.id === id);
      return total + (prod ? prod.price * qty : 0);
    }, 0);
  }, [cart, products]);

  const cartTotalQty = useMemo(() => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  }, [cart]);

  // Checkout flow step change
  const handleProceedToPayment = () => {
    if (cartTotalQty === 0) return;
    setCheckoutStep(2);
  };

  const handleConfirmCheckout = (method) => {
    if (method === 'MOBILE_MONEY') {
      if (!customerPhone) {
        alert('Veuillez entrer le numéro du client pour la transaction Mobile Money.');
        return;
      }
      // Replace variables in USSD template configured by OWNER
      const formattedUssd = ussdTemplate
        .replace('[MONTANT]', cartTotal)
        .replace('[NUMERO_CLIENT]', customerPhone);
      
      setUssdCode(formattedUssd);
      setSelectedPaymentMethod('MOBILE_MONEY');
    } else {
      finalizeSale('CASH');
    }
  };

  const finalizeSale = (method) => {
    const saleId = 's_' + Date.now();
    const newSale = {
      id: saleId,
      user_id: currentUser?.id || 'offline_waitress',
      waitress_name: currentUser?.name || 'Serveuse Locale',
      total_amount: cartTotal,
      payment_method: method,
      created_at: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}),
      is_synced: isOnline
    };

    // Update stock levels locally
    setProducts(prev => prev.map(p => {
      if (cart[p.id]) {
        return { ...p, current_stock: Math.max(0, p.current_stock - cart[p.id]) };
      }
      return p;
    }));

    if (isOnline) {
      setSales(prev => [newSale, ...prev]);
      if (isSupabaseConfigured()) {
        const saleItems = Object.entries(cart).map(([productId, quantity]) => {
          const product = products.find(p => p.id === productId);
          return {
            productId,
            quantity,
            unitPrice: product ? product.price : 0
          };
        });
        salesService.createSale({
          establishmentId,
          userId: currentUser?.id && currentUser.id.length > 20 ? currentUser.id : null,
          totalAmount: cartTotal,
          paymentMethod: method,
          items: saleItems
        }).catch(err => console.warn('Erreur sauvegarde vente Supabase:', err));
      }
    } else {
      setOfflineSyncQueue(prev => [...prev, newSale]);
    }

    // Reset checkout states
    setCart({});
    setCheckoutStep(1);
    setSelectedPaymentMethod(null);
    setUssdCode(null);
    setCustomerPhone('');
  };

  // QR pointage simulation
  const handleQRScan = () => {
    if (!currentUser) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const isCheckingIn = !attendances.some(a => a.waitress_name === currentUser.name && a.check_out === null);
      const timeStr = new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
      
      if (isCheckingIn) {
        setAttendances(prev => [
          { id: 'a_' + Date.now(), waitress_name: currentUser.name, check_in: timeStr, check_out: null, method: 'QR_CODE' },
          ...prev
        ]);
        setScanMessage(`Arrivée enregistrée : ${timeStr}`);
      } else {
        setAttendances(prev => prev.map(a => {
          if (a.waitress_name === currentUser.name && a.check_out === null) {
            return { ...a, check_out: timeStr };
          }
          return a;
        }));
        setScanMessage(`Départ enregistré : ${timeStr}`);
      }

      setTimeout(() => setScanMessage(''), 3000);
    }, 1500);
  };

  // Simulated WhatsApp daily report
  const handleSendSimulatedWhatsAppReport = () => {
    if (!whatsappNumber) {
      alert("Veuillez saisir un numéro WhatsApp.");
      return;
    }
    setWhatsappSuccessMsg("⏳ Génération du rapport...");
    setTimeout(() => {
      const dailySales = sales.reduce((sum, s) => sum + s.total_amount, 0);
      const activeWaitresses = users.filter(u => u.role === 'WAITRESS' && u.is_active && u.status === 'VALIDATED').length;
      const lowStockCount = products.filter(p => p.current_stock < 10).length;
      
      const reportContent = `*Rapport Journalier MaquisSync (00:00)*\\n- Recettes : ${dailySales} FCFA\\n- Serveuses actives : ${activeWaitresses}\\n- Alertes stocks : ${lowStockCount}`;

      setWhatsappSuccessMsg(`✓ Envoyé au ${whatsappNumber}`);
      setTimeout(() => setWhatsappSuccessMsg(''), 4000);
    }, 1200);
  };

  // Static QR Code Generation
  const handleGenerateQrSubmit = () => {
    setPrintSuccessMsg('');
    setGeneratedQr(`QR-${qrTableNumber.replace(/\s+/g, '')}`);
  };

  // Simulated printing of static QR
  const handlePrintQr = () => {
    if (!generatedQr) return;
    setPrintSuccessMsg("⏳ Impression en cours...");
    setTimeout(() => {
      setPrintSuccessMsg(`✓ QR Code ${qrTableNumber} envoyé à l'imprimante !`);
      setTimeout(() => setPrintSuccessMsg(''), 4000);
    }, 1500);
  };

  // Gérant approvals with limit check
  const handleApproveWaitress = (id) => {
    if (isWaitressLimitReached) {
      alert(`Limite atteinte ! Impossible de valider d'autres serveuses. Votre formule (${subscriptionTier}) limite les serveuses actives à ${activeWaitressLimit}. Veuillez demander au propriétaire de faire un upgrade.`);
      return;
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'VALIDATED' } : u));
    if (isSupabaseConfigured() && id.length > 20) {
      staffService.updateStatus(id, 'VALIDATED').catch(err => console.warn('Erreur validation Supabase:', err));
    }
  };

  const handleRejectWaitress = (id) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'REJECTED' } : u));
    if (isSupabaseConfigured() && id.length > 20) {
      staffService.updateStatus(id, 'REJECTED').catch(err => console.warn('Erreur rejet Supabase:', err));
    }
  };

  const handleToggleWaitressActive = (id) => {
    const userToToggle = users.find(u => u.id === id);
    if (!userToToggle) return;

    // If we are reactivating a soft deleted waitress, check limit first
    if (!userToToggle.is_active && userToToggle.status === 'VALIDATED' && isWaitressLimitReached) {
      alert(`Réactivation bloquée : La limite maximale de serveuses actives (${activeWaitressLimit}) est atteinte. Modifiez votre formule d'abonnement.`);
      return;
    }

    const nextActive = !userToToggle.is_active;
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: nextActive } : u));
    if (isSupabaseConfigured() && id.length > 20) {
      staffService.toggleActive(id, nextActive).catch(err => console.warn('Erreur activation Supabase:', err));
    }
  };

  // Stock Adjustment Manual
  const handleAdjustStockSubmit = (e) => {
    e.preventDefault();
    if (!adjustQty) return;
    const qty = parseInt(adjustQty);
    let updatedStock = 0;
    setProducts(prev => prev.map(p => {
      if (p.id === adjustingProductId) {
        updatedStock = Math.max(0, p.current_stock + qty);
        return {
          ...p,
          current_stock: updatedStock
        };
      }
      return p;
    }));

    if (isSupabaseConfigured() && adjustingProductId && adjustingProductId.length > 20) {
      productService.updateStock(adjustingProductId, updatedStock).catch(err => console.warn('Erreur stock Supabase:', err));
    }

    setAdjustingProductId(null);
    setAdjustQty('');
  };

  // Add product to catalog (Manager interface)
  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductStock) return;
    const newP = {
      id: 'p_' + Date.now(),
      name: newProductName,
      volume: newProductVolume,
      price: parseFloat(newProductPrice),
      initial_stock: parseInt(newProductStock),
      current_stock: parseInt(newProductStock),
      image_base64: drinkImages[newProductImageKey],
      is_active: true
    };
    setProducts(prev => [...prev, newP]);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductStock('');

    if (isSupabaseConfigured()) {
      supabase.from('products').insert({
        establishment_id: establishmentId,
        name: newP.name,
        volume: newP.volume,
        price: newP.price,
        initial_stock: newP.initial_stock,
        current_stock: newP.current_stock,
        is_active: true
      }).select().single().then(({ data }) => {
        if (data) {
          setProducts(prev => prev.map(p => p.id === newP.id ? { ...p, id: data.id } : p));
        }
      }).catch(err => console.warn('Erreur ajout produit Supabase:', err));
    }
  };

  // Owner Financial Stats with Filter: Jour / Semaine / Mois
  const ownerFinancials = useMemo(() => {
    const dayRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0) + 
                         offlineSyncQueue.reduce((sum, s) => sum + s.total_amount, 0);
    
    let revenue = dayRevenue;
    if (ownerTimeFilter === 'SEMAINE') {
      revenue = dayRevenue * 6.2 + 85000;
    } else if (ownerTimeFilter === 'MOIS') {
      revenue = dayRevenue * 26.5 + 420000;
    }

    const estimatedBeverageCost = Math.round(revenue * 0.55); // 55% average cost
    const netProfit = Math.round(revenue - estimatedBeverageCost);
    const netMargin = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;
    
    return {
      revenue: Math.round(revenue),
      cost: estimatedBeverageCost,
      profit: netProfit,
      margin: netMargin
    };
  }, [sales, offlineSyncQueue, ownerTimeFilter]);

  return (
    <div id="root">
      {/* IMPERSONATION SUPPORT BANNER */}
      {impersonatedEstablishment && (
        <div style={{
          background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
          color: '#ffffff',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 99999,
          boxShadow: '0 4px 16px rgba(220, 38, 38, 0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ background: '#ffffff', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 900 }}>
              MODE SUPPORT ACTIF
            </span>
            <span style={{ fontSize: '13px' }}>
              Session d'assistance en cours sur : <strong>{impersonatedEstablishment.name}</strong> (Propriétaire : {impersonatedEstablishment.ownerName} - {impersonatedEstablishment.phone})
            </span>
          </div>
          <button
            onClick={() => {
              setImpersonatedEstablishment(null);
              setViewMode('SUPER_ADMIN');
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              color: '#ffffff',
              padding: '4px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Quitter le mode support ✕
          </button>
        </div>
      )}

      {/* 1. SITE HEADER (HIDDEN IF IN FULL-SCREEN SUPER_ADMIN OU BOSS_ADMIN MODE) */}
      {viewMode !== 'SUPER_ADMIN' && viewMode !== 'BOSS_ADMIN' && (
        <header className="site-header">
          <div className="container header-wrapper">
            {/* LOGO ENVELOPPÉ POUR GESTE SECRET (5 clics en <2s -> /boss-admin) */}
            <div 
              className="logo" 
              onClick={handleSecretLogoTrigger}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="MaquisSync"
            >
              <Beer size={28} />
              MAQUIS<span>SYNC</span>
            </div>
            
            <nav>
              <ul className="nav-menu">
                <li><a href="#features" className="nav-link">Pourquoi choisir ?</a></li>
                <li><a href="#features-detail" className="nav-link">Fonctionnalités</a></li>
                <li><a href="#demo" className="nav-link">Simulateur</a></li>
                <li><a href="#tarifs" className="nav-link">Tarifs</a></li>
                <li><a href="#contact" className="nav-link">Contact</a></li>
              </ul>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {viewMode === 'MOBILE_POS' ? (
                <button
                  onClick={() => setViewMode('LANDING')}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: '10px',
                  }}
                >
                  ← Retour au site
                </button>
              ) : (
                <button
                  onClick={() => { setOnboardingInitialPlan('Accès'); setShowOnboardingModal(true); }}
                  className="btn btn-primary btn-pulse"
                  style={{
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  ✨ S'abonner (7j Gratuits)
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* VIEW: HIDDEN ROUTE /boss-admin (ADMIN LOGIN SCREEN) */}
      {viewMode === 'BOSS_ADMIN' && (
        <AdminLoginScreen
          onSuccess={() => {
            setLoggedInUserId('sa1');
            setViewMode('SUPER_ADMIN');
          }}
          onCancel={() => {
            window.location.hash = '';
            setViewMode('LANDING');
          }}
        />
      )}

      {/* VIEW: FULL SCREEN SUPER ADMIN CONSOLE */}
      {viewMode === 'SUPER_ADMIN' && (
        <SuperAdminConsole
          onExit={() => {
            window.location.hash = '';
            setViewMode('LANDING');
          }}
          onImpersonate={(est) => {
            setImpersonatedEstablishment(est);
            setViewMode('MOBILE_POS');
            setLoggedInUserId('u1');
          }}
        />
      )}

      {/* 2. HERO SECTION & MARKETING (HIDDEN IN MOBILE_POS AND SUPER_ADMIN MODES) */}
      {viewMode === 'LANDING' && (
        <>
          <section className="hero-section">
        <div className="container">
          <div className="badge">
            <TrendingUp size={14} style={{ marginRight: '4px' }} /> Zéro Perte, Contrôle Absolu
          </div>
          <h1 className="hero-title">
            Gérez votre maquis à <span>100% hors-ligne</span> et sans perte d'argent.
          </h1>
          <p className="hero-desc">
            Prenez les commandes en 2 étapes sur mobile, suivez les stocks en direct et recevez votre bilan tous les soirs sur WhatsApp.
          </p>
          <div className="hero-actions" style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => { setOnboardingInitialPlan('Accès'); setShowOnboardingModal(true); }}
              className="btn btn-primary btn-lg btn-pulse"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              ✨ S'abonner (7 Jours Gratuits)
            </button>
            <a href="#demo" className="btn btn-secondary btn-lg">Essayer le Simulateur Gratuit</a>
          </div>
        </div>
      </section>

      {/* 3. ADVANTAGES SECTION */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Pourquoi choisir <span>Maquis Sync</span> ?</h2>
            <p className="section-subtitle">
              Une plateforme robuste et intuitive pour simplifier la gestion quotidienne de votre établissement.
            </p>
          </div>

          <div className="features-grid">
            {/* Advantage 1 */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <div className="feature-icon-wrapper" style={{ color: 'var(--primary)' }}>
                <WifiOff size={22} />
              </div>
              <h3 className="feature-title" style={{ color: 'var(--text-primary)' }}>Marche même sans internet</h3>
              <p className="feature-desc" style={{ color: 'var(--text-secondary)' }}>
                Ne bloquez plus vos encaissements à cause des coupures de réseau. Le système fonctionne 100 % hors-ligne, votre service ne s'arrête jamais.
              </p>
            </div>

            {/* Advantage 2 */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <div className="feature-icon-wrapper" style={{ color: 'var(--secondary)' }}>
                <Lock size={22} />
              </div>
              <h3 className="feature-title" style={{ color: 'var(--text-primary)' }}>Fini les trous dans la caisse</h3>
              <p className="feature-desc" style={{ color: 'var(--text-secondary)' }}>
                Suivez chaque bouteille vendue et chaque franc encaissé. Vous gardez un contrôle strict sur vos stocks pour éviter les pertes et sécuriser votre argent.
              </p>
            </div>

            {/* Advantage 3 */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <div className="feature-icon-wrapper" style={{ color: '#00ccff' }}>
                <Send size={22} />
              </div>
              <h3 className="feature-title" style={{ color: 'var(--text-primary)' }}>Votre bilan du jour sur WhatsApp</h3>
              <p className="feature-desc" style={{ color: 'var(--text-secondary)' }}>
                Pas besoin de rester sur place jusqu'à la fermeture. Chaque nuit à minuit, recevez le résumé clair de vos ventes et de vos bénéfices directement sur votre téléphone.
              </p>
            </div>

            {/* Advantage 4 */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <div className="feature-icon-wrapper" style={{ color: 'var(--warning)' }}>
                <Zap size={22} />
              </div>
              <h3 className="feature-title" style={{ color: 'var(--text-primary)' }}>Un service plus rapide</h3>
              <p className="feature-desc" style={{ color: 'var(--text-secondary)' }}>
                Les serveurs prennent les commandes en seulement deux étapes sur leur mobile. Moins d'attente pour les clients.
              </p>
            </div>

            {/* Advantage 5 */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <div className="feature-icon-wrapper" style={{ color: 'var(--primary)' }}>
                <Users size={22} />
              </div>
              <h3 className="feature-title" style={{ color: 'var(--text-primary)' }}>Suivi en temps réel des serveuses</h3>
              <p className="feature-desc" style={{ color: 'var(--text-secondary)' }}>
                Gardez un œil sur l'activité de votre personnel. Sachez exactement qui a pris quelle commande et suivez les ventes en direct.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3.1 FONCTIONNALITÉS CLÉS SECTION */}
      <section id="features-detail" className="features-section" style={{ background: '#FFFFFF', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Fonctionnalités <span>Clés</span></h2>
            <p className="section-subtitle">
              Des outils modernes pensés spécifiquement pour simplifier la gestion de votre établissement.
            </p>
          </div>
          
          <div className="features-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: '40px' }}>
            {/* key feature 1 */}
            <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="feature-icon-wrapper" style={{ color: 'var(--primary)' }}>
                <QrCode size={22} />
              </div>
              <h3 className="feature-title" style={{ color: 'var(--text-primary)', margin: 0 }}>Gestion des présences par QR Code</h3>
              <p className="feature-desc" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Le gérant génère un QR Code statique à afficher dans le maquis. Les serveuses le scannent avec leur téléphone pour signaler facilement leur heure d'arrivée et de départ.
              </p>
            </div>
            
            {/* key feature 2 */}
            <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="feature-icon-wrapper" style={{ color: 'var(--secondary)' }}>
                <Send size={22} />
              </div>
              <h3 className="feature-title" style={{ color: 'var(--text-primary)', margin: 0 }}>Reporting Automatique WhatsApp</h3>
              <p className="feature-desc" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Chaque nuit à 00h00, recevez un rapport d'activité complet consolidé directement sur votre numéro WhatsApp pour suivre vos ventes à distance.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )}

      {/* 4. DYNAMIC INTERACTIVE DEMO (UNIFIED MOBILE APP SIMULATOR) */}
      {viewMode !== 'SUPER_ADMIN' && (
        <section id="demo" className="demo-section" style={viewMode === 'MOBILE_POS' ? { paddingTop: '24px' } : {}}>
        <div className="container">
          {viewMode === 'MOBILE_POS' ? (
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>
                <Smartphone size={15} /> Interface Mobile Serveuse (POS) en direct
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px 0' }}>
                Testez la prise de commande et l'encaissement
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '650px', margin: '0 auto' }}>
                Ajoutez des boissons au panier dans le téléphone ci-dessous, encaissez en Espèces ou Mobile Money, et observez la mise à jour en temps réel sur Supabase.
              </p>
            </div>
          ) : (
            <div className="section-header">
              <h2 className="section-title">Application Mobile <span>Tout-en-Un</span></h2>
              <p className="section-subtitle">
                Saisissez un numéro de téléphone ci-dessous pour être redirigé vers l'interface Propriétaire, Gérant ou Serveuse.
              </p>
            </div>
          )}

          <div className="demo-grid">
            {/* Left: Test credentials and simulation helper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontFamily: 'var(--font-heading)', color: 'var(--primary)', fontSize: '20px' }}>Comptes de Test</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Owner Credentials */}
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>👑 Propriétaire (Owner)</span>
                      <button 
                        onClick={() => {
                          setPhoneLoginInput('76000000');
                          setPinLoginInput('1111');
                          setIsRegisteringMode(false);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        Saisir
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Tél : <code style={{ color: 'var(--primary)' }}>76000000</code> | Code PIN : <code style={{ color: 'var(--primary)' }}>1111</code>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Rôle : Gère la formule d'abonnement, paramètre la syntaxe USSD et consulte les rapports (Jour/Semaine/Mois).
                    </div>
                  </div>

                  {/* Manager Credentials */}
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>💼 Gérant (Manager)</span>
                      <button 
                        onClick={() => {
                          setPhoneLoginInput('70222222');
                          setPinLoginInput('2222');
                          setIsRegisteringMode(false);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        Saisir
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Tél : <code style={{ color: 'var(--primary)' }}>70222222</code> | Code PIN : <code style={{ color: 'var(--primary)' }}>2222</code>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Rôle : Valide les comptes serveuses, gère le catalogue des boissons (ajouts, volumes), et contrôle les présences.
                    </div>
                  </div>

                  {/* Waitress Credentials */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>🍹 Serveuse (Waitress)</span>
                      <button 
                        onClick={() => {
                          setPhoneLoginInput('70123456');
                          setPinLoginInput('3333');
                          setIsRegisteringMode(false);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        Saisir
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Tél : <code style={{ color: 'var(--primary)' }}>70123456</code> | Code PIN : <code style={{ color: 'var(--primary)' }}>3333</code>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Rôle : Prise de commande en 2 étapes, pointage de présence QR, encaissement USSD.
                    </div>
                  </div>

                </div>
              </div>

              {/* Simulation Instructions */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>Guide de simulation interactif :</h4>
                <ol style={{ margin: '0', paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                  <li style={{ marginBottom: '6px' }}>
                    Connectez-vous en tant que <strong>Propriétaire (76000000)</strong> et sélectionnez la formule <strong>Découverte (limite: 10 serveuses)</strong>. Paramétrez un template USSD Moov ou Orange.
                  </li>
                  <li style={{ marginBottom: '6px' }}>
                    Déconnectez-vous, puis cliquez sur <strong>S'enregistrer</strong> pour inscrire une nouvelle serveuse de test.
                  </li>
                  <li style={{ marginBottom: '6px' }}>
                    Connectez-vous en tant que <strong>Gérant (70222222)</strong> pour valider l'inscription de la serveuse. Ajoutez une nouvelle boisson dans l'onglet <strong>Catalogue</strong>.
                  </li>
                  <li style={{ marginBottom: '6px' }}>
                    Connectez-vous en tant que la nouvelle serveuse. Vous constaterez que la nouvelle boisson est disponible dans votre catalogue mobile.
                  </li>
                  <li>
                    Faites une vente Mobile Money, et observez la génération USSD dynamique basée sur la syntaxe exclusive du propriétaire.
                  </li>
                </ol>
              </div>
            </div>

            {/* Right: The Simulator Device */}
            <div className="device-container">
              <div className="device-frame">
                
                {/* Connection Status indicator */}
                {!isOnline && (
                  <div className="offline-banner">
                    <WifiOff size={14} /> Mode local hors-connexion
                  </div>
                )}

                <div className="device-screen">
                  {/* Status Bar */}
                  <div className="screen-header">
                    <span 
                      onClick={handleSecretLogoTrigger}
                      style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '12px', cursor: 'default', userSelect: 'none' }}
                      title="MAQUISYNC MOBILE"
                    >
                      ⚡ MAQUISYNC MOBILE
                    </span>
                    <div className="status-bar-indicators" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => setShowMobileContactModal(true)} 
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Contact Support"
                      >
                        <Phone size={13} />
                      </button>
                      {isOnline ? <Wifi size={14} style={{ color: 'var(--secondary)' }} /> : <WifiOff size={14} style={{ color: 'var(--danger)' }} />}
                      {isSyncing && <RefreshCw size={12} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />}
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>10:30</span>
                    </div>
                  </div>

                  {/* Screen Content Wrapper */}
                  <div className="screen-content">
                    
                    {!loggedInUserId ? (
                      // A. LOGGED OUT: SIGN IN / SIGN UP SCREEN
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                        
                        {!isRegisteringMode ? (
                          // SIGN IN FORM
                          <>
                            <h3 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '18px', fontFamily: 'var(--font-heading)' }}>Connexion</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>
                              Saisissez votre numéro de téléphone et votre PIN pour accéder à votre interface.
                            </p>

                            <form onSubmit={handleLoginSubmit}>
                              <div className="input-group">
                                <label className="input-label">Numéro de Téléphone</label>
                                <input 
                                  type="text" 
                                  placeholder="70123456" 
                                  className="input-field"
                                  value={phoneLoginInput}
                                  onChange={(e) => setPhoneLoginInput(e.target.value)}
                                />
                              </div>

                              <div className="input-group">
                                <label className="input-label">Code PIN de sécurité</label>
                                <input 
                                  type="password" 
                                  placeholder="••••" 
                                  className="input-field"
                                  value={pinLoginInput}
                                  onChange={(e) => setPinLoginInput(e.target.value)}
                                  readOnly
                                />
                              </div>

                              <div className="pin-indicator-container">
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className={`pin-dot ${pinLoginInput.length > i ? 'active' : ''}`} />
                                ))}
                              </div>

                              {authError && (
                                <p style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>{authError}</p>
                              )}

                              {/* Custom Safe Dial Pad */}
                              <div className="pin-pad">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                  <button key={num} type="button" className="keypad-btn" onClick={() => handleKeypadPress(num.toString())}>
                                    {num}
                                  </button>
                                ))}
                                <button type="button" className="keypad-btn" style={{ color: 'var(--danger)' }} onClick={handleKeypadClear}>⌫</button>
                                <button type="button" className="keypad-btn" onClick={() => handleKeypadPress('0')}>0</button>
                                <button type="submit" className="keypad-btn" style={{ color: 'var(--secondary)' }} disabled={pinLoginInput.length < 4}>✓</button>
                              </div>

                              <button 
                                type="submit" 
                                className="btn btn-primary" 
                                style={{ width: '100%', marginTop: '16px', padding: '10px' }}
                              >
                                Se Connecter
                              </button>
                            </form>

                            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Nouvelle serveuse ? </span>
                              <button 
                                onClick={() => { setIsRegisteringMode(true); setAuthError(''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                              >
                                S'enregistrer
                              </button>
                            </div>
                          </>
                        ) : (
                          // SELF REGISTRATION FORM (SERVEUSE AUTO-INSCRIPTION)
                          <>
                            <h3 style={{ textAlign: 'center', marginBottom: '4px', fontSize: '18px', fontFamily: 'var(--font-heading)' }}>S'enregistrer</h3>
                            
                            {/* Limit info banner */}
                            <div style={{ background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.15)', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', color: 'var(--primary)', marginBottom: '12px', textAlign: 'center' }}>
                              Limite active : {activeWaitressesCount} / {activeWaitressLimit === Infinity ? 'Illimitée' : activeWaitressLimit} serveuses
                            </div>

                            <form onSubmit={handleRegisterSubmit}>
                              <div className="input-group">
                                <label className="input-label">Nom complet</label>
                                <input 
                                  type="text" 
                                  placeholder="Aminata Koné" 
                                  className="input-field"
                                  value={regNameInput}
                                  onChange={(e) => setRegNameInput(e.target.value)}
                                  required
                                />
                              </div>

                              <div className="input-group">
                                <label className="input-label">Numéro de téléphone</label>
                                <input 
                                  type="text" 
                                  placeholder="70445566" 
                                  className="input-field"
                                  value={regPhoneInput}
                                  onChange={(e) => setRegPhoneInput(e.target.value)}
                                  required
                                />
                              </div>

                              <div className="input-group">
                                <label className="input-label">Définir un Code PIN ({regPinInput.length}/4)</label>
                                <input 
                                  type="password" 
                                  placeholder="••••" 
                                  className="input-field"
                                  value={regPinInput}
                                  onChange={(e) => setRegPinInput(e.target.value)}
                                  readOnly
                                />
                              </div>

                              <div className="pin-indicator-container">
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className={`pin-dot ${regPinInput.length > i ? 'active' : ''}`} />
                                ))}
                              </div>

                              {authError && (
                                <p style={{ color: 'var(--danger)', fontSize: '11px', marginBottom: '10px', textAlign: 'center' }}>{authError}</p>
                              )}

                              {/* Custom Keypad for Register PIN */}
                              <div className="pin-pad">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                  <button key={num} type="button" className="keypad-btn" onClick={() => handleKeypadPress(num.toString())}>
                                    {num}
                                  </button>
                                ))}
                                <button type="button" className="keypad-btn" style={{ color: 'var(--danger)' }} onClick={handleKeypadClear}>⌫</button>
                                <button type="button" className="keypad-btn" onClick={() => handleKeypadPress('0')}>0</button>
                                <button type="submit" className="keypad-btn" style={{ color: 'var(--secondary)' }} disabled={regPinInput.length < 4}>✓</button>
                              </div>

                              <button 
                                type="submit" 
                                className="btn btn-primary" 
                                style={{ width: '100%', marginTop: '14px', padding: '10px' }}
                              >
                                Envoyer la demande
                              </button>
                            </form>

                            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                              <button 
                                onClick={() => { setIsRegisteringMode(false); setAuthError(''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', fontSize: '12px', cursor: 'pointer' }}
                              >
                                Annuler
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      // B. USER IS LOGGED IN: DYNAMIC ROUTING TO ROLE INTERFACE
                      
                      // ----------------------------------------------------
                      // ROLE: SUPER ADMIN MOBILE VIEW
                      // ----------------------------------------------------
                      currentUser.role === 'SUPER_ADMIN' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', padding: '6px 0' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ShieldCheck size={16} style={{ color: '#ef4444' }} />
                                <h4 style={{ margin: 0, fontSize: '14px', color: '#ef4444', fontWeight: 800 }}>Console Super Admin</h4>
                              </div>
                              <button onClick={() => setLoggedInUserId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><LogOut size={16} /></button>
                            </div>

                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
                              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>MRR GLOBAL DU SAAS</div>
                              <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981' }}>29 800 F CFA</div>
                              <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>4 maquis abonnés • 1 en attente</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <button
                                onClick={() => setViewMode('SUPER_ADMIN')}
                                style={{
                                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '12px',
                                  fontWeight: 800,
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                }}
                              >
                                Ouvrir la Console Complète ➔
                              </button>

                              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px', fontSize: '11px' }}>
                                <div style={{ fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>⏳ Demande en attente :</div>
                                <div style={{ color: '#cbd5e1' }}>Restaurant Oasis Tropical</div>
                                <div style={{ color: '#10b981', fontWeight: 700 }}>19 900 F CFA (Formule Premium)</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                            Session Maître chiffrée • Rôle SUPER_ADMIN
                          </div>
                        </div>
                      ) :

                      // ----------------------------------------------------
                      // ROLE: PROPRIÉTAIRE (OWNER) MOBILE VIEW
                      // ----------------------------------------------------
                      currentUser.role === 'OWNER' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>Vue Propriétaire</h4>
                              <button onClick={() => setLoggedInUserId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><LogOut size={16} /></button>
                            </div>

                            {/* Time Filters */}
                            <div className="filter-tabs">
                              <button className={`filter-tab-btn ${ownerTimeFilter === 'JOUR' ? 'active' : ''}`} onClick={() => setOwnerTimeFilter('JOUR')}>Jour</button>
                              <button className={`filter-tab-btn ${ownerTimeFilter === 'SEMAINE' ? 'active' : ''}`} onClick={() => setOwnerTimeFilter('SEMAINE')}>Semaine</button>
                              <button className={`filter-tab-btn ${ownerTimeFilter === 'MOIS' ? 'active' : ''}`} onClick={() => setOwnerTimeFilter('MOIS')}>Mois</button>
                            </div>

                            {/* Profitability indicators */}
                            <div className="owner-metric-grid">
                              <div className="owner-card">
                                <span className="owner-card-title">Recettes Brutes</span>
                                <div className="owner-card-value" style={{ color: 'var(--secondary)' }}>{ownerFinancials.revenue} F</div>
                              </div>
                              <div className="owner-card">
                                <span className="owner-card-title">Coûts Boissons</span>
                                <div className="owner-card-value" style={{ color: 'var(--danger)' }}>{ownerFinancials.cost} F</div>
                              </div>
                              <div className="owner-card" style={{ gridColumn: 'span 2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <span className="owner-card-title">Bénéfice Net</span>
                                    <div className="owner-card-value" style={{ color: 'var(--primary)' }}>{ownerFinancials.profit} F</div>
                                  </div>
                                  <div style={{ background: 'rgba(217, 160, 91, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                    {ownerFinancials.margin}% Marge
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Config exclusive owner section */}
                            <div className="glass-card" style={{ padding: '12px', marginBottom: '12px', background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)' }}>
                              <h5 style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Settings size={12} /> Réglage USSD Exclusif
                              </h5>
                              <div className="input-group" style={{ marginBottom: '8px' }}>
                                <label className="input-label" style={{ fontSize: '9px' }}>Modèle de code USSD</label>
                                <input 
                                  type="text" 
                                  className="input-field" 
                                  style={{ fontSize: '11px', padding: '6px', background: '#0a0a0f' }}
                                  value={ussdTemplate}
                                  onChange={(e) => setUssdTemplate(e.target.value)}
                                />
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                                Variables : <code>[MONTANT]</code> et <code>[NUMERO_CLIENT]</code>.
                              </div>
                            </div>

                            {/* Subscription Config Select */}
                            <div className="glass-card" style={{ padding: '12px', background: 'rgba(217, 160, 91, 0.05)', borderColor: 'var(--primary)' }}>
                              <label className="input-label" style={{ fontSize: '9px', marginBottom: '4px' }}>Formule d'Abonnement Actuelle</label>
                              <select 
                                className="input-field" 
                                style={{ padding: '6px', fontSize: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                                value={subscriptionTier}
                                onChange={(e) => setSubscriptionTier(e.target.value)}
                              >
                                <option value="DECOUVERTE">Découverte (9 900 F / Max 10 serveuses)</option>
                                <option value="ACCES">Accès (14 900 F / Max 50 serveuses)</option>
                                <option value="PREMIUM">Premium (19 900 F / Illimité)</option>
                              </select>
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Serveuses actives : <strong style={{ color: 'var(--text-primary)' }}>{activeWaitressesCount} / {activeWaitressLimit === Infinity ? 'Illimitée' : activeWaitressLimit}</strong>
                              </div>
                            </div>

                            {/* WhatsApp daily report settings */}
                            <div className="glass-card" style={{ padding: '12px', marginTop: '12px', background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)' }}>
                              <h5 style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Send size={12} /> Rapport Automatique WhatsApp
                              </h5>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={whatsappEnabled} 
                                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                                    style={{ accentColor: 'var(--secondary)' }}
                                  />
                                  Activer l'envoi journalier à 00H00
                                </label>
                              </div>
                              {whatsappEnabled && (
                                <div className="input-group" style={{ marginBottom: '0px' }}>
                                  <label className="input-label" style={{ fontSize: '9px' }}>Numéro WhatsApp</label>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <input 
                                      type="text" 
                                      className="input-field" 
                                      style={{ fontSize: '11px', padding: '4px 6px', background: '#0a0a0f', flex: 1 }}
                                      value={whatsappNumber}
                                      onChange={(e) => setWhatsappNumber(e.target.value)}
                                      placeholder="+226 65 61 34 72"
                                    />
                                    <button 
                                      onClick={handleSendSimulatedWhatsAppReport}
                                      className="btn btn-secondary" 
                                      style={{ padding: '4px 8px', fontSize: '10px', borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
                                    >
                                      Tester
                                    </button>
                                  </div>
                                </div>
                              )}
                              {whatsappSuccessMsg && (
                                <div style={{ fontSize: '10px', color: 'var(--secondary)', marginTop: '6px', background: 'rgba(16, 185, 129, 0.05)', padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                  {whatsappSuccessMsg}
                                </div>
                              )}
                            </div>

                            {/* Static Table QR Generator */}
                            <div className="glass-card" style={{ padding: '12px', marginTop: '12px', background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)', marginBottom: '12px' }}>
                              <h5 style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <QrCode size={12} /> QR Code Statique de Table
                              </h5>
                              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                                <select 
                                  className="input-field" 
                                  style={{ flex: 1, padding: '4px 6px', fontSize: '11px', background: '#0a0a0f', borderColor: 'var(--border-color)' }}
                                  value={qrTableNumber}
                                  onChange={(e) => { setQrTableNumber(e.target.value); setGeneratedQr(null); }}
                                >
                                  <option value="Table 1">Table 1</option>
                                  <option value="Table 2">Table 2</option>
                                  <option value="Table 3">Table 3</option>
                                  <option value="Table 4">Table 4</option>
                                  <option value="Table 5">Table 5</option>
                                  <option value="VIP 1">VIP 1</option>
                                  <option value="VIP 2">VIP 2</option>
                                  <option value="Comptoir">Comptoir</option>
                                </select>
                                <button 
                                  onClick={handleGenerateQrSubmit}
                                  className="btn btn-primary" 
                                  style={{ padding: '4px 10px', fontSize: '11px' }}
                                >
                                  Générer
                                </button>
                              </div>

                              {generatedQr && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                  <svg width="60" height="60" viewBox="0 0 29 29" style={{ background: '#fff', padding: '4px', borderRadius: '4px' }}>
                                    <path d="M0 0h7v7H0zm2 2v3h3V2zm0 15h3v3H0zm7 7h7v7H0zm2 2v3h3V24zm15-7h3v3h-3zm5-5h3v3h-3zm-5 5h3v3h-3zm10 5h3v3h-3zm-5 5h3v3h-3zm-5-15h3v3h-3zm0-10h7v7h-7zm2 2v3h3V2zm5 5h3v3h-3zm5-5h3v3h-3zm-5 5h3v3h-3zm5-5h3v3h-3z" fill="#0c0c10" />
                                    <rect x="11" y="11" width="7" height="7" fill="var(--primary)" />
                                  </svg>
                                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--primary)' }}>{generatedQr}</span>
                                  <p style={{ fontSize: '9px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                                    QR Code statique à imprimer et coller sur la table.
                                  </p>
                                  <button 
                                    onClick={handlePrintQr}
                                    className="btn btn-secondary" 
                                    style={{ padding: '2px 8px', fontSize: '9px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                  >
                                    <Printer size={10} /> Imprimer
                                  </button>
                                </div>
                              )}

                              {printSuccessMsg && (
                                <div style={{ fontSize: '9px', color: 'var(--primary)', marginTop: '4px', textAlign: 'center' }}>
                                  {printSuccessMsg}
                                </div>
                              )}
                            </div>

                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                            Abonnement Actif - Renouvellement : 19/08/2026
                          </div>
                        </div>
                      ) :

                      // ----------------------------------------------------
                      // ROLE: GÉRANT (MANAGER) MOBILE VIEW
                      // ----------------------------------------------------
                      currentUser.role === 'MANAGER' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--secondary)', fontFamily: 'var(--font-heading)' }}>Vue Gérant</h4>
                              <button onClick={() => setLoggedInUserId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><LogOut size={16} /></button>
                            </div>

                            {/* Subscriptions Limit Banner */}
                            {isWaitressLimitReached && (
                              <div className="quota-alert-banner">
                                <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                                Limite de serveuses actives atteinte ({activeWaitressesCount}/{activeWaitressLimit}). La validation est bloquée. Upgrade nécessaire.
                              </div>
                            )}

                            {/* Tabs inside Manager panel */}
                            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: '12px' }}>
                              <button 
                                onClick={() => setGerantTab('validation')} 
                                style={{ flex: 1, background: 'none', border: 'none', borderBottom: gerantTab === 'validation' ? '2px solid var(--secondary)' : 'none', color: gerantTab === 'validation' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '11px', paddingBottom: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Équipe
                                {users.some(u => u.role === 'WAITRESS' && u.status === 'PENDING') && (
                                  <span style={{ display: 'inline-block', width: '6px', height: '6px', background: 'var(--danger)', borderRadius: '50%', marginLeft: '4px', verticalAlign: 'middle' }} />
                                )}
                              </button>
                              <button 
                                onClick={() => setGerantTab('catalogue')} 
                                style={{ flex: 1.1, background: 'none', border: 'none', borderBottom: gerantTab === 'catalogue' ? '2px solid var(--secondary)' : 'none', color: gerantTab === 'catalogue' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '11px', paddingBottom: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Catalogue
                              </button>
                              <button 
                                onClick={() => setGerantTab('presences')} 
                                style={{ flex: 1.1, background: 'none', border: 'none', borderBottom: gerantTab === 'presences' ? '2px solid var(--secondary)' : 'none', color: gerantTab === 'presences' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '11px', paddingBottom: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Présences
                              </button>
                              <button 
                                onClick={() => setGerantTab('stocks')} 
                                style={{ flex: 0.9, background: 'none', border: 'none', borderBottom: gerantTab === 'stocks' ? '2px solid var(--secondary)' : 'none', color: gerantTab === 'stocks' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '11px', paddingBottom: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Stocks
                              </button>
                            </div>

                            {/* Tab CONTENT: Waitresses approval queue & active team */}
                            {gerantTab === 'validation' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '240px' }}>
                                <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Attente approbation</h5>
                                {users.filter(u => u.role === 'WAITRESS' && u.status === 'PENDING').length === 0 ? (
                                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0' }}>Aucune inscription en attente.</p>
                                ) : (
                                  users.filter(u => u.role === 'WAITRESS' && u.status === 'PENDING').map(u => (
                                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                      <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{u.name}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Tél : {u.phone}</div>
                                      </div>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <button 
                                          onClick={() => handleApproveWaitress(u.id)}
                                          disabled={isWaitressLimitReached}
                                          className="btn btn-emerald" 
                                          style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', gap: '2px', opacity: isWaitressLimitReached ? 0.5 : 1 }}
                                        >
                                          Valider
                                        </button>
                                        <button 
                                          onClick={() => handleRejectWaitress(u.id)}
                                          className="btn btn-danger" 
                                          style={{ padding: '3px 8px', fontSize: '10px' }}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}

                                <h5 style={{ margin: '8px 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Gestion Équipe / Turnover</h5>
                                {users.filter(u => u.role === 'WAITRESS' && u.status === 'VALIDATED').map(u => (
                                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '6px 8px', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.03)', opacity: u.is_active ? 1 : 0.6 }}>
                                    <div>
                                      <div style={{ fontWeight: 'bold', fontSize: '11px', textDecoration: u.is_active ? 'none' : 'line-through' }}>{u.name}</div>
                                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Tél : {u.phone}</div>
                                    </div>
                                    <button 
                                      onClick={() => handleToggleWaitressActive(u.id)}
                                      className="btn" 
                                      style={{ 
                                        padding: '2px 6px', 
                                        fontSize: '9px', 
                                        borderColor: u.is_active ? 'var(--danger)' : 'var(--secondary)',
                                        color: u.is_active ? 'var(--danger)' : 'var(--secondary)',
                                        background: 'none',
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                    >
                                      {u.is_active ? 'Désactiver (Soft Delete)' : 'Réactiver'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Tab CONTENT: Drinks Catalogue management */}
                            {gerantTab === 'catalogue' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '240px' }}>
                                <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Nouveau Produit au Catalogue</h5>
                                <form onSubmit={handleAddProduct} style={{ background: '#121217', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                  <div className="input-group" style={{ marginBottom: '8px' }}>
                                    <label className="input-label" style={{ fontSize: '9px' }}>Nom de boisson</label>
                                    <input 
                                      type="text" 
                                      placeholder="ex: Beaufort" 
                                      className="input-field" 
                                      style={{ padding: '6px', fontSize: '11px' }}
                                      value={newProductName}
                                      onChange={(e) => setNewProductName(e.target.value)}
                                      required
                                    />
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                      <label className="input-label" style={{ fontSize: '9px' }}>Prix (FCFA)</label>
                                      <input 
                                        type="number" 
                                        placeholder="1000" 
                                        className="input-field" 
                                        style={{ padding: '6px', fontSize: '11px' }}
                                        value={newProductPrice}
                                        onChange={(e) => setNewProductPrice(e.target.value)}
                                        required
                                      />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                      <label className="input-label" style={{ fontSize: '9px' }}>Volume</label>
                                      <select 
                                        className="input-field" 
                                        style={{ padding: '6px', fontSize: '11px' }}
                                        value={newProductVolume}
                                        onChange={(e) => setNewProductVolume(e.target.value)}
                                      >
                                        <option value="33cl">33cl</option>
                                        <option value="65cl">65cl</option>
                                        <option value="1.5L">1.5L</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                      <label className="input-label" style={{ fontSize: '9px' }}>Stock Initial</label>
                                      <input 
                                        type="number" 
                                        placeholder="50" 
                                        className="input-field" 
                                        style={{ padding: '6px', fontSize: '11px' }}
                                        value={newProductStock}
                                        onChange={(e) => setNewProductStock(e.target.value)}
                                        required
                                      />
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 0 }}>
                                      <label className="input-label" style={{ fontSize: '9px' }}>Image Cache</label>
                                      <select 
                                        className="input-field" 
                                        style={{ padding: '6px', fontSize: '11px' }}
                                        value={newProductImageKey}
                                        onChange={(e) => setNewProductImageKey(e.target.value)}
                                      >
                                        <option value="beer_gold">Bière Blonde</option>
                                        <option value="beer_green">Bière Brune/Verte</option>
                                        <option value="stout_dark">Stout (Guinness)</option>
                                        <option value="water_blue">Eau / Soda</option>
                                      </select>
                                    </div>
                                  </div>
                                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '8px', fontSize: '11px' }}>Ajouter et Synchroniser</button>
                                </form>
                              </div>
                            )}

                            {/* Tab CONTENT: Staff Presence checking */}
                            {gerantTab === 'presences' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '240px' }}>
                                <h5 style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Contrôle de présence sur le terrain</h5>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {users.filter(u => u.role === 'WAITRESS' && u.is_active && u.status === 'VALIDATED').map(w => {
                                    const activeShift = attendances.find(a => a.waitress_name === w.name && a.check_out === null);
                                    return (
                                      <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div>
                                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{w.name}</span>
                                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tél : {w.phone}</div>
                                        </div>
                                        <div>
                                          {activeShift ? (
                                            <span className="attendance-badge present">
                                              ● Présente (Arrivée : {activeShift.check_in})
                                            </span>
                                          ) : (
                                            <span className="attendance-badge absent">
                                              Hors Service
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <h5 style={{ margin: '10px 0 4px 0', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Historique du jour</h5>
                                {attendances.map(a => (
                                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.03)', padding: '4px 0' }}>
                                    <span>{a.waitress_name}</span>
                                    <span>{a.check_in} - {a.check_out || 'En rotation'}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Tab CONTENT: Stocks catalog & breakages */}
                            {gerantTab === 'stocks' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {/* Alerts */}
                                {products.some(p => p.current_stock < 10) && (
                                  <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.15)', borderRadius: '6px', padding: '6px 8px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: 'var(--danger)' }}>
                                    <AlertTriangle size={14} />
                                    <span>Certains produits sont presque épuisés !</span>
                                  </div>
                                )}

                                <div style={{ overflowY: 'auto', maxHeight: '140px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {products.map(p => (
                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                      <div>
                                        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{p.name} {p.volume}</span>
                                        <div style={{ fontSize: '10px', color: p.current_stock < 10 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                          Stock : <strong>{p.current_stock}</strong> / {p.initial_stock}
                                        </div>
                                      </div>
                                      <button 
                                        onClick={() => setAdjustingProductId(p.id)}
                                        className="btn btn-secondary" 
                                        style={{ padding: '3px 8px', fontSize: '10px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                                      >
                                        Ajuster
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                {/* Stock adjustments inline popup */}
                                {adjustingProductId && (
                                  <form onSubmit={handleAdjustStockSubmit} style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '6px' }}>
                                      Ajuster : {products.find(p => p.id === adjustingProductId)?.name}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <input 
                                        type="number" 
                                        placeholder="ex: -5 (casse)" 
                                        className="input-field" 
                                        style={{ flex: 1.2, padding: '6px', fontSize: '11px' }}
                                        value={adjustQty}
                                        onChange={(e) => setAdjustQty(e.target.value)}
                                        required
                                      />
                                      <select 
                                        className="input-field" 
                                        style={{ flex: 1.5, padding: '6px', fontSize: '11px' }}
                                        value={adjustReason}
                                        onChange={(e) => setAdjustReason(e.target.value)}
                                      >
                                        <option value="CASSE">Casse (-)</option>
                                        <option value="LIVRAISON">Ravitaillement (+)</option>
                                        <option value="PERTE">Vol / Perte (-)</option>
                                      </select>
                                      <button type="submit" className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '11px' }}>OK</button>
                                      <button type="button" onClick={() => setAdjustingProductId(null)} className="btn btn-secondary" style={{ padding: '6px', fontSize: '11px' }}>✕</button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            )}

                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                            Calypso Maquis Dashboard
                          </div>
                        </div>
                      ) :

                      // ----------------------------------------------------
                      // ROLE: SERVEUSE (WAITRESS) MOBILE VIEW (VALIDATED)
                      // ----------------------------------------------------
                      currentUser.role === 'WAITRESS' && currentUser.status === 'VALIDATED' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            
                            {/* Waitress App Tabs */}
                            {waitressTab === 'commande' && (
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                
                                {checkoutStep === 1 ? (
                                  // --- STEP 1: BEVERAGE SELECTION & CART QUANTITIES ---
                                  <>
                                    <div className="step-indicator">
                                      <div className="step-dot active" />
                                      <div className="step-dot" />
                                      <span>Étape 1/2 : Sélection boissons</span>
                                    </div>

                                    {/* Beverage catalogue list with images */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '180px', paddingRight: '4px' }}>
                                      {products.filter(p => p.is_active).map(p => (
                                        <div 
                                          key={p.id} 
                                          style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px',
                                            background: 'rgba(255,255,255,0.01)', 
                                            border: '1px solid rgba(255,255,255,0.03)',
                                            borderRadius: '8px',
                                            padding: '6px 10px'
                                          }}
                                        >
                                          {/* Cached Offline Image */}
                                          <div className="product-image-container">
                                            <img src={p.image_base64} alt={p.name} className="product-image" />
                                          </div>

                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{p.name} <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{p.volume}</span></div>
                                            <div style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 'bold' }}>{p.price} CFA</div>
                                            <div style={{ fontSize: '9px', color: p.current_stock < 10 ? 'var(--danger)' : 'var(--text-muted)' }}>Stock : {p.current_stock}</div>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {cart[p.id] ? (
                                              <>
                                                <button 
                                                  onClick={() => handleRemoveFromCart(p.id)} 
                                                  style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}
                                                >
                                                  -
                                                </button>
                                                <span style={{ fontSize: '12px', fontWeight: 'bold', width: '12px', textAlign: 'center' }}>{cart[p.id]}</span>
                                              </>
                                            ) : null}
                                            <button 
                                              onClick={() => handleAddToCart(p.id)} 
                                              disabled={p.current_stock <= 0}
                                              style={{ width: '22px', height: '22px', borderRadius: '50%', background: p.current_stock <= 0 ? 'rgba(255,255,255,0.02)' : 'var(--primary)', border: 'none', color: '#0d0d12', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Proceed to step 2 cart summary */}
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', marginTop: '10px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>
                                        <span>Sélectionné ({cartTotalQty}) :</span>
                                        <span style={{ color: 'var(--primary)' }}>{cartTotal} CFA</span>
                                      </div>
                                      <button 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                                        disabled={cartTotalQty === 0}
                                        onClick={handleProceedToPayment}
                                      >
                                        Passer à la caisse <ArrowRight size={14} />
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  // --- STEP 2: DEDICATED BILLING SCREEN (CASH OR MOMO) ---
                                  <>
                                    <div className="step-indicator">
                                      <div className="step-dot" />
                                      <div className="step-dot active" />
                                      <span>Étape 2/2 : Facturation & Règlements</span>
                                    </div>

                                    {/* Brief cart contents review */}
                                    <div style={{ flex: 1, background: '#121217', borderRadius: '8px', padding: '10px', marginBottom: '10px', overflowY: 'auto', maxHeight: '110px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                        <span>DÉTAIL COMMANDE</span>
                                        <span>TOTAL</span>
                                      </div>
                                      {Object.entries(cart).map(([id, qty]) => {
                                        const p = products.find(prod => prod.id === id);
                                        if (!p) return null;
                                        return (
                                          <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '4px 0', color: 'var(--text-secondary)' }}>
                                            <span>{qty}x {p.name} ({p.volume})</span>
                                            <span>{qty * p.price} CFA</span>
                                          </div>
                                        );
                                      })}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '6px', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-primary)' }}>
                                        <span>Total Facturé :</span>
                                        <span style={{ color: 'var(--primary)' }}>{cartTotal} CFA</span>
                                      </div>
                                    </div>

                                    {/* USSD Dynamic inputs: Client phone number */}
                                    <div className="input-group" style={{ marginBottom: '10px' }}>
                                      <label className="input-label" style={{ fontSize: '9px' }}>Numéro du client (pour Mobile Money)</label>
                                      <input 
                                        type="text" 
                                        placeholder="ex: 70112233" 
                                        className="input-field" 
                                        style={{ padding: '6px', fontSize: '12px' }}
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                      />
                                    </div>

                                    {/* Checkout operations */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                      <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '8px', fontSize: '11px' }}
                                        onClick={() => handleConfirmCheckout('CASH')}
                                      >
                                        💰 Espèces (Cash)
                                      </button>
                                      <button 
                                        className="btn btn-emerald" 
                                        style={{ padding: '8px', fontSize: '11px' }}
                                        onClick={() => handleConfirmCheckout('MOBILE_MONEY')}
                                      >
                                        📲 Mobile Money
                                      </button>
                                    </div>

                                    <button 
                                      onClick={() => setCheckoutStep(1)}
                                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', textDecoration: 'underline', marginTop: '8px', cursor: 'pointer' }}
                                    >
                                      Retour panier
                                    </button>
                                  </>
                                )}

                              </div>
                            )}

                            {waitressTab === 'pointage' && (
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                                <div>
                                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Pointage de Rotation</h4>
                                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                    Scannez le QR Code du comptoir pour pointer.
                                  </p>
                                </div>

                                <div className="qr-scanner-view" style={{ minHeight: '160px' }}>
                                  {isScanning ? (
                                    <>
                                      <div className="scanner-overlay-box">
                                        <div className="scanner-laser" />
                                      </div>
                                      <span style={{ color: 'var(--primary)', fontSize: '10px', marginTop: '8px' }}>Scan en cours...</span>
                                    </>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <QrCode size={40} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
                                      <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={handleQRScan}>
                                        Scanner QR Code
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {scanMessage && (
                                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', padding: '6px', textAlign: 'center', fontSize: '11px', marginTop: '8px', fontWeight: 'bold' }}>
                                    ✓ {scanMessage}
                                  </div>
                                )}

                                <div style={{ marginTop: '10px', maxHeight: '60px', overflowY: 'auto' }}>
                                  {attendances.filter(a => a.waitress_name === currentUser.name).map((a, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                                      <span>Check-in: {a.check_in}</span>
                                      <span>Check-out: {a.check_out || 'Actif'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {waitressTab === 'profil' && (
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                                <div className="glass-card" style={{ padding: '14px', background: 'rgba(255,255,255,0.01)', textAlign: 'left' }}>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Nom</div>
                                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>{currentUser.name}</div>
                                  
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Téléphone</div>
                                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>{currentUser.phone}</div>

                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Statut</div>
                                  <div style={{ fontWeight: 'bold', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px' }}>
                                    <CheckCircle size={12} /> Compte Validé
                                  </div>
                                </div>

                                <button 
                                  onClick={() => setLoggedInUserId(null)} 
                                  className="btn btn-secondary" 
                                  style={{ width: '100%', padding: '10px', display: 'flex', gap: '6px', justifyContent: 'center' }}
                                >
                                  <LogOut size={16} /> Déconnexion
                                </button>
                              </div>
                            )}

                          </div>

                          {/* Navigation Tabs (Serveuse Mobile) */}
                          <div className="screen-nav">
                            <button className={`screen-nav-item ${waitressTab === 'commande' ? 'active' : ''}`} onClick={() => setWaitressTab('commande')}>
                              <ShoppingBag size={16} />
                              Vendre
                            </button>
                            <button className={`screen-nav-item ${waitressTab === 'pointage' ? 'active' : ''}`} onClick={() => setWaitressTab('pointage')}>
                              <QrCode size={16} />
                              Pointage
                            </button>
                            <button className={`screen-nav-item ${waitressTab === 'profil' ? 'active' : ''}`} onClick={() => setWaitressTab('profil')}>
                              <UserCheck size={16} />
                              Mon profil
                            </button>
                          </div>
                        </div>
                      ) :

                      // ----------------------------------------------------
                      // ROLE: SERVEUSE (WAITRESS) MOBILE VIEW (PENDING/SUSPENDED)
                      // ----------------------------------------------------
                      currentUser.role === 'WAITRESS' && currentUser.status === 'PENDING' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                          <Clock size={40} style={{ color: 'var(--warning)', marginBottom: '12px', animation: 'pulse 2s infinite' }} />
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Inscription En Attente</h4>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Bienvenue, <strong>{currentUser.name}</strong>.
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Votre compte (Tél : {currentUser.phone}) est en attente de validation par le gérant.
                          </p>
                          <div className="glass-card" style={{ padding: '8px 10px', fontSize: '11px', borderColor: 'var(--warning)' }}>
                            💡 Connectez-vous avec le compte Gérant (70222222) pour valider ce profil.
                          </div>
                          <button onClick={() => setLoggedInUserId(null)} className="btn btn-secondary" style={{ marginTop: '20px', padding: '8px 16px', fontSize: '12px' }}>
                            Retour
                          </button>
                        </div>
                      ) : (
                        // Suspended waitress view
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                          <UserX size={40} style={{ color: 'var(--danger)', marginBottom: '12px' }} />
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Accès Suspendu</h4>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Votre compte a été désactivé par la direction. Votre historique est préservé mais vous ne pouvez plus utiliser l'application.
                          </p>
                          <button onClick={() => setLoggedInUserId(null)} className="btn btn-secondary" style={{ marginTop: '20px', padding: '8px 16px', fontSize: '12px' }}>
                            Déconnexion
                          </button>
                        </div>
                      )

                    )}

                  </div>

                  {/* Global Mobile Support Modal Overlay */}
                  {showMobileContactModal && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(6, 6, 8, 0.95)',
                      zIndex: 9999,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      padding: '20px',
                      textAlign: 'center'
                    }}>
                      <div className="glass-card" style={{ padding: '20px 16px', borderColor: 'var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                          <Phone size={36} style={{ color: 'var(--primary)' }} />
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontSize: '15px' }}>Contact Support</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                          Pour toute question commerciale ou assistance technique sur MaquisSync, contactez notre équipe :
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'left' }}>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Service Commercial</div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>+226 65 61 34 72</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'left' }}>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Support Technique</div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>+226 70 33 32 69</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowMobileContactModal(false)} 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '8px', fontSize: '12px' }}
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* USSD Modal Dialog Simulation */}
                {ussdCode && (
                  <div className="ussd-modal-overlay">
                    <div className="ussd-box">
                      <h4 className="ussd-title">Code USSD Généré</h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                        Faites composer ce code par le client sur son téléphone.
                      </p>
                      <div className="ussd-syntax">{ussdCode}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px', fontSize: '11px' }}
                          onClick={() => { setSelectedPaymentMethod(null); setUssdCode(null); }}
                        >
                          Annuler
                        </button>
                        <button 
                          className="btn btn-emerald" 
                          style={{ padding: '6px', fontSize: '11px' }}
                          onClick={() => finalizeSale('MOBILE_MONEY')}
                        >
                          Règlement reçu
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 5. TARIFS SECTION & FOOTER (HIDDEN IN MOBILE_POS AND SUPER_ADMIN MODES) */}
      {viewMode === 'LANDING' && (
        <>
          <section id="tarifs" className="pricing-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Des abonnements adaptés à la <span>taille de votre maquis</span></h2>
            <p className="section-subtitle">Toutes nos formules incluent 7 jours d'essai gratuit. Faites évoluer votre plan selon vos besoins.</p>
          </div>

          <div className="pricing-grid">
            <div className="glass-card">
              <div style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>7 Jours Essai Gratuit</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontFamily: 'var(--font-heading)' }}>Formule Découverte</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Idéal pour les petits maquis ou bars de quartier.</p>
              <div className="price-tag">
                9 900 FCFA
                <span style={{ textDecoration: 'line-through', fontSize: '15px', color: 'var(--text-muted)', marginLeft: '8px', marginRight: '4px', fontWeight: 'normal' }}>12 000 FCFA</span>
                <span>/ mois</span>
              </div>
              <ul className="price-features">
                <li><Check size={16} /> 1 Établissement unique</li>
                <li><Check size={16} /> 1 à 10 serveuses actives</li>
                <li><Check size={16} /> Catalogue de boissons hors-ligne</li>
                <li><Check size={16} /> Suivi des arrivées et départs</li>
                <li><Check size={16} /> Sync automatique en arrière-plan</li>
              </ul>
              <button 
                onClick={() => { setOnboardingInitialPlan('Découverte'); setShowOnboardingModal(true); }} 
                className="btn btn-secondary" 
                style={{ width: '100%', cursor: 'pointer' }}
              >
                Essayer Gratuitement
              </button>
            </div>

            <div className="glass-card" style={{ borderColor: 'var(--primary)', boxShadow: 'var(--shadow-glow)' }}>
              <div style={{ background: 'var(--primary)', color: '#FFFFFF', padding: '4px 12px', borderRadius: '50px', fontSize: '10px', fontWeight: 'bold', display: 'inline-block', marginBottom: '8px' }}>RECOMMANDÉ (7j GRATUIT)</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontFamily: 'var(--font-heading)' }}>Formule Accès</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Pour les maquis à forte affluence en rotation jour/nuit.</p>
              <div className="price-tag">
                14 900 FCFA
                <span style={{ textDecoration: 'line-through', fontSize: '15px', color: 'var(--text-muted)', marginLeft: '8px', marginRight: '4px', fontWeight: 'normal' }}>20 000 FCFA</span>
                <span>/ mois</span>
              </div>
              <ul className="price-features">
                <li><Check size={16} /> 1 Établissement</li>
                <li><Check size={16} /> 10 à 50 serveuses actives</li>
                <li><Check size={16} /> Catalogue avec images en cache</li>
                <li><Check size={16} /> Suivi des stocks & alertes</li>
                <li><Check size={16} /> Syntaxe USSD Mobile Money dynamique</li>
              </ul>
              <button 
                onClick={() => { setOnboardingInitialPlan('Accès'); setShowOnboardingModal(true); }} 
                className="btn btn-primary btn-pulse" 
                style={{ width: '100%', cursor: 'pointer' }}
              >
                Lancer l'essai de 7 jours
              </button>
            </div>

            <div className="glass-card">
              <div style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>7 Jours Essai Gratuit</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontFamily: 'var(--font-heading)' }}>Formule Premium</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Pour les propriétaires de réseaux de maquis multi-sites.</p>
              <div className="price-tag">
                19 900 FCFA
                <span style={{ textDecoration: 'line-through', fontSize: '15px', color: 'var(--text-muted)', marginLeft: '8px', marginRight: '4px', fontWeight: 'normal' }}>35 000 FCFA</span>
                <span>/ mois</span>
              </div>
              <ul className="price-features">
                <li><Check size={16} /> Multi-établissements connectés</li>
                <li><Check size={16} /> 50+ serveuses (Illimité)</li>
                <li><Check size={16} /> Dashboard propriétaire (Rentabilité)</li>
                <li><Check size={16} /> Support technique prioritaire 24/7</li>
                <li><Check size={16} /> Rapports financiers périodiques</li>
              </ul>
              <button 
                onClick={() => { setOnboardingInitialPlan('Premium'); setShowOnboardingModal(true); }} 
                className="btn btn-secondary" 
                style={{ width: '100%', cursor: 'pointer' }}
              >
                Demander un essai
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CONTACT SECTION */}
      <section id="contact" className="contact-section" style={{ padding: '80px 0', background: '#FFFFFF', borderTop: '1px solid var(--border-color)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="glass-card" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Besoin d'aide ou d'une installation ?
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Contactez-nous au <strong style={{ color: 'var(--primary)' }}>+226 65 61 34 72</strong> ou au <strong style={{ color: 'var(--secondary)' }}>70 33 32 69</strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', borderColor: 'var(--border-color)', minWidth: '260px' }}>
                <Phone size={18} style={{ color: 'var(--primary)' }} />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Service Commercial</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>+226 65 61 34 72</span>
                </div>
              </div>
              <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', borderColor: 'var(--border-color)', minWidth: '260px' }}>
                <Phone size={18} style={{ color: 'var(--secondary)' }} />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Support Technique</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>70 33 32 69</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="site-footer">
        <div className="container">
          <div className="logo footer-logo">
            <Beer size={20} />
            MAQUIS<span>SYNC</span>
          </div>
          <p>© 2026 MaquisSync. Tous droits réservés. Développé avec excellence pour les professionnels de la restauration.</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Solution Offline-First optimisée par WatermelonDB et NestJS.
          </p>
        </div>
      </footer>
    </>
  )}

      {/* MODAL ONBOARDING CLIENT & PAIEMENT WHATSAPP */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        initialPlan={onboardingInitialPlan}
        onClose={() => setShowOnboardingModal(false)}
        onActivated={({ nomMaquis, phone, plan }) => {
          setLoggedInUserId('u1');
          setViewMode('MOBILE_POS');
        }}
      />
    </div>
  );
}
