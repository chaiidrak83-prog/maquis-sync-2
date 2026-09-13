import React, { useState, useMemo } from 'react';
import { X, Plus, Minus, Trash2, AlertTriangle, CheckCircle, ShieldAlert, DollarSign, Smartphone } from 'lucide-react';

const COMMON_REASONS = [
  'Erreur de saisie serveuse',
  'Bouteille non décapsulée retournée',
  'Changement avis client',
  'Erreur encaissement',
  'Geste offert par le gérant'
];

export default function OrderEditModal({
  order,
  products = [],
  currentUser,
  onSaveEdit,
  onCancelOrder,
  onClose
}) {
  if (!order) return null;

  // Clone des items de la commande
  const [items, setItems] = useState(() => {
    if (order.items && order.items.length > 0) {
      return order.items.map(it => ({
        productId: it.productId || it.product_id,
        name: it.name || it.product_name || products.find(p => p.id === (it.productId || it.product_id))?.name || 'Boisson',
        unitPrice: it.unitPrice || it.unit_price || 0,
        quantity: it.quantity || 1
      }));
    }
    // Si pas de détails articulés (ex: commande ancienne), créer un item générique avec le total
    return [
      {
        productId: products[0]?.id || 'p1',
        name: products[0]?.name || 'Article commande',
        unitPrice: order.total_amount,
        quantity: 1
      }
    ];
  });

  const [paymentMethod, setPaymentMethod] = useState(order.payment_method || 'CASH');
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Nouveau total calculé
  const newTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
  }, [items]);

  const totalDelta = newTotal - (order.total_amount || 0);

  // Modification quantité
  const handleQtyChange = (productId, delta) => {
    setItems(prev => {
      return prev.map(it => {
        if (it.productId === productId) {
          const nextQty = it.quantity + delta;
          return nextQty > 0 ? { ...it, quantity: nextQty } : null;
        }
        return it;
      }).filter(Boolean);
    });
  };

  // Suppression d'un article
  const handleRemoveItem = (productId) => {
    setItems(prev => prev.filter(it => it.productId !== productId));
  };

  // Ajout d'une boisson du catalogue
  const handleAddProduct = (productId) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setItems(prev => {
      const existing = prev.find(it => it.productId === productId);
      if (existing) {
        return prev.map(it => it.productId === productId ? { ...it, quantity: it.quantity + 1 } : it);
      }
      return [...prev, {
        productId: prod.id,
        name: prod.name,
        unitPrice: prod.price,
        quantity: 1
      }];
    });
  };

  const finalReason = customReason.trim() || selectedReason;

  // Validation des modifications
  const handleSave = () => {
    if (items.length === 0) {
      setErrorMsg("La commande doit contenir au moins 1 article. Utilisez 'Annuler la commande' sinon.");
      return;
    }
    if (!finalReason) {
      setErrorMsg("Veuillez spécifier le motif obligatoire de la modification.");
      return;
    }

    // Calcul des deltas de stock pour réconciliation
    // Si un produit avait qty 2 et a maintenant 1, stock change = +1 (restitué au stock)
    const stockReconciliation = {};
    const originalItemsMap = {};
    (order.items || []).forEach(it => {
      const pId = it.productId || it.product_id;
      originalItemsMap[pId] = (originalItemsMap[pId] || 0) + (it.quantity || 1);
    });

    items.forEach(it => {
      const origQty = originalItemsMap[it.productId] || 0;
      // deltaStock = origQty - newQty (positif = rendu au stock, négatif = retiré du stock)
      stockReconciliation[it.productId] = origQty - it.quantity;
      delete originalItemsMap[it.productId];
    });

    // Produits qui ont été complètement retirés
    Object.entries(originalItemsMap).forEach(([pId, origQty]) => {
      stockReconciliation[pId] = origQty; // Rendu intégralement au stock
    });

    onSaveEdit({
      orderId: order.id,
      items,
      newTotal,
      oldTotal: order.total_amount,
      paymentMethod,
      reason: finalReason,
      stockReconciliation,
      managerName: currentUser?.name || 'Gérant'
    });
  };

  // Validation annulation intégrale
  const handleConfirmCancelOrder = () => {
    if (!finalReason) {
      setErrorMsg("Veuillez obligatoirement sélectionner ou saisir le motif de l'annulation.");
      return;
    }

    // Tout le stock des articles est recrédité
    const stockReconciliation = {};
    items.forEach(it => {
      stockReconciliation[it.productId] = (stockReconciliation[it.productId] || 0) + it.quantity;
    });

    onCancelOrder({
      orderId: order.id,
      reason: finalReason,
      stockReconciliation,
      managerName: currentUser?.name || 'Gérant',
      oldTotal: order.total_amount
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 5, 8, 0.9)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      color: '#fff',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#12121a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '440px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
      }}>
        {/* En-tête */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} style={{ color: '#10b981' }} />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Édition Commande #{order.id.slice(-6)}</h4>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
              Par : <strong>{order.waitress_name}</strong> • {order.created_at}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Corps défilant */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '11px',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertTriangle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Liste des articles avec boutons + / - */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Articles de la commande ({items.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {items.map((it) => (
                <div
                  key={it.productId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '8px 10px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{it.name}</div>
                    <div style={{ fontSize: '11px', color: '#10b981' }}>{it.unitPrice} F × {it.quantity} = {it.unitPrice * it.quantity} F</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(it.productId, -1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Minus size={14} />
                    </button>

                    <span style={{ fontSize: '14px', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>
                      {it.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleQtyChange(it.productId, 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Plus size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.productId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        padding: '4px',
                        marginLeft: '4px'
                      }}
                      title="Supprimer article"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ajouter un article absent */}
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
              Ajouter une boisson oubliée :
            </div>
            <select
              className="input-field"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddProduct(e.target.value);
                  e.target.value = '';
                }
              }}
              style={{ padding: '6px 10px', fontSize: '12px', background: '#0a0a0f', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <option value="" disabled>+ Choisir une boisson du catalogue...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.volume}) - {p.price} F</option>
              ))}
            </select>
          </div>

          {/* Mode de règlement */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Mode de Règlement
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: paymentMethod === 'CASH' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                  background: paymentMethod === 'CASH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                  color: paymentMethod === 'CASH' ? '#10b981' : 'rgba(255,255,255,0.6)',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <DollarSign size={14} /> Espèces
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('MOBILE_MONEY')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: paymentMethod === 'MOBILE_MONEY' ? '2px solid #f97316' : '1px solid rgba(255,255,255,0.08)',
                  background: paymentMethod === 'MOBILE_MONEY' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.02)',
                  color: paymentMethod === 'MOBILE_MONEY' ? '#f97316' : 'rgba(255,255,255,0.6)',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Smartphone size={14} /> Mobile Money
              </button>
            </div>
          </div>

          {/* Motif OBLIGATOIRE pour la journalisation / Audit Log */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>* Motif obligatoire (Journal d'audit)</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
              {COMMON_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setSelectedReason(r); setCustomReason(''); }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: selectedReason === r && !customReason ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.06)',
                    background: selectedReason === r && !customReason ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.02)',
                    color: selectedReason === r && !customReason ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Ou précisez le motif ici..."
              className="input-field"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              style={{ fontSize: '12px', padding: '6px 10px', background: '#0a0a0f' }}
            />
          </div>

          {/* Différentiel financier */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Ancien total : {order.total_amount} F</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981' }}>Nouveau total : {newTotal} F</div>
            </div>
            {totalDelta !== 0 && (
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: totalDelta > 0 ? '#10b981' : '#ef4444',
                background: totalDelta > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                {totalDelta > 0 ? `+${totalDelta} F` : `${totalDelta} F`}
              </div>
            )}
          </div>
        </div>

        {/* Pied de page avec actions */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'rgba(255,255,255,0.01)'
        }}>
          {isConfirmingCancel ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="btn btn-danger"
                style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 800 }}
              >
                Confirmer l'annulation définitive
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingCancel(false)}
                className="btn btn-secondary"
                style={{ padding: '10px', fontSize: '12px' }}
              >
                Retour
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsConfirmingCancel(true)}
                className="btn btn-danger"
                style={{ padding: '10px 14px', fontSize: '12px', opacity: 0.85 }}
              >
                Annuler commande
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 800 }}
              >
                Enregistrer & Réconcilier Stock
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
