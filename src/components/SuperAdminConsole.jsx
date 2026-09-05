import React, { useState } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Send, 
  LogOut, 
  Clock, 
  Zap,
  RefreshCw,
  Bell
} from 'lucide-react';

export default function SuperAdminConsole({ onExit, onImpersonate }) {
  const [activeTab, setActiveTab] = useState('analyses'); // 'analyses' | 'validations' | 'clients' | 'communication'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('ALL');
  const [notificationToast, setNotificationToast] = useState(null);

  // Broadcast Push State
  const [pushTitle, setPushTitle] = useState('📢 Annonce Importante MaquisSaaS');
  const [pushBody, setPushBody] = useState('Une mise à jour système est disponible avec de nouvelles options d\'encaissement USSD.');
  const [pushAudience, setPushAudience] = useState('ALL');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Accounts state
  const [accounts, setAccounts] = useState([
    {
      id: 'est-1',
      name: 'Maquis Le Diplomate',
      ownerName: 'Alassane Touré',
      phone: '76000000',
      plan: 'Accès',
      montant: 14900,
      statut_paiement: 'actif',
      last_active: 'Il y a 10 min',
      isDormant: false,
      waitressesCount: 8,
      location: 'Abidjan (Cocody)'
    },
    {
      id: 'est-2',
      name: 'Le Mirador Lounge',
      ownerName: 'Moussa Traoré',
      phone: '70112233',
      plan: 'Découverte',
      montant: 9900,
      statut_paiement: 'actif',
      last_active: 'Hier à 22h',
      isDormant: false,
      waitressesCount: 4,
      location: 'Ouagadougou (Kalgondin)'
    },
    {
      id: 'est-3',
      name: 'Restaurant Oasis Tropical',
      ownerName: 'Fatim Ouédraogo',
      phone: '78990011',
      plan: 'Premium',
      montant: 19900,
      statut_paiement: 'en_attente',
      last_active: 'Il y a 2h (Demande)',
      isDormant: false,
      waitressesCount: 0,
      location: 'Bobo-Dioulasso'
    },
    {
      id: 'est-4',
      name: 'Bar VIP La Cascade',
      ownerName: 'Jean-Marc Kouassi',
      phone: '07080910',
      plan: 'Accès',
      montant: 14900,
      statut_paiement: 'suspendu',
      last_active: 'Il y a 14 jours',
      isDormant: true,
      waitressesCount: 2,
      location: 'Yamoussoukro'
    }
  ]);

  const showToast = (msg) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // 1. Action: Validate payment
  const handleValidate = (id) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        return { ...acc, statut_paiement: 'actif' };
      }
      return acc;
    }));
    const target = accounts.find(a => a.id === id);
    showToast(`✅ Paiement validé pour "${target?.name}". Notification Push d'activation envoyée !`);
  };

  // 2. Action: Suspend account
  const handleSuspend = (id) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        return { ...acc, statut_paiement: 'suspendu' };
      }
      return acc;
    }));
    const target = accounts.find(a => a.id === id);
    showToast(`⚠️ Le compte "${target?.name}" a été suspendu.`);
  };

  // 3. Action: Reactivate account
  const handleReactivate = (id) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        return { ...acc, statut_paiement: 'actif' };
      }
      return acc;
    }));
    const target = accounts.find(a => a.id === id);
    showToast(`✅ Le compte "${target?.name}" a été réactivé avec succès.`);
  };

  // 4. Action: Change plan
  const handleChangePlan = (id, newPlan) => {
    const pricing = { 'Découverte': 9900, 'Accès': 14900, 'Premium': 19900 };
    setAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        return { ...acc, plan: newPlan, montant: pricing[newPlan] || acc.montant };
      }
      return acc;
    }));
    showToast(`Plan mis à jour vers "${newPlan}" (${pricing[newPlan]} F CFA).`);
  };

  // 5. Action: Impersonate user
  const handleImpersonate = (acc) => {
    showToast(`🚀 Prise de contrôle en cours pour "${acc.name}"...`);
    if (onImpersonate) {
      onImpersonate(acc);
    }
  };

  // 6. Action: Broadcast Push
  const handleBroadcast = () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      alert('Veuillez renseigner un titre et un message.');
      return;
    }
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      showToast(`📢 Diffusion réussie : Push envoyé aux cibles (${pushAudience}) via expo-server-sdk !`);
      setPushTitle('');
      setPushBody('');
    }, 800);
  };

  // Calculations & Analytics
  const activeAccounts = accounts.filter(a => a.statut_paiement === 'actif');
  const pendingAccounts = accounts.filter(a => a.statut_paiement === 'en_attente');
  const suspendedAccounts = accounts.filter(a => a.statut_paiement === 'suspendu');
  const dormantAccounts = accounts.filter(a => a.isDormant);

  const currentMRR = activeAccounts.reduce((sum, a) => sum + a.montant, 0);
  const totalSubscribers = accounts.length;
  const churnRate = totalSubscribers > 0 ? ((suspendedAccounts.length / totalSubscribers) * 100).toFixed(0) : '0';
  const retentionRate = (100 - parseFloat(churnRate)).toFixed(0);

  // Projections 6 mois
  const projections = [
    { month: 'Mois 1 (Actuel)', mrr: currentMRR, height: 40 },
    { month: 'Mois 2', mrr: Math.round(currentMRR * 1.35), height: 55 },
    { month: 'Mois 3', mrr: Math.round(currentMRR * 1.75), height: 70 },
    { month: 'Mois 4', mrr: Math.round(currentMRR * 2.2), height: 85 },
    { month: 'Mois 5', mrr: Math.round(currentMRR * 2.7), height: 95 },
    { month: 'Mois 6', mrr: Math.round(currentMRR * 3.3), height: 110 }
  ];

  // Filtering for clients directory
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || acc.statut_paiement === statusFilter;
    const matchesPlan = selectedPlanFilter === 'ALL' || acc.plan === selectedPlanFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* TOAST NOTIFICATION */}
      {notificationToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: '#1e293b',
          border: '1px solid #10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600
        }}>
          <Zap size={16} style={{ color: '#10b981' }} />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header style={{
        background: '#0e1526',
        borderBottom: '1px solid #1e293b',
        padding: '16px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            padding: '8px 12px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#ef4444'
          }}>
            <ShieldCheck size={20} />
            <span style={{ fontWeight: 900, fontSize: '13px', letterSpacing: '0.5px' }}>CONSOLE SUPER ADMIN</span>
          </div>
          <span style={{ color: '#64748b', fontSize: '13px' }}>|</span>
          <span style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            Session Maître : <strong>00000000</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right', marginRight: '8px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MRR ACTUEL</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#10b981' }}>{currentMRR.toLocaleString('fr-FR')} F CFA</div>
          </div>
          <button
            onClick={onExit}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} /> Retour au site public
          </button>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div style={{
        background: '#0e1526',
        borderBottom: '1px solid #1e293b',
        padding: '0 28px',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={() => setActiveTab('analyses')}
          style={{
            padding: '14px 20px',
            fontSize: '13px',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'analyses' ? '3px solid #ef4444' : '3px solid transparent',
            color: activeTab === 'analyses' ? '#f8fafc' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <TrendingUp size={16} style={{ color: activeTab === 'analyses' ? '#ef4444' : '#64748b' }} />
          1. Analyses & Finances (MRR)
        </button>

        <button
          onClick={() => setActiveTab('validations')}
          style={{
            padding: '14px 20px',
            fontSize: '13px',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'validations' ? '3px solid #ef4444' : '3px solid transparent',
            color: activeTab === 'validations' ? '#f8fafc' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle size={16} style={{ color: activeTab === 'validations' ? '#ef4444' : '#64748b' }} />
          2. Validations d'Abonnements
          {pendingAccounts.length > 0 && (
            <span style={{ background: '#ef4444', color: '#ffffff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 900 }}>
              {pendingAccounts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          style={{
            padding: '14px 20px',
            fontSize: '13px',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'clients' ? '3px solid #ef4444' : '3px solid transparent',
            color: activeTab === 'clients' ? '#f8fafc' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={16} style={{ color: activeTab === 'clients' ? '#ef4444' : '#64748b' }} />
          3. Annuaire Clients & Support (Impersonate)
        </button>

        <button
          onClick={() => setActiveTab('communication')}
          style={{
            padding: '14px 20px',
            fontSize: '13px',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'communication' ? '3px solid #ef4444' : '3px solid transparent',
            color: activeTab === 'communication' ? '#f8fafc' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Bell size={16} style={{ color: activeTab === 'communication' ? '#ef4444' : '#64748b' }} />
          4. Diffusion Notifications Push
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <main style={{ padding: '28px', maxWidth: '1380px', margin: '0 auto' }}>

        {/* TAB 1: ANALYSES & MRR */}
        {activeTab === 'analyses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Top KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Revenu Mensuel (MRR)</span>
                  <DollarSign size={18} style={{ color: '#10b981' }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#10b981' }}>{currentMRR.toLocaleString('fr-FR')} F</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Basé sur {activeAccounts.length} compte(s) actif(s)</div>
              </div>

              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Taux de Rétention</span>
                  <TrendingUp size={18} style={{ color: '#38bdf8' }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#38bdf8' }}>{retentionRate}%</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Fidélisation des maquis abonnés</div>
              </div>

              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Taux d'Attrition (Churn)</span>
                  <AlertTriangle size={18} style={{ color: churnRate > '0' ? '#ef4444' : '#10b981' }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: churnRate > '0' ? '#ef4444' : '#10b981' }}>{churnRate}%</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{suspendedAccounts.length} compte(s) suspendu(s)</div>
              </div>

              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Comptes Dormants (&gt;7j)</span>
                  <Clock size={18} style={{ color: dormantAccounts.length > 0 ? '#f59e0b' : '#94a3b8' }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: dormantAccounts.length > 0 ? '#f59e0b' : '#94a3b8' }}>
                  {dormantAccounts.length}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Sans activité d'encaissement récente</div>
              </div>
            </div>

            {/* MRR Projection Chart Card */}
            <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '18px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                    📈 Projection de Croissance MRR (6 Prochains Mois)
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    Simulation prédictive basée sur le rythme d'acquisition et de fidélisation en Afrique de l'Ouest.
                  </p>
                </div>
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                  +230% de croissance attendue
                </span>
              </div>

              {/* Bar Chart Visualization */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingTop: '20px', gap: '16px' }}>
                {projections.map((p, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>{p.mrr.toLocaleString('fr-FR')} F</span>
                    <div style={{
                      width: '100%',
                      maxWidth: '60px',
                      height: `${p.height}%`,
                      background: idx === 0 ? 'linear-gradient(180deg, #10b981, #059669)' : 'linear-gradient(180deg, #38bdf8, #0284c7)',
                      borderRadius: '8px 8px 0 0',
                      boxShadow: '0 4px 14px rgba(56, 189, 248, 0.25)',
                      transition: 'height 0.4s ease'
                    }}></div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>{p.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formula Breakdown Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>Formule Découverte (9 900 F)</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#f59e0b' }}>
                  {accounts.filter(a => a.plan === 'Découverte').length} maquis
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Idéal pour les maquis de quartier (jusqu'à 10 serveuses)</p>
              </div>

              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>Formule Accès (14 900 F) ★ Populaire</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>
                  {accounts.filter(a => a.plan === 'Accès').length} maquis
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Bars et restaurants de taille moyenne (jusqu'à 50 serveuses)</p>
              </div>

              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>Formule Premium (19 900 F)</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#a855f7' }}>
                  {accounts.filter(a => a.plan === 'Premium').length} maquis
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Grands complexes et VIP (Serveuses illimitées)</p>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: VALIDATIONS D'ABONNEMENTS */}
        {activeTab === 'validations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                  ⏳ Demandes de Validation en Attente ({pendingAccounts.length})
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Clients ayant effectué leur paiement par Mobile Money (Orange Money / Moov Money) et en attente d'activation.
                </p>
              </div>
            </div>

            {pendingAccounts.length === 0 ? (
              <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Toutes les souscriptions sont à jour !</h4>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Aucun paiement n'est en attente de vérification manuelle.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pendingAccounts.map(acc => (
                  <div key={acc.id} style={{
                    background: '#131b2e',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>{acc.name}</span>
                        <span style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>
                          EN ATTENTE DE PAIEMENT
                        </span>
                        <span style={{ background: '#1e293b', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                          Formule {acc.plan}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span>👤 Propriétaire : <strong>{acc.ownerName}</strong></span>
                        <span>📱 Téléphone : <strong>{acc.phone}</strong></span>
                        <span>📍 {acc.location}</span>
                        <span>💵 Montant attendu : <strong style={{ color: '#10b981' }}>{acc.montant.toLocaleString('fr-FR')} F CFA</strong></span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                        Token Expo prêt pour notification push instantanée : <code style={{ color: '#38bdf8' }}>ExponentPushToken[auto_registered]</code>
                      </div>
                    </div>

                    <button
                      onClick={() => handleValidate(acc.id)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '12px 24px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <CheckCircle size={16} /> Valider l'accès &amp; Envoyer Push ➔
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ANNUAIRE CLIENTS & IMPERSONATION */}
        {activeTab === 'clients' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                  👥 Annuaire des Établissements &amp; Prise de Contrôle
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Gérez les comptes clients, modifiez leurs formules ou connectez-vous directement sur leur interface sans mot de passe.
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Rechercher maquis, nom, tél..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      background: '#131b2e',
                      border: '1px solid #1e293b',
                      color: '#f8fafc',
                      padding: '8px 12px 8px 32px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      width: '240px'
                    }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    background: '#131b2e',
                    border: '1px solid #1e293b',
                    color: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="actif">Actifs</option>
                  <option value="en_attente">En attente</option>
                  <option value="suspendu">Suspendus</option>
                </select>

                <select
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  style={{
                    background: '#131b2e',
                    border: '1px solid #1e293b',
                    color: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                >
                  <option value="ALL">Toutes les formules</option>
                  <option value="Découverte">Découverte (9 900 F)</option>
                  <option value="Accès">Accès (14 900 F)</option>
                  <option value="Premium">Premium (19 900 F)</option>
                </select>
              </div>
            </div>

            {/* DataGrid Table */}
            <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#0e1526', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 20px' }}>Établissement</th>
                    <th style={{ padding: '14px 20px' }}>Propriétaire</th>
                    <th style={{ padding: '14px 20px' }}>Formule</th>
                    <th style={{ padding: '14px 20px' }}>Statut</th>
                    <th style={{ padding: '14px 20px' }}>Dernière Activité</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions Administrateur</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map(acc => (
                    <tr key={acc.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#f8fafc' }}>{acc.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{acc.location} • {acc.waitressesCount} serveuse(s)</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ color: '#cbd5e1' }}>{acc.ownerName}</div>
                        <div style={{ fontSize: '11px', color: '#38bdf8' }}>{acc.phone}</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <select
                          value={acc.plan}
                          onChange={(e) => handleChangePlan(acc.id, e.target.value)}
                          style={{
                            background: '#0e1526',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          <option value="Découverte">Découverte (9 900 F)</option>
                          <option value="Accès">Accès (14 900 F)</option>
                          <option value="Premium">Premium (19 900 F)</option>
                        </select>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {acc.statut_paiement === 'actif' && (
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                            ● Actif
                          </span>
                        )}
                        {acc.statut_paiement === 'en_attente' && (
                          <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                            ● En attente
                          </span>
                        )}
                        {acc.statut_paiement === 'suspendu' && (
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                            ● Suspendu
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', color: acc.isDormant ? '#f59e0b' : '#94a3b8', fontSize: '12px' }}>
                        {acc.last_active}
                        {acc.isDormant && (
                          <span style={{ display: 'block', color: '#f59e0b', fontSize: '10px', fontWeight: 700 }}>⚠️ Inactif &gt; 7j</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {acc.statut_paiement === 'actif' ? (
                            <button
                              onClick={() => handleSuspend(acc.id)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #ef4444',
                                color: '#ef4444',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Suspendre
                            </button>
                          ) : acc.statut_paiement === 'suspendu' ? (
                            <button
                              onClick={() => handleReactivate(acc.id)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #10b981',
                                color: '#10b981',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Réactiver
                            </button>
                          ) : (
                            <button
                              onClick={() => handleValidate(acc.id)}
                              style={{
                                background: '#10b981',
                                border: 'none',
                                color: '#ffffff',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Valider
                            </button>
                          )}

                          <button
                            onClick={() => handleImpersonate(acc)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid #ef4444',
                              color: '#ef4444',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Prendre le contrôle du compte en mode support technique"
                          >
                            <Zap size={12} /> Impersonate ➔
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: COMMUNICATION & BROADCAST PUSH */}
        {activeTab === 'communication' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            {/* Left: Push Notification Composer */}
            <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '18px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Bell size={20} style={{ color: '#ef4444' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                  Diffusion de Notification Push Globale
                </h3>
              </div>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8' }}>
                Envoyez une alerte instantanée directement sur les smartphones des gérants et propriétaires abonnés via <code>expo-server-sdk</code>.
              </p>

              {/* Quick Template Buttons */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Modèles de messages rapides :
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setPushTitle('⚡ Nouvelle Version Disponible');
                      setPushBody('Une mise à jour rapide de votre application POS est disponible. Vos stocks locaux sont synchronisés.');
                    }}
                    style={{ background: '#0e1526', border: '1px solid #334155', color: '#cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Mise à jour
                  </button>
                  <button
                    onClick={() => {
                      setPushTitle('⚠️ Maintenance Programmée');
                      setPushBody('Une maintenance des serveurs aura lieu ce soir à 03h00. Vos caisses locales continuent de fonctionner à 100% hors-ligne.');
                    }}
                    style={{ background: '#0e1526', border: '1px solid #334155', color: '#cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Maintenance nocturne
                  </button>
                  <button
                    onClick={() => {
                      setPushTitle('📊 Rapport Hebdomadaire Disponible');
                      setPushBody('Consultez votre bilan financier complet de la semaine dans votre espace Propriétaire.');
                    }}
                    style={{ background: '#0e1526', border: '1px solid #334155', color: '#cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Rapport hebdo
                  </button>
                </div>
              </div>

              {/* Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Audience Cible
                  </label>
                  <select
                    value={pushAudience}
                    onChange={(e) => setPushAudience(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0e1526',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="ALL">Tous les clients (Actifs + En attente) ({accounts.length} maquis)</option>
                    <option value="ACTIVE_ONLY">Clients Actifs Uniquement ({activeAccounts.length} maquis)</option>
                    <option value="PREMIUM_ONLY">Formule Premium Uniquement</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Titre de la Notification
                  </label>
                  <input
                    type="text"
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="Ex: 📢 Annonce Spéciale MaquisSaaS"
                    style={{
                      width: '100%',
                      background: '#0e1526',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Corps du Message (Texte Push)
                  </label>
                  <textarea
                    rows={4}
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    placeholder="Tapez le contenu du message qui s'affichera sur l'écran verrouillé des smartphones..."
                    style={{
                      width: '100%',
                      background: '#0e1526',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      resize: 'none'
                    }}
                  />
                </div>

                <button
                  onClick={handleBroadcast}
                  disabled={isBroadcasting}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '14px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                    marginTop: '8px'
                  }}
                >
                  {isBroadcasting ? (
                    <>
                      <RefreshCw size={16} className="spin" /> Diffusion en cours...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Envoyer la Notification Push Globale ➔
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Live Smartphone Screen Notification Preview */}
            <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, marginBottom: '16px' }}>
                📱 Aperçu en direct sur écran de smartphone (Lock Screen)
              </span>

              {/* Phone Mockup Frame */}
              <div style={{
                width: '300px',
                height: '460px',
                background: '#000000',
                borderRadius: '36px',
                border: '4px solid #334155',
                boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}>
                {/* Dynamic Island / Notch */}
                <div style={{ width: '90px', height: '18px', background: '#1e293b', borderRadius: '10px', margin: '0 auto 20px auto' }}></div>

                {/* Clock on Lockscreen */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '42px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-1px' }}>20:45</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Samedi 5 Septembre</div>
                </div>

                {/* The Push Notification Banner */}
                <div style={{
                  background: 'rgba(30, 41, 59, 0.85)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ background: '#ef4444', borderRadius: '4px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={10} style={{ color: '#ffffff' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#f8fafc' }}>MAQUISYNC</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>maintenant</span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
                    {pushTitle || 'Titre de la notification...'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    {pushBody || 'Corps du message push...'}
                  </div>
                </div>

                <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                  Balayez vers le haut pour déverrouiller
                </div>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
