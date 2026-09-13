import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Smartphone, 
  DollarSign, 
  Beer, 
  Key, 
  Radio, 
  Settings, 
  RefreshCw,
  Copy,
  Clock
} from 'lucide-react';
import { creditsService } from '../services/creditsService';
import { gsmGatewayService } from '../services/gsmGatewayService';

export default function CreditsConsignmentsModal({
  isOpen,
  onClose,
  establishmentId,
  establishmentName = 'MaquisSync',
  currentUser,
  products = [],
  onStockDeduct = null
}) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'validate' | 'config'
  
  // Tab 1: Create State
  const [opType, setOpType] = useState('AVOIR'); // 'AVOIR' | 'CONSIGNATION'
  const [clientPhone, setClientPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);

  // Tab 2: Validate / Redeem State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(null);
  const [redemptionError, setRedemptionError] = useState('');

  // Tab 3: GSM Config State
  const [gsmConfig, setGsmConfig] = useState(gsmGatewayService.getConfig());
  const [testStatus, setTestStatus] = useState(null); // 'testing' | 'success' | 'error'

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  if (!isOpen) return null;

  // --- Handlers: Create ---
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!clientPhone) {
      alert('Veuillez saisir le numéro de téléphone du client.');
      return;
    }

    setIsSubmitting(true);
    setCreatedResult(null);

    let itemDetails = '';
    let chosenProductId = null;
    let chosenAmount = 0;

    if (opType === 'AVOIR') {
      chosenAmount = Number(amount);
      if (!chosenAmount || chosenAmount <= 0) {
        alert('Veuillez saisir un montant valide pour cet avoir.');
        setIsSubmitting(false);
        return;
      }
      itemDetails = note ? `Avoir: ${chosenAmount} CFA (${note})` : `Avoir: ${chosenAmount} CFA`;
    } else {
      const prod = products.find(p => p.id === selectedProductId);
      chosenProductId = selectedProductId;
      itemDetails = `${quantity}x ${prod ? prod.name : 'Boisson'} (${prod ? prod.volume : ''})`;
      if (note) itemDetails += ` - ${note}`;
    }

    try {
      const res = await creditsService.createCreditOrConsignment({
        establishmentId,
        userId: currentUser?.id,
        clientPhone,
        type: opType,
        productId: chosenProductId,
        quantity: opType === 'CONSIGNATION' ? quantity : 1,
        amount: chosenAmount,
        itemDetails,
        establishmentName
      });

      setCreatedResult(res);
      // Reset inputs
      setClientPhone('');
      setAmount('');
      setNote('');
      setQuantity(1);
    } catch (err) {
      alert('Erreur lors de la création: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: Search & Redeem ---
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setRedemptionError('');
    setRedemptionSuccess(null);

    try {
      const items = await creditsService.findByPhoneOrCode(establishmentId, searchQuery);
      setSearchResults(items);
      if (items.length === 0) {
        setRedemptionError('Aucun avoir ou consignation active trouvée pour cette recherche.');
      }
    } catch (err) {
      setRedemptionError('Erreur de recherche: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRedeem = async (item) => {
    setIsSubmitting(true);
    setRedemptionError('');
    setRedemptionSuccess(null);

    try {
      const res = await creditsService.redeemCreditOrConsignment({
        establishmentId,
        validationCode: item.validation_code,
        userId: currentUser?.id,
        waitressName: currentUser?.name || 'la caissière',
        establishmentName,
        onLocalStockDeduct: onStockDeduct
      });

      if (res.success) {
        setRedemptionSuccess(res);
        setSearchResults(prev => prev.filter(r => r.validation_code !== item.validation_code));
      } else {
        setRedemptionError(res.message);
      }
    } catch (err) {
      setRedemptionError('Erreur lors de la validation: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers: GSM Gateway Config ---
  const handleSaveGsmConfig = (e) => {
    e.preventDefault();
    gsmGatewayService.saveConfig(gsmConfig);
    setTestStatus('saved');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleTestGsmConnection = async () => {
    setTestStatus('testing');
    const ok = await gsmGatewayService.testConnection(gsmConfig.url, gsmConfig.apiKey);
    setTestStatus(ok ? 'success' : 'error');
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#161622',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
          color: '#FFFFFF',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Beer size={20} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                Avoirs & Consignations
              </h3>
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                SMS Gratuit via Passerelle GSM Locale (0 FCFA)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#9CA3AF',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          background: 'rgba(0, 0, 0, 0.3)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '4px'
        }}>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              background: activeTab === 'create' ? '#10B981' : 'transparent',
              color: activeTab === 'create' ? '#000000' : '#9CA3AF',
              border: 'none',
              padding: '10px 4px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <span>➕ Créer</span>
          </button>

          <button
            onClick={() => setActiveTab('validate')}
            style={{
              background: activeTab === 'validate' ? '#10B981' : 'transparent',
              color: activeTab === 'validate' ? '#000000' : '#9CA3AF',
              border: 'none',
              padding: '10px 4px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Key size={14} />
            <span>Valider / Retrait</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            style={{
              background: activeTab === 'config' ? '#10B981' : 'transparent',
              color: activeTab === 'config' ? '#000000' : '#9CA3AF',
              border: 'none',
              padding: '10px 4px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Settings size={14} />
            <span>Passerelle GSM</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* ============================================================ */}
          {/* TAB 1: CREATE CREDIT / CONSIGNMENT */}
          {/* ============================================================ */}
          {activeTab === 'create' && (
            <div>
              {createdResult ? (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center'
                }}>
                  <CheckCircle size={48} color="#10B981" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#10B981' }}>
                    {createdResult.record.type === 'AVOIR' ? 'Avoir Créé avec Succès !' : 'Consignation Enregistrée !'}
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#D1D5DB' }}>
                    {createdResult.record.item_details}
                  </p>

                  <div style={{
                    background: '#0D0D12',
                    border: '2px dashed #10B981',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      CODE PIN SECRET DU CLIENT
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 900, color: '#F97316', letterSpacing: '6px', margin: '6px 0' }}>
                      {createdResult.pinCode}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      Envoyé par SMS au <strong>{createdResult.record.client_phone}</strong>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: createdResult.smsResult.simulated ? '#F59E0B' : '#10B981',
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '8px',
                    borderRadius: '8px',
                    marginBottom: '18px'
                  }}>
                    📡 {createdResult.smsResult.message}
                  </div>

                  <button
                    onClick={() => setCreatedResult(null)}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 700 }}
                  >
                    Nouvelle opération
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateSubmit}>
                  {/* Type Selector: Avoir vs Consignation */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginBottom: '16px'
                  }}>
                    <div
                      onClick={() => setOpType('AVOIR')}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: opType === 'AVOIR' ? '2px solid #F97316' : '1px solid rgba(255,255,255,0.1)',
                        background: opType === 'AVOIR' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <DollarSign size={22} color={opType === 'AVOIR' ? '#F97316' : '#9CA3AF'} style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontWeight: 700, fontSize: '13px', color: opType === 'AVOIR' ? '#F97316' : '#FFFFFF' }}>
                        💰 Avoir
                      </div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                        Monnaie manquante
                      </div>
                    </div>

                    <div
                      onClick={() => setOpType('CONSIGNATION')}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: opType === 'CONSIGNATION' ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.1)',
                        background: opType === 'CONSIGNATION' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <Beer size={22} color={opType === 'CONSIGNATION' ? '#10B981' : '#9CA3AF'} style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontWeight: 700, fontSize: '13px', color: opType === 'CONSIGNATION' ? '#10B981' : '#FFFFFF' }}>
                        🍾 Consignation
                      </div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                        Boisson payée à récupérer
                      </div>
                    </div>
                  </div>

                  {/* Client Phone Number */}
                  <div className="input-group">
                    <label className="input-label" style={{ color: '#D1D5DB' }}>
                      Numéro de téléphone du client (SMS) *
                    </label>
                    <input
                      type="tel"
                      placeholder="ex: 70123456"
                      className="input-field"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      required
                    />
                  </div>

                  {/* Avoir Inputs */}
                  {opType === 'AVOIR' && (
                    <>
                      <div className="input-group">
                        <label className="input-label" style={{ color: '#D1D5DB' }}>
                          Montant de l'avoir (FCFA) *
                        </label>
                        <input
                          type="number"
                          placeholder="ex: 500"
                          className="input-field"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                        />
                        {/* Quick amount shortcuts */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                          {[250, 500, 1000, 2000].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setAmount(val.toString())}
                              style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#FFFFFF',
                                borderRadius: '6px',
                                padding: '6px 0',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              +{val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Consignation Inputs */}
                  {opType === 'CONSIGNATION' && (
                    <>
                      <div className="input-group">
                        <label className="input-label" style={{ color: '#D1D5DB' }}>
                          Boisson consignée *
                        </label>
                        <select
                          className="input-field"
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.volume} ({p.price} CFA)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="input-group">
                        <label className="input-label" style={{ color: '#D1D5DB' }}>
                          Quantité de bouteilles
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.08)',
                              border: 'none',
                              color: '#FFFFFF',
                              fontSize: '18px',
                              cursor: 'pointer'
                            }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '18px', fontWeight: 800, minWidth: '30px', textAlign: 'center' }}>
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(quantity + 1)}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.08)',
                              border: 'none',
                              color: '#FFFFFF',
                              fontSize: '18px',
                              cursor: 'pointer'
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Optional Note */}
                  <div className="input-group">
                    <label className="input-label" style={{ color: '#D1D5DB' }}>
                      Note / Référence (Optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="ex: Table 4, client régulier"
                      className="input-field"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '14px',
                      marginTop: '8px',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      border: 'none',
                      color: '#FFFFFF'
                    }}
                  >
                    {isSubmitting ? 'Traitement & Envoi SMS...' : '⚡ Générer Code PIN & Envoyer SMS (0 FCFA)'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: VALIDATE / REDEEM */}
          {/* ============================================================ */}
          {activeTab === 'validate' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label className="input-label" style={{ color: '#D1D5DB' }}>
                  Rechercher par Code PIN (4 chiffres) ou par Téléphone
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="ex: 4892 ou 70123456"
                    className="input-field"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="btn btn-secondary"
                    style={{ padding: '0 16px', borderRadius: '8px' }}
                  >
                    <Search size={18} />
                  </button>
                </div>
              </div>

              {/* Redemption Success Alert */}
              {redemptionSuccess && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10B981',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <CheckCircle size={22} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#10B981', fontSize: '13px' }}>
                      {redemptionSuccess.message}
                    </strong>
                    <div style={{ fontSize: '12px', color: '#D1D5DB', marginTop: '4px' }}>
                      Retrait validé : {redemptionSuccess.record.item_details}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                      SMS de confirmation envoyé au {redemptionSuccess.record.client_phone}.
                    </div>
                  </div>
                </div>
              )}

              {/* Redemption Error Alert */}
              {redemptionError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #EF4444',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#EF4444',
                  fontSize: '12px'
                }}>
                  <AlertCircle size={18} />
                  <span>{redemptionError}</span>
                </div>
              )}

              {/* Search Results List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          background: item.type === 'AVOIR' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: item.type === 'AVOIR' ? '#F97316' : '#10B981',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 800
                        }}>
                          {item.type}
                        </span>
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                          PIN : <strong style={{ color: '#FFFFFF', letterSpacing: '1px' }}>{item.validation_code}</strong>
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>
                        {item.item_details}
                      </div>

                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                        Client : {item.client_phone}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRedeem(item)}
                      disabled={isSubmitting}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: '#FFFFFF'
                      }}
                    >
                      {item.type === 'CONSIGNATION' ? '📦 Déstocker' : '✓ Utiliser'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: LOCAL GSM GATEWAY CONFIGURATION */}
          {/* ============================================================ */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveGsmConfig}>
              <div style={{
                background: 'rgba(249, 115, 22, 0.08)',
                border: '1px solid rgba(249, 115, 22, 0.25)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F97316', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                  <Smartphone size={18} />
                  <span>Passerelle GSM Locale (Coût : 0 FCFA)</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#D1D5DB', lineHeight: '1.4' }}>
                  Utilisez un smartphone Android équipé d'une carte SIM locale (Orange, Moov, Wave) avec SMS illimités. Installez une application Android gratuite (ex: <em>SMS Gateway API</em>) connectée sur le même réseau Wi-Fi.
                </p>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ color: '#D1D5DB' }}>
                  Activer la passerelle GSM locale
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="gsmEnabled"
                    checked={gsmConfig.enabled}
                    onChange={(e) => setGsmConfig({ ...gsmConfig, enabled: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#10B981' }}
                  />
                  <label htmlFor="gsmEnabled" style={{ fontSize: '13px', color: '#FFFFFF', cursor: 'pointer' }}>
                    {gsmConfig.enabled ? 'Passerelle Active' : 'Passerelle Désactivée (Mode simulation)'}
                  </label>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ color: '#D1D5DB' }}>
                  Adresse HTTP du Smartphone Android Passerelle
                </label>
                <input
                  type="url"
                  placeholder="http://192.168.1.50:8080/send"
                  className="input-field"
                  value={gsmConfig.url}
                  onChange={(e) => setGsmConfig({ ...gsmConfig, url: e.target.value })}
                  required
                />
                <span style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
                  Exemple : http://192.168.1.50:8080/send ou http://10.0.0.12:8080/send
                </span>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ color: '#D1D5DB' }}>
                  Clé d'authentification API (Optionnelle)
                </label>
                <input
                  type="password"
                  placeholder="Laisser vide si aucune"
                  className="input-field"
                  value={gsmConfig.apiKey}
                  onChange={(e) => setGsmConfig({ ...gsmConfig, apiKey: e.target.value })}
                />
              </div>

              {testStatus && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  marginBottom: '12px',
                  background: testStatus === 'success' 
                    ? 'rgba(16, 185, 129, 0.15)' 
                    : testStatus === 'saved'
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  color: testStatus === 'success' 
                    ? '#10B981' 
                    : testStatus === 'saved'
                      ? '#3B82F6'
                      : '#EF4444'
                }}>
                  {testStatus === 'testing' && '⏳ Test de connexion en cours...'}
                  {testStatus === 'success' && '✓ Smartphone passerelle joignable et prêt !'}
                  {testStatus === 'saved' && '✓ Configuration sauvegardée localement.'}
                  {testStatus === 'error' && '✕ Injoignable (Vérifiez le Wi-Fi et l\'IP du téléphone)'}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleTestGsmConnection}
                  className="btn btn-secondary"
                  style={{ padding: '10px', borderRadius: '10px', fontSize: '12px' }}
                >
                  Tester IP
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none',
                    color: '#FFFFFF'
                  }}
                >
                  Sauvegarder Configuration
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
