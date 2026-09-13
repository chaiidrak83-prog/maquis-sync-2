import React, { useState } from 'react';
import { Plus, Minus, Trash2, DollarSign, Smartphone } from 'lucide-react';

// Bouteilles et illustrations vectorielles haute définition pour la caisse visuelle
const PRESET_SVGS = {
  biere_blonde: (
    <svg viewBox="0 0 100 160" width="100%" height="100%">
      <rect width="100" height="160" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
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
      <rect width="100" height="160" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
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
      <rect width="100" height="160" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
      <path d="M42 10 h16 v24 h-16 Z" fill="#451a03" />
      <rect x="40" y="34" width="20" height="24" rx="4" fill="#27150a" />
      <path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="#334155" />
      <rect x="28" y="78" width="44" height="44" rx="6" fill="#ca8a04" />
      <circle cx="50" cy="100" r="13" fill="#0f172a" />
      <path d="M45 95 Q50 90 55 95 Q50 110 45 95" fill="#eab308" />
    </svg>
  ),
  sucrerie_rouge: (
    <svg viewBox="0 0 100 160" width="100%" height="100%">
      <rect width="100" height="160" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
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
      <rect width="100" height="160" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
      <path d="M42 10 h16 v24 h-16 Z" fill="#0284c7" />
      <rect x="40" y="32" width="20" height="24" rx="4" fill="#0369a1" />
      <path d="M30 56 Q24 70 24 92 L24 138 Q24 148 36 148 L64 148 Q76 148 76 138 L76 92 Q76 70 70 56 Z" fill="#0ea5e9" />
      <rect x="28" y="80" width="44" height="38" rx="6" fill="#bae6fd" />
      <circle cx="50" cy="99" r="11" fill="#ffffff" />
      <path d="M50 92 C46 98 46 104 50 106 C54 104 54 98 50 92 Z" fill="#0284c7" />
    </svg>
  ),
  vin_liqueur: (
    <svg viewBox="0 0 100 160" width="100%" height="100%">
      <rect width="100" height="160" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
      <path d="M44 8 h12 v30 h-12 Z" fill="#831843" />
      <rect x="42" y="38" width="16" height="14" rx="2" fill="#be185d" />
      <path d="M32 52 Q26 70 26 95 L26 140 Q26 148 36 148 L64 148 Q74 148 74 140 L74 95 Q74 70 68 52 Z" fill="#9d174d" />
      <rect x="30" y="80" width="40" height="42" rx="4" fill="#fbcfe8" />
      <circle cx="50" cy="101" r="10" fill="#831843" />
    </svg>
  ),
  plat_grillade: (
    <svg viewBox="0 0 100 160" width="100%" height="100%">
      <rect width="100" height="160" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
      <ellipse cx="50" cy="95" rx="42" ry="26" fill="#ea580c" />
      <ellipse cx="50" cy="92" rx="36" ry="20" fill="#fed7aa" />
      <ellipse cx="42" cy="90" rx="18" ry="10" fill="#c2410c" />
      <circle cx="62" cy="90" r="8" fill="#16a34a" />
      <circle cx="50" cy="98" r="6" fill="#dc2626" />
      <path d="M35 50 Q50 35 65 50" stroke="#f97316" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 40 Q50 25 60 40" stroke="#fbbf24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
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
  const [activeCategory, setActiveCategory] = useState('ALL'); // 'ALL' | 'BEER' | 'SODA' | 'WINE_LIQUOR' | 'DISH' | 'WATER'

  // Retour sonore interactif doux (pop)
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
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  // Retour tactile haptique (50ms conformément aux spécifications)
  const triggerHaptic = (duration = 50) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch (e) {}
    }
  };

  // Incrémenter au toucher de la carte
  const handleAdd = (productId) => {
    playFeedbackSound('add');
    triggerHaptic(50);
    if (onAddToCart) onAddToCart(productId);
  };

  // Décrémenter via bouton '-'
  const handleRemove = (productId) => {
    playFeedbackSound('remove');
    triggerHaptic(30);
    if (onRemoveFromCart) onRemoveFromCart(productId);
  };

  // Identification visuelle et catégorisation de la boisson / plat
  const getProductVisualProps = (product) => {
    const cat = (product.category || '').toUpperCase();
    const name = (product.name || '').toLowerCase();

    // 1. Catégorie explicite si fournie
    if (cat === 'WINE_LIQUOR') {
      return {
        bg: 'linear-gradient(145deg, #1e293b, #3b0764)',
        borderColor: '#c084fc',
        accentColor: '#e9d5ff',
        svg: PRESET_SVGS.vin_liqueur,
        category: 'WINE_LIQUOR',
        picto: '🍷',
      };
    }
    if (cat === 'DISH') {
      return {
        bg: 'linear-gradient(145deg, #1e293b, #7c2d12)',
        borderColor: '#f97316',
        accentColor: '#fdba74',
        svg: PRESET_SVGS.plat_grillade,
        category: 'DISH',
        picto: '🍲',
      };
    }
    if (cat === 'WATER') {
      return {
        bg: 'linear-gradient(145deg, #1e293b, #0369a1)',
        borderColor: '#38bdf8',
        accentColor: '#bae6fd',
        svg: PRESET_SVGS.eau_bleue,
        category: 'WATER',
        picto: '💧',
      };
    }
    if (cat === 'SODA') {
      return {
        bg: 'linear-gradient(145deg, #1e293b, #991b1b)',
        borderColor: '#ef4444',
        accentColor: '#fca5a5',
        svg: PRESET_SVGS.sucrerie_rouge,
        category: 'SODA',
        picto: '🥤',
      };
    }

    // 2. Déduction intelligente par mots-clés du nom
    if (name.includes('plat') || name.includes('poulet') || name.includes('poisson') || name.includes('grill') || name.includes('attieke') || name.includes('riz')) {
      return {
        bg: 'linear-gradient(145deg, #1e293b, #7c2d12)',
        borderColor: '#f97316',
        accentColor: '#fdba74',
        svg: PRESET_SVGS.plat_grillade,
        category: 'DISH',
        picto: '🍲',
      };
    }

    if (name.includes('vin') || name.includes('liqueur') || name.includes('whisky') || name.includes('vodka') || name.includes('rhum') || name.includes('champagne')) {
      return {
        bg: 'linear-gradient(145deg, #1e293b, #3b0764)',
        borderColor: '#c084fc',
        accentColor: '#e9d5ff',
        svg: PRESET_SVGS.vin_liqueur,
        category: 'WINE_LIQUOR',
        picto: '🍷',
      };
    }

    if (name.includes('guinness') || name.includes('doppel') || name.includes('stout')) {
      return {
        bg: 'linear-gradient(145deg, #1e293b, #292524)',
        borderColor: '#facc15',
        accentColor: '#fef08a',
        svg: PRESET_SVGS.stout_dark,
        category: 'BEER',
        picto: '🖤',
      };
    }

    if (name.includes('sobebra') || name.includes('heineken') || name.includes('tuborg') || name.includes('33 export')) {
      return {
        bg: 'linear-gradient(145deg, #1e293b, #065f46)',
        borderColor: '#10b981',
        accentColor: '#a7f3d0',
        svg: PRESET_SVGS.biere_verte,
        category: 'BEER',
        picto: '🍺',
      };
    }

    if (name.includes('coca') || name.includes('fanta') || name.includes('sprite') || name.includes('youki') || name.includes('maltina') || name.includes('soda')) {
      return {
        bg: 'linear-gradient(145deg, #1e293b, #991b1b)',
        borderColor: '#ef4444',
        accentColor: '#fca5a5',
        svg: PRESET_SVGS.sucrerie_rouge,
        category: 'SODA',
        picto: '🥤',
      };
    }

    if (name.includes('eau') || name.includes('laafi') || name.includes('babali') || name.includes('tangui') || name.includes('water')) {
      return {
        bg: 'linear-gradient(145deg, #1e293b, #0369a1)',
        borderColor: '#38bdf8',
        accentColor: '#bae6fd',
        svg: PRESET_SVGS.eau_bleue,
        category: 'WATER',
        picto: '💧',
      };
    }

    // Bière blonde par défaut (Brakina, Beaufort, Castel...)
    return {
      bg: 'linear-gradient(145deg, #1e293b, #92400e)',
      borderColor: '#f59e0b',
      accentColor: '#fde68a',
      svg: PRESET_SVGS.biere_blonde,
      category: 'BEER',
      picto: '🍺',
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
      {/* 1. Filtres par Pictogrammes Géants (Mode non-alphabétisé) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '6px',
        padding: '2px 0'
      }}>
        {[
          { key: 'ALL', icon: '⚡', label: 'TOUT', color: '#10b981' },
          { key: 'BEER', icon: '🍺', label: 'BIÈRES', color: '#f59e0b' },
          { key: 'SODA', icon: '🥤', label: 'SODAS', color: '#ef4444' },
          { key: 'WINE_LIQUOR', icon: '🍷', label: 'VINS', color: '#c084fc' },
          { key: 'DISH', icon: '🍲', label: 'PLATS', color: '#f97316' },
          { key: 'WATER', icon: '💧', label: 'EAUX', color: '#38bdf8' }
        ].map(cat => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => { setActiveCategory(cat.key); triggerHaptic(30); }}
              style={{
                padding: '8px 2px',
                borderRadius: '12px',
                border: isActive ? `2px solid ${cat.color}` : '1px solid #CBD5E1',
                background: isActive ? `${cat.color}20` : '#FFFFFF',
                color: isActive ? `${cat.color}` : '#0F172A',
                fontWeight: 900,
                fontSize: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? `0 0 10px ${cat.color}40` : 'none'
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{cat.icon}</span>
              <span style={{ fontSize: '9px', fontWeight: 800 }}>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Grille Visuelle Tactile (Sans texte - Grandes Photos réelles) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        overflowY: 'auto',
        maxHeight: '300px',
        padding: '4px'
      }}>
        {filteredProducts.map((p) => {
          const qty = cart[p.id] || 0;
          const visual = getProductVisualProps(p);
          const isOutOfStock = p.current_stock <= 0;
          const imageSrc = p.image_url || p.image_base64;

          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              aria-label={`Article ${p.price} FCFA`}
              onClick={() => {
                if (!isOutOfStock) handleAdd(p.id);
              }}
              style={{
                position: 'relative',
                background: '#FFFFFF',
                border: qty > 0 ? `3px solid ${visual.borderColor}` : '2px solid #E2E8F0',
                borderRadius: '18px',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: qty > 0 ? `0 0 16px ${visual.borderColor}40` : '0 2px 8px rgba(0,0,0,0.05)',
                opacity: isOutOfStock ? 0.35 : 1,
                minHeight: '150px',
                userSelect: 'none',
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: qty > 0 ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              {/* Badge supérieur : Picto catégorie & volume visuel */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%'
              }}>
                <span style={{
                  fontSize: '14px',
                  background: '#F1F5F9',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1'
                }}>
                  {visual.picto}
                </span>

                {p.volume && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    background: '#F1F5F9',
                    color: '#0F172A',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1'
                  }}>
                    {p.volume}
                  </span>
                )}
              </div>

              {/* Grande Photo Réelle ou Illustration vectorielle HD */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '80px',
                margin: '6px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.6))'
              }}>
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt=""
                    style={{
                      maxHeight: '100%',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <div style={{ width: '56px', height: '76px' }}>
                    {visual.svg}
                  </div>
                )}

                {/* Badge Géant de Quantité sélectionnée */}
                {qty > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-4px',
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 900,
                    minWidth: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.6)',
                    border: '2px solid #ffffff',
                    animation: 'pulse 1.5s infinite'
                  }}>
                    x{qty}
                  </div>
                )}
              </div>

              {/* Prix en gros chiffres sans texte (reconnaissance visuelle immédiate) */}
              <div style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '4px'
              }}>
                <div style={{
                  fontSize: '17px',
                  fontWeight: 900,
                  color: '#0F172A',
                  background: '#F8FAFC',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  letterSpacing: '0.5px'
                }}>
                  {p.price} <span style={{ fontSize: '12px', color: '#EA580C', fontWeight: 900 }}> F</span>
                </div>

                {/* Bouton décrémenter si article dans le panier */}
                {qty > 0 && (
                  <button
                    type="button"
                    aria-label="Diminuer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(p.id);
                    }}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.25)',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Minus size={18} />
                  </button>
                )}
              </div>

              {isOutOfStock && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.85)',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  fontWeight: 900,
                  fontSize: '14px',
                  border: '2px dashed #ef4444'
                }}>
                  ÉPUISÉ ✕
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Bandeau Panier & Règlements Tactiles Instantanés */}
      <div style={{
        background: '#FFFFFF',
        border: '2px solid #E2E8F0',
        borderRadius: '18px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
      }}>
        {/* Total visuel gros format */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#ECFDF5',
              border: '1px solid #10B981',
              color: '#059669',
              padding: '4px 10px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 900
            }}>
              {cartTotalQty} {cartTotalQty > 1 ? 'articles' : 'article'}
            </span>
            {cartTotalQty > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Vider le panier"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          <div style={{
            fontSize: '22px',
            fontWeight: 900,
            color: '#10b981',
            letterSpacing: '0.5px',
            textShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
          }}>
            {cartTotal.toLocaleString()} F CFA
          </div>
        </div>

        {/* 2 Gros Boutons de Règlements Tactiles (Cash / MoMo) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            onClick={onCheckoutCash}
            disabled={cartTotalQty === 0}
            style={{
              padding: '14px 8px',
              borderRadius: '14px',
              border: 'none',
              background: cartTotalQty === 0 ? '#E2E8F0' : 'linear-gradient(135deg, #10B981, #059669)',
              color: cartTotalQty === 0 ? '#94A3B8' : '#FFFFFF',
              fontWeight: 900,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: cartTotalQty === 0 ? 'not-allowed' : 'pointer',
              boxShadow: cartTotalQty > 0 ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none'
            }}
          >
            <DollarSign size={18} />
            <span>💵 ESPÈCES</span>
          </button>

          <button
            type="button"
            onClick={onCheckoutMoMo}
            disabled={cartTotalQty === 0}
            style={{
              padding: '14px 8px',
              borderRadius: '14px',
              border: 'none',
              background: cartTotalQty === 0 ? '#E2E8F0' : 'linear-gradient(135deg, #F97316, #EA580C)',
              color: cartTotalQty === 0 ? '#94A3B8' : '#FFFFFF',
              fontWeight: 900,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: cartTotalQty === 0 ? 'not-allowed' : 'pointer',
              boxShadow: cartTotalQty > 0 ? '0 4px 14px rgba(249, 115, 22, 0.4)' : 'none'
            }}
          >
            <Smartphone size={18} />
            <span>📱 MOBILE MONEY</span>
          </button>
        </div>
      </div>
    </div>
  );
}
