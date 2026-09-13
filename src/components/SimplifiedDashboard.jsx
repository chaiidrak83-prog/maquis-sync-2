import React from 'react';
import { DollarSign, Smartphone, ShoppingBag, Users, AlertTriangle, TrendingUp, Beer, Layers } from 'lucide-react';

export default function SimplifiedDashboard({
  sales = [],
  products = [],
  users = [],
  attendances = [],
  onSwitchToDetailed
}) {
  // Calculs financiers du jour
  const todaySales = sales; // sales déjà filtrées ou globales
  const totalRevenue = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalOrdersCount = todaySales.length;

  const cashSales = todaySales.filter(s => s.payment_method === 'CASH');
  const cashAmount = cashSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  const momoSales = todaySales.filter(s => s.payment_method === 'MOBILE_MONEY');
  const momoAmount = momoSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  const cashPercent = totalRevenue > 0 ? Math.round((cashAmount / totalRevenue) * 100) : 50;
  const momoPercent = totalRevenue > 0 ? Math.round((momoAmount / totalRevenue) * 100) : 50;

  // Calcul du Top 3 des boissons vendues
  const drinkSalesCount = {};
  todaySales.forEach(s => {
    if (s.items && s.items.length > 0) {
      s.items.forEach(it => {
        const name = it.name || it.product_name || 'Boisson';
        drinkSalesCount[name] = (drinkSalesCount[name] || 0) + (it.quantity || 1);
      });
    }
  });

  const topDrinks = Object.entries(drinkSalesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Serveuses actuellement en rotation (check_out === null)
  const activeWaitresses = attendances.filter(a => a.check_out === null);

  // Alertes stocks bas (< 10 bouteilles)
  const lowStockProducts = products.filter(p => p.current_stock < 10);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      color: '#0F172A',
      fontFamily: 'var(--font-body, system-ui, sans-serif)'
    }}>
      {/* Barre supérieure avec bouton de retour à la vue détaillée */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#FFFFFF', border: '1px solid #E2E8F0',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '8px 12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>⚡</span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary, #d9a05b)' }}>
            TABLEAU DE BORD SIMPLIFIÉ
          </span>
        </div>

        {onSwitchToDetailed && (
          <button
            type="button"
            onClick={onSwitchToDetailed}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Layers size={13} />
            <span>Vue Détaillée</span>
          </button>
        )}
      </div>

      {/* 1. Gros bloc CA DU JOUR */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 78, 59, 0.3))',
        border: '2px solid rgba(16, 185, 129, 0.4)',
        borderRadius: '18px',
        padding: '16px',
        textAlign: 'center',
        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Recette du Jour (Total Encaissé)
        </div>

        <div style={{
          fontSize: '32px',
          fontWeight: 900,
          color: '#0F172A',
          margin: '6px 0',
          letterSpacing: '0.5px',
          textShadow: '0 2px 10px rgba(16, 185, 129, 0.4)'
        }}>
          {totalRevenue.toLocaleString()} <span style={{ fontSize: '18px', color: '#10b981' }}>FCFA</span>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0,0,0,0.4)',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          color: '#e2e8f0',
          fontWeight: 600
        }}>
          <ShoppingBag size={13} style={{ color: '#10b981' }} />
          <span>{totalOrdersCount} commandes enregistrées</span>
        </div>
      </div>

      {/* 2. Jauge Visuelle Espèces vs Mobile Money */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '12px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 700,
          marginBottom: '8px'
        }}>
          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            💵 {cashPercent}% Espèces ({cashAmount.toLocaleString()} F)
          </span>
          <span style={{ color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
            📱 {momoPercent}% MoMo ({momoAmount.toLocaleString()} F)
          </span>
        </div>

        {/* Barre bicolore proportionnelle */}
        <div style={{
          height: '14px',
          width: '100%',
          background: '#FFFFFF', border: '1px solid #E2E8F0',
          borderRadius: '10px',
          overflow: 'hidden',
          display: 'flex'
        }}>
          <div style={{
            width: `${cashPercent}%`,
            background: 'linear-gradient(90deg, #10b981, #059669)',
            transition: 'width 0.4s ease'
          }} />
          <div style={{
            width: `${momoPercent}%`,
            background: 'linear-gradient(90deg, #f97316, #ea580c)',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* 3. Top 3 Boissons & Alertes Stocks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
        {/* Top Boissons */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary, #d9a05b)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Beer size={13} />
            <span>Top Boissons</span>
          </div>

          {topDrinks.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '10px 0' }}>
              En attente des premières ventes
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topDrinks.map(([name, count], i) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <span style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  </div>
                  <strong style={{ color: '#10b981', marginLeft: '4px' }}>{count} btles</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Équipe en service */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={13} />
            <span>Sur Place ({activeWaitresses.length})</span>
          </div>

          {activeWaitresses.length === 0 ? (
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '10px 0' }}>
              Aucun pointage actif
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '72px', overflowY: 'auto' }}>
              {activeWaitresses.map((a, i) => (
                <div key={i} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontWeight: 600 }}>{a.waitress_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Alerte Ruptures Imminentes (si stock < 10) */}
      {lowStockProducts.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '14px',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div style={{ fontSize: '11px', color: '#fca5a5', lineHeight: 1.3 }}>
            <strong>Stock critique : </strong>
            {lowStockProducts.map(p => `${p.name} (${p.current_stock} rest.)`).join(', ')}.
          </div>
        </div>
      )}
    </div>
  );
}
