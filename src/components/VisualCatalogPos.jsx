import React, { useState } from 'react';
import { Plus, Minus, Trash2, Check, ArrowRight, DollarSign, Smartphone } from 'lucide-react';

// Bouteilles vectorielles haute définition pour la caisse visuelle
const BOTTLE_SVG_PRESETS = {
  biere_blonde: (
    <svg viewBox="0 0 100 160" width="100%" height="100%">
      <rect width="100" height="160" rx="16" fill="#1f1408" />
      <path d="M42 10 h16 v24 h-16 Z" fill="#d97706" />
      <rect x="40" y="34" width="20" height="24" rx="4" fill="#b45309" />
      <path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="#f59e0b" />
      <rect x="28" y="80" width="44" height="40" rx="6" fill="#d97706" />
      <circle cx="50" cy="100" r="12" fill="#fef3c7" />
      <path d="M47 92 l6 8 l-6 8" stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  ),
  biere_verte: (
    <svg viewBox="0 0 100 160" width="100%" height="100%">
      <rect width="100" height="160" rx="16" fill="#0b1a13" />
      <path d="M42 10 h16 v24 h-16 Z" fill="#059669" />
      <rect x="40" y="34" width="20" height="24" rx="4" fill="#047857" />
      <path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="#10b981" />
      <rect x="28" y="80" width="44" height="40" rx="6" fill="#047857" />
      <circle cx="50" cy="100" r="12" fill="#d1fae5" />
      <path d="M44 100 h12 M50 94 v12" stroke="#064e3b" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  stout_dark: (
    <svg viewBox="0 0 100 160" width="100%" height="100%">
      <rect width="100" height="160" rx="16" fill="#141110" />
      <path d="M42 10 h16 v24 h-16 Z" fill="#451a03" />
      <rect x="40" y="34" width="20" height="24" rx="4" fill="#27150a" />
      <path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="#292524" />
      <rect x="28" y="78" width="44" height="44" rx="6" fill="#ca8a04" />
      <circle cx="50" cy="100" r="13" fill="#000000" />
      <path d="M45 95 Q50 90 55 95 Q50 110 45 95" fill="#eab308" />
    </svg>
  ),
  sucrerie_rouge: (
    <svg viewBox="0 0 100 160" width="100%" height="100%">
      <rect width="100" height="160" rx="16" fill="#210a0d" />
      <path d="M42 10 h16 v24 h-16 Z" fill="#dc2626" />
      <rect x="40" y="34" width="20" height="24" rx="4" fill="#991b1b" />
      <path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="#ef4444" />
      <rect x="28" y="80" width="44" height="40" rx="6" fill="#b91c1c" />
      <circle cx="50" cy="100" r="12" fill="#fee2e2" />
      <path d="M44 104 Q50 94 56 104" stroke="#991b1b" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  ),
  eau_bleue: (
    <svg viewBox="0 0 100 160" width="100%" height="100%">
      <rect width="100" height="160" rx="16" fill="#081624" />
      <path d="M42 10 h16 v24 h-16 Z" fill="#0284c7" />
      <rect x="40" y="32" width="20" height="24" rx="4" fill="#0369a1" />
      <path d="M30 56 Q24 70 24 92 L24 138 Q24 148 36 148 L64 148 Q76 148 76 138 L76 92 Q76 70 70 56 Z" fill="#0ea5e9" />
      <rect x="28" y="80" width="44" height="38" rx="6" fill="#bae6fd" />
      <circle cx="50" cy="99" r="11" fill="#ffffff" />
      <path d="M50 92 C46 98 46 104 50 106 C54 104 54 98 50 92 Z" fill="#0284c7" />
    </svg>
  ),
};

export default function VisualCatalogPos({
  products = [],
  cart = {},
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  onCheckoutCash,
  onCheckoutMoMo,
  cartTotal = 0,
  cartTotalQty = 0
}) {
  const [activeCategory, setActiveCategory] = useState('ALL'); // 'ALL' | 'BEER' | 'SODA' | 'WATER'

  // Retour sonore interactif (pop / click)
  const playFeedbackSound = (type = 'add') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const freq = type === 'add' ? 580 : 380;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  // Retour haptique
  const triggerHaptic = (intensity = 20) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(intensity);
      } catch (e) {}
    }
  };

  const handleAdd = (productId) => {
    playFeedbackSound('add');
    triggerHaptic(25);
    if (onAddToCart) onAddToCart(productId);
  };

  const handleRemove = (productId) => {
    playFeedbackSound('remove');
    triggerHaptic(15);
    if (onRemoveFromCart) onRemoveFromCart(productId);
  };

  // Identification visuelle de la boisson
  const getProductVisualProps = (product) => {
    const name = (product.name || '').toLowerCase();
    const volume = (product.volume || '').toLowerCase();

    if (name.includes('guinness') || name.includes('doppel') || name.includes('stout')) {
      return {
        bg: 'linear-gradient(145deg, #1c1917, #292524)',
        borderColor: '#ca8a04',
        accentColor: '#facc15',
        svg: BOTTLE_SVG_PRESETS.stout_dark,
        category: 'BEER',
        badge: '🖤 Forte',
      };
    }

    if (name.includes('sobebra') || name.includes('heineken') || name.includes('tuborg') || name.includes('33 export')) {
      return {
        bg: 'linear-gradient(145deg, #064e3b, #047857)',
        borderColor: '#10b981',
        accentColor: '#34d399',
        svg: BOTTLE_SVG_PRESETS.biere_verte,
        category: 'BEER',
        badge: '🍺 Verte',
      };
    }

    if (name.includes('coca') || name.includes('fanta') || name.includes('sprite') || name.includes('youki') || name.includes('maltina')) {
      return {
        bg: 'linear-gradient(145deg, #7f1d1d, #b91c1c)',
        borderColor: '#ef4444',
        accentColor: '#f87171',
        svg: BOTTLE_SVG_PRESETS.sucrerie_rouge,
        category: 'SODA',
        badge: '🥤 Sucré',
      };
    }

    if (name.includes('eau') || name.includes('laafi') || name.includes('babali') || name.includes('tangui')) {
      return {
        bg: 'linear-gradient(145deg, #0c4a6e, #0284c7)',
        borderColor: '#38bdf8',
        accentColor: '#7dd3fc',
        svg: BOTTLE_SVG_PRESETS.eau_bleue,
        category: 'WATER',
        badge: '💧 Eau',
      };
    }

    // Bière blonde par défaut (Brakina, Beaufort...)
    return {
      bg: 'linear-gradient(145deg, #78350f, #b45309)',
      borderColor: '#f59e0b',
      accentColor: '#fbbf24',
      svg: BOTTLE_SVG_PRESETS.biere_blonde,
      category: 'BEER',
      badge: '🍺 Blonde',
    };
  };

  const filteredProducts = products.filter((p) => {
    if (!p.is_active) return false;
    if (activeCategory === 'ALL') return true;
    const visual = getProductVisualProps(p);
    return visual.category === activeCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
      {/* 1. Filtres par pictogrammes géants pour serveurs non alphabétisés */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '6px',
        padding: '2px 0'
      }}>
        <button
          type="button"
          onClick={() => { setActiveCategory('ALL'); triggerHaptic(15); }}
          style={{
            padding: '8px 4px',
            borderRadius: '12px',
            border: activeCategory === 'ALL' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
            background: activeCategory === 'ALL' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.02)',
            color: activeCategory === 'ALL' ? '#10b981' : '#94a3b8',
            fontWeight: 800,
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '16px' }}>⚡</span>
          <span>TOUT</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveCategory('BEER'); triggerHaptic(15); }}
          style={{
            padding: '8px 4px',
            borderRadius: '12px',
            border: activeCategory === 'BEER' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
            background: activeCategory === 'BEER' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.02)',
            color: activeCategory === 'BEER' ? '#f59e0b' : '#94a3b8',
            fontWeight: 800,
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '16px' }}>🍺</span>
          <span>BIÈRES</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveCategory('SODA'); triggerHaptic(15); }}
          style={{
            padding: '8px 4px',
            borderRadius: '12px',
            border: activeCategory === 'SODA' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
            background: activeCategory === 'SODA' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.02)',
            color: activeCategory === 'SODA' ? '#ef4444' : '#94a3b8',
            fontWeight: 800,
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '16px' }}>🥤</span>
          <span>SODAS</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveCategory('WATER'); triggerHaptic(15); }}
          style={{
            padding: '8px 4px',
            borderRadius: '12px',
            border: activeCategory === 'WATER' ? '2px solid #0ea5e9' : '1px solid rgba(255,255,255,0.08)',
            background: activeCategory === 'WATER' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255,255,255,0.02)',
            color: activeCategory === 'WATER' ? '#0ea5e9' : '#94a3b8',
            fontWeight: 800,
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '16px' }}>💧</span>
          <span>EAUX</span>
        </button>
      </div>

      {/* 2. Grille Visuelle Tactile (Cartes larges Touch Target >= 60px) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px',
        overflowY: 'auto',
        maxHeight: '260px',
        paddingRight: '4px'
      }}>
        {filteredProducts.map((p) => {
          const qty = cart[p.id] || 0;
          const visual = getProductVisualProps(p);
          const isOutOfStock = p.current_stock <= 0;

          return (
            <div
              key={p.id}
              style={{
                position: 'relative',
                background: visual.bg,
                border: qty > 0 ? `3px solid ${visual.borderColor}` : '1px solid rgba(255,255,255,0.12)',
                borderRadius: '16px',
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: qty > 0 ? `0 0 14px ${visual.borderColor}55` : '0 4px 8px rgba(0,0,0,0.3)',
                opacity: isOutOfStock ? 0.45 : 1,
                minHeight: '130px',
                userSelect: 'none',
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => {
                if (!isOutOfStock && qty === 0) handleAdd(p.id);
              }}
            >
              {/* Badge type boisson en haut */}
              <div style={{
                alignSelf: 'flex-start',
                fontSize: '10px',
                fontWeight: 800,
                background: 'rgba(0,0,0,0.55)',
                color: visual.accentColor,
                padding: '2px 6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                {visual.badge}
              </div>

              {/* Bouteille centrale vectorielle HD */}
              <div style={{
                width: '46px',
                height: '62px',
                margin: '2px 0',
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
              }}>
                {p.image_base64 && p.image_base64.startsWith('data:image') ? (
                  <img src={p.image_base64} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  visual.svg
                )}
              </div>

              {/* Nom & Volume (Très lisible) */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: '#ffffff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {p.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#fbbf24',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: '6px',
                  padding: '1px 6px',
                  marginTop: '2px',
                  display: 'inline-block'
                }}>
                  {p.price} F <span style={{ fontSize: '9px', color: '#cbd5e1' }}>({p.volume})</span>
                </div>
              </div>

              {/* Boutons de contrôle géants (+ / -) */}
              {qty > 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginTop: '6px',
                  background: 'rgba(0,0,0,0.65)',
                  borderRadius: '12px',
                  padding: '2px 4px'
                }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(p.id);
                    }}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.25)',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    <Minus size={16} />
                  </button>

                  <span style={{
                    fontSize: '18px',
                    fontWeight: 900,
                    color: '#ffffff',
                    minWidth: '24px',
                    textAlign: 'center'
                  }}>
                    {qty}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd(p.id);
                    }}
                    disabled={p.current_stock <= qty}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: '#10b981',
                      border: 'none',
                      color: '#09261a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isOutOfStock) handleAdd(p.id);
                  }}
                  disabled={isOutOfStock}
                  style={{
                    width: '100%',
                    height: '38px',
                    marginTop: '6px',
                    borderRadius: '10px',
                    background: isOutOfStock ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: isOutOfStock ? 'rgba(255,255,255,0.3)' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Plus size={16} />
                  <span>AJOUTER</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Bandeau Panier & Règlements 1-Tap ultra-visuel */}
      <div style={{
        background: 'linear-gradient(180deg, #121218, #0a0a0e)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Total visuel gros format */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              padding: '3px 8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800
            }}>
              {cartTotalQty} {cartTotalQty > 1 ? 'bouteilles' : 'bouteille'}
            </span>
            {cartTotalQty > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                title="Vider"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          <div style={{
            fontSize: '18px',
            fontWeight: 900,
            color: '#10b981',
            letterSpacing: '0.5px'
          }}>
            {cartTotal.toLocaleString()} F CFA
          </div>
        </div>

        {/* 2 Gros Boutons de Règlements Rapides (Cash / MoMo) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={onCheckoutCash}
            disabled={cartTotalQty === 0}
            style={{
              padding: '12px 6px',
              borderRadius: '12px',
              border: 'none',
              background: cartTotalQty === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #10b981, #059669)',
              color: cartTotalQty === 0 ? 'rgba(255,255,255,0.2)' : '#ffffff',
              fontWeight: 900,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: cartTotalQty === 0 ? 'not-allowed' : 'pointer',
              boxShadow: cartTotalQty > 0 ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none'
            }}
          >
            <DollarSign size={16} />
            <span>💵 ESPÈCES</span>
          </button>

          <button
            type="button"
            onClick={onCheckoutMoMo}
            disabled={cartTotalQty === 0}
            style={{
              padding: '12px 6px',
              borderRadius: '12px',
              border: 'none',
              background: cartTotalQty === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #f97316, #ea580c)',
              color: cartTotalQty === 0 ? 'rgba(255,255,255,0.2)' : '#ffffff',
              fontWeight: 900,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: cartTotalQty === 0 ? 'not-allowed' : 'pointer',
              boxShadow: cartTotalQty > 0 ? '0 4px 12px rgba(249, 115, 22, 0.35)' : 'none'
            }}
          >
            <Smartphone size={16} />
            <span>📱 MOBILE MONEY</span>
          </button>
        </div>
      </div>
    </div>
  );
}
