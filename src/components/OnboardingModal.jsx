import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Shield, Phone, ArrowRight, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';

const PLANS = [
  {
    id: 'Découverte',
    name: 'Formule Découverte',
    montant: 9900,
    desc: 'Petits maquis & buvettes (1 à 10 serveuses)',
    badge: 'Idéal Débutants',
  },
  {
    id: 'Accès',
    name: 'Formule Accès',
    montant: 14900,
    desc: 'Établissements en plein essor (11 à 25 serveuses)',
    badge: 'Plus Populaire',
    popular: true,
  },
  {
    id: 'Premium',
    name: 'Formule Premium',
    montant: 19900,
    desc: 'Grands complexes & multi-sites (Serveuses illimitées)',
    badge: 'Tout Inclus',
  },
];

export default function OnboardingModal({ isOpen, onClose, onActivated, initialPlan = 'Accès' }) {
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [nomMaquis, setNomMaquis] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Post-submission state
  const [step, setStep] = useState('FORM'); // 'FORM' | 'WAITING' | 'ACTIVE'
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (initialPlan) {
      setSelectedPlan(initialPlan);
    }
  }, [initialPlan]);

  // Polling automatique toutes les 4s quand on est en mode 'WAITING'
  useEffect(() => {
    if (step === 'WAITING' && subscriptionId) {
      const checkStatus = async () => {
        try {
          setIsPolling(true);
          const res = await fetch(`http://localhost:3000/subscriptions/status/${subscriptionId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.statut_paiement === 'actif') {
              setStep('ACTIVE');
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            }
          }
        } catch (e) {
          // Mode simulation local si backend hors-ligne
        } finally {
          setIsPolling(false);
        }
      };

      checkStatus();
      pollIntervalRef.current = setInterval(checkStatus, 4000);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [step, subscriptionId]);

  if (!isOpen) return null;

  const currentPlan = PLANS.find(p => p.id === selectedPlan) || PLANS[1];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nomMaquis.trim() || !phone.trim() || !password.trim()) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom_maquis: nomMaquis.trim(),
          phone: phone.trim(),
          password: password.trim(),
          plan: selectedPlan,
          montant: currentPlan.montant,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubscriptionId(data.subscription?.id || `sub_${Date.now()}`);
        setStep('WAITING');
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.message || 'Erreur lors de la création du compte.');
      }
    } catch (err) {
      // Fallback local pour démo si backend en cours de redémarrage
      setSubscriptionId(`sub_demo_${Date.now()}`);
      setStep('WAITING');
    } finally {
      setIsLoading(false);
    }
  };

  // Message WhatsApp au format exact demandé
  const whatsappMessage = `Bonjour, voici mon paiement Orange Money pour le maquis ${nomMaquis || 'Mon Maquis'} (Tél: ${phone || 'Non renseigné'}) pour la Formule ${selectedPlan}.`;
  const whatsappUrl = `https://wa.me/22665613472?text=${encodeURIComponent(whatsappMessage)}`;

  const handleManualRefresh = async () => {
    if (!subscriptionId) return;
    setIsPolling(true);
    try {
      const res = await fetch(`http://localhost:3000/subscriptions/status/${subscriptionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.statut_paiement === 'actif') {
          setStep('ACTIVE');
          return;
        }
      }
    } catch (e) {}
    setTimeout(() => setIsPolling(false), 600);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div style={{
        background: '#131b2e',
        border: '1px solid #1e293b',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        padding: '32px',
        color: '#f8fafc',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: '#94a3b8',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        {step === 'FORM' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                padding: '4px 12px',
                borderRadius: '50px',
                fontSize: '11px',
                fontWeight: 800,
                marginBottom: '10px',
              }}>
                <Sparkles size={14} /> ESSAI GRATUIT 7 JOURS INCLUS
              </div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontFamily: 'var(--font-heading)', color: '#ffffff' }}>
                Inscription Établissement
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Remplissez les 3 champs ci-dessous pour créer votre compte maquis.
              </p>
            </div>

            {/* Plan selection pills */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                Sélectionnez votre formule d'abonnement :
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      style={{
                        background: isSelected ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
                        border: `2px solid ${isSelected ? '#10b981' : '#334155'}`,
                        borderRadius: '14px',
                        padding: '12px 8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        position: 'relative',
                      }}
                    >
                      {plan.popular && (
                        <div style={{
                          position: 'absolute',
                          top: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#f59e0b',
                          color: '#090d16',
                          fontSize: '8px',
                          fontWeight: 900,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          whiteSpace: 'nowrap',
                        }}>
                          POPULAIRE
                        </div>
                      )}
                      <div style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#10b981' : '#ffffff' }}>
                        {plan.id}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc', marginTop: '4px' }}>
                        {plan.montant.toLocaleString('fr-FR')} F
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>/ mois</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {errorMessage && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '10px',
                borderRadius: '10px',
                fontSize: '12px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  1. Nom du maquis / bar <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Maquis Le Régal, Bar La Paillote..."
                  value={nomMaquis}
                  onChange={(e) => setNomMaquis(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#090d16',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  2. Numéro de téléphone (Identifiant) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: 76000000 ou 70123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#090d16',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  3. Mot de passe de connexion <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  placeholder="Minimum 4 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#090d16',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontWeight: 800,
                  fontSize: '15px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                }}
              >
                {isLoading ? 'Enregistrement en cours...' : 'Créer mon maquis & Passer au paiement ➔'}
              </button>
            </form>
          </>
        )}

        {step === 'WAITING' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '2px solid #f59e0b',
              margin: '0 auto 20px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            }}>
              ⏳
            </div>

            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontFamily: 'var(--font-heading)', color: '#ffffff' }}>
              Paiement en cours de vérification
            </h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
              Votre demande a bien été enregistrée avec le statut <strong style={{ color: '#f59e0b' }}>en_attente</strong>. Transmettez votre confirmation Orange Money sur WhatsApp pour débloquer votre accès.
            </p>

            {/* Recap Card */}
            <div style={{
              background: '#090d16',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Établissement :</span>
                <strong style={{ color: '#f8fafc' }}>{nomMaquis}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Téléphone :</span>
                <strong style={{ color: '#f8fafc' }}>{phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Formule choisie :</span>
                <strong style={{ color: '#10b981' }}>Formule {selectedPlan} ({currentPlan.montant.toLocaleString('fr-FR')} F CFA)</strong>
              </div>
            </div>

            {/* WhatsApp action button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: '#25D366',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '14px 20px',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '15px',
                marginBottom: '16px',
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)',
              }}
            >
              Envoyer la confirmation sur WhatsApp <ExternalLink size={16} />
            </a>

            {/* Polling Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#94a3b8',
              fontSize: '12px',
              marginBottom: '16px',
            }}>
              <RefreshCw size={14} className={isPolling ? 'spin' : ''} style={{ animation: isPolling ? 'spin 1.5s linear infinite' : 'none' }} />
              Vérification automatique active toutes les 4s...
            </div>

            <button
              onClick={handleManualRefresh}
              style={{
                background: 'transparent',
                border: '1px solid #334155',
                color: '#cbd5e1',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Actualiser le statut manuellement
            </button>
          </div>
        )}

        {step === 'ACTIVE' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid #10b981',
              margin: '0 auto 20px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
            }}>
              🎉
            </div>

            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontFamily: 'var(--font-heading)', color: '#10b981' }}>
              Abonnement Activé !
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5' }}>
              Votre paiement pour le maquis <strong>{nomMaquis}</strong> a été validé par l'administrateur. Toutes les fonctionnalités de la Formule {selectedPlan} sont prêtes.
            </p>

            <button
              onClick={() => {
                onClose();
                if (onActivated) {
                  onActivated({ nomMaquis, phone, plan: selectedPlan });
                }
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '16px',
                fontWeight: 900,
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
              }}
            >
              Accéder à l'application ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
