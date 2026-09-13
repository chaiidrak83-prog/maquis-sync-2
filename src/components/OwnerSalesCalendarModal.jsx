import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, DollarSign, Smartphone, ShoppingBag, ShieldAlert, ChevronLeft, ChevronRight, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { salesService, orderAuditService } from '../services/api';
import { isSupabaseConfigured } from '../lib/supabase';

export default function OwnerSalesCalendarModal({
  establishmentId = 'a0000000-0000-0000-0000-000000000001',
  localSales = [],
  localAuditLogs = [],
  onClose
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [daySales, setDaySales] = useState([]);
  const [dayAuditLogs, setDayAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('SUMMARY'); // 'SUMMARY' | 'ITEMS' | 'AUDIT'

  // Chargement des données pour la date sélectionnée
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadDateData = async () => {
      try {
        if (isSupabaseConfigured()) {
          const [salesData, auditData] = await Promise.all([
            salesService.getByDate(establishmentId, selectedDate),
            orderAuditService.getByDate(establishmentId, selectedDate)
          ]);
          if (isMounted) {
            setDaySales(salesData || []);
            setDayAuditLogs(auditData || []);
          }
        } else {
          // Mode hors-ligne / fallback local
          const filteredLocalSales = localSales.filter(s => {
            if (!s.created_at) return true;
            return s.created_at.startsWith(selectedDate);
          });
          const filteredLocalAudits = localAuditLogs.filter(a => {
            if (!a.created_at) return true;
            return a.created_at.startsWith(selectedDate);
          });
          if (isMounted) {
            setDaySales(filteredLocalSales);
            setDayAuditLogs(filteredLocalAudits);
          }
        }
      } catch (err) {
        console.warn('Erreur chargement ventes par date:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDateData();
    return () => { isMounted = false; };
  }, [selectedDate, establishmentId, localSales, localAuditLogs]);

  // Navigation jour précédent / suivant
  const changeDateBy = (offsetDays) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offsetDays);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Agrégats financiers et statistiques
  const metrics = useMemo(() => {
    const totalRevenue = daySales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    const orderCount = daySales.length;

    const cashSales = daySales.filter(s => s.payment_method === 'CASH');
    const momoSales = daySales.filter(s => s.payment_method === 'MOBILE_MONEY');

    const cashAmount = cashSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    const momoAmount = momoSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

    const cashPercent = totalRevenue > 0 ? Math.round((cashAmount / totalRevenue) * 100) : 0;
    const momoPercent = totalRevenue > 0 ? Math.round((momoAmount / totalRevenue) * 100) : 0;

    // Agrégation des articles vendus
    const itemsMap = {};
    daySales.forEach(s => {
      const items = s.sale_items || s.items || [];
      items.forEach(it => {
        const prod = it.products || {};
        const name = prod.name || it.name || 'Article';
        const volume = prod.volume || it.volume || '';
        const category = prod.category || it.category || 'BEER';
        const price = Number(it.unit_price || it.price || 0);
        const qty = Number(it.quantity || 1);

        const key = `${name}_${volume}`;
        if (!itemsMap[key]) {
          itemsMap[key] = {
            name,
            volume,
            category,
            unitPrice: price,
            totalQuantity: 0,
            totalRevenue: 0
          };
        }
        itemsMap[key].totalQuantity += qty;
        itemsMap[key].totalRevenue += qty * price;
      });
    });

    const itemsSoldList = Object.values(itemsMap).sort((a, b) => b.totalQuantity - a.totalQuantity);
    const totalItemsCount = itemsSoldList.reduce((sum, i) => sum + i.totalQuantity, 0);

    return {
      totalRevenue,
      orderCount,
      cashAmount,
      momoAmount,
      cashPercent,
      momoPercent,
      itemsSoldList,
      totalItemsCount
    };
  }, [daySales]);

  // Formatage de la date en français
  const formattedDateLabel = useMemo(() => {
    try {
      const d = new Date(selectedDate + 'T12:00:00');
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      color: '#0F172A',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* En-tête modal */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(249, 115, 22, 0.15)',
              color: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Historique des Ventes
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                Rapport journalier & journal d'audit
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              color: '#0F172A',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sélecteur de date & Raccourcis rapides */}
        <div style={{
          padding: '14px 18px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Navigation par flèches et Input Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => changeDateBy(-1)}
              style={{
                background: '#F1F5F9',
                border: 'none',
                color: '#0F172A',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Jour précédent"
            >
              <ChevronLeft size={20} />
            </button>

            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px solid #475569',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 700,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => changeDateBy(1)}
              style={{
                background: '#F1F5F9',
                border: 'none',
                color: '#0F172A',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Jour suivant"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Raccourcis rapides : Aujourd'hui / Hier / Avant-hier */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: "Aujourd'hui", days: 0 },
              { label: 'Hier', days: -1 },
              { label: 'Avant-hier', days: -2 }
            ].map(shortcut => {
              const target = new Date();
              target.setDate(target.getDate() + shortcut.days);
              const targetStr = target.toISOString().split('T')[0];
              const isSelected = selectedDate === targetStr;

              return (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => setSelectedDate(targetStr)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #F97316' : '1px solid #CBD5E1', background: isSelected ? '#FFF7ED' : '#FFFFFF', color: isSelected ? '#EA580C' : '#0F172A',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {shortcut.label}
                </button>
              );
            })}
          </div>

          <div style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#334155',
            textTransform: 'capitalize',
            textAlign: 'center'
          }}>
            {formattedDateLabel}
          </div>
        </div>

        {/* Navigation par onglets intérieurs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          background: '#F8FAFC'
        }}>
          {[
            { key: 'SUMMARY', label: '📊 Recettes', badge: null },
            { key: 'ITEMS', label: '🍻 Articles Vendus', badge: metrics.totalItemsCount },
            { key: 'AUDIT', label: '🛡️ Audit Gérant', badge: dayAuditLogs.length }
          ].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #f97316' : '3px solid transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge > 0 && (
                  <span style={{
                    background: tab.key === 'AUDIT' ? '#ef4444' : '#10b981',
                    color: '#0F172A',
                    fontSize: '9px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 900
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Corps principal défilant */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748B', fontSize: '13px' }}>
              Chargement des ventes du {selectedDate}...
            </div>
          ) : activeTab === 'SUMMARY' ? (
            <>
              {/* Carte Chiffre d'Affaires */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), #1e293b)',
                border: '2px solid #10b981',
                borderRadius: '18px',
                padding: '18px',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Recette Totale Encaissée
                </span>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 900,
                  color: '#0F172A',
                  margin: '6px 0',
                  letterSpacing: '0.5px'
                }}>
                  {metrics.totalRevenue.toLocaleString()} <span style={{ fontSize: '18px', color: '#10b981' }}>FCFA</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', color: '#e2e8f0', fontWeight: 700 }}>
                  <ShoppingBag size={13} style={{ color: '#10b981' }} />
                  <span>{metrics.orderCount} commandes encaissées</span>
                </div>
              </div>

              {/* Répartition Cash vs Mobile Money */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginBottom: '8px' }}>
                  <span style={{ color: '#10b981' }}>
                    💵 {metrics.cashPercent}% Espèces ({metrics.cashAmount.toLocaleString()} F)
                  </span>
                  <span style={{ color: '#f97316' }}>
                    📱 {metrics.momoPercent}% MoMo ({metrics.momoAmount.toLocaleString()} F)
                  </span>
                </div>

                <div style={{ height: '14px', width: '100%', background: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${metrics.cashPercent}%`, background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.3s ease' }} />
                  <div style={{ width: `${metrics.momoPercent}%`, background: 'linear-gradient(90deg, #f97316, #ea580c)', transition: 'width 0.3s ease' }} />
                </div>
              </div>

              {/* Résumé express des articles les plus vendus */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '14px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#f97316', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={14} />
                  <span>Top Ventes de la Journée</span>
                </div>

                {metrics.itemsSoldList.length === 0 ? (
                  <div style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', padding: '12px 0' }}>
                    Aucune vente enregistrée ce jour-là.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {metrics.itemsSoldList.slice(0, 4).map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: idx === 0 ? '#f59e0b' : '#334155',
                            color: idx === 0 ? '#000000' : '#ffffff',
                            fontWeight: 900,
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>{it.name} {it.volume && `(${it.volume})`}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ color: '#10b981', fontWeight: 800 }}>x{it.totalQuantity}</span>
                          <span style={{ color: '#64748B', fontSize: '11px' }}>{it.totalRevenue.toLocaleString()} F</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'ITEMS' ? (
            /* DÉTAIL COMPLET DES ARTICLES VENDUS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Total des unités vendues : <strong style={{ color: '#10b981' }}>{metrics.totalItemsCount}</strong>
              </div>

              {metrics.itemsSoldList.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#64748B', textAlign: 'center', padding: '30px 0' }}>
                  Aucun article vendu pour cette date.
                </div>
              ) : (
                metrics.itemsSoldList.map((it, idx) => (
                  <div key={idx} style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>
                        {it.name} <span style={{ fontSize: '11px', color: '#f97316' }}>{it.volume}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Prix unitaire : {it.unitPrice.toLocaleString()} F CFA
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#10b981' }}>
                        x{it.totalQuantity}
                      </div>
                      <div style={{ fontSize: '11px', color: '#334155', fontWeight: 700 }}>
                        {it.totalRevenue.toLocaleString()} F
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* JOURNAL D'AUDIT DU JOUR SÉLECTIONNÉ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Modifications & annulations de commandes effectuées par les gérants ce jour-là :
              </div>

              {dayAuditLogs.length === 0 ? (
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '24px',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: '12px'
                }}>
                  ✓ Aucune modification ou anomalie sur les commandes pour cette date.
                </div>
              ) : (
                dayAuditLogs.map((log) => (
                  <div key={log.id} style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderLeft: log.action === 'CANCELLED' ? '4px solid #ef4444' : '4px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontWeight: 900,
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: log.action === 'CANCELLED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: log.action === 'CANCELLED' ? '#ef4444' : '#f59e0b'
                      }}>
                        {log.action === 'CANCELLED' ? 'COMMANDE ANNULÉE' : 'COMMANDE MODIFIÉE'}
                      </span>
                      <span style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} />
                        {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 700, marginTop: '2px' }}>
                      Gérant : <strong>{log.manager_name}</strong>
                    </div>

                    <div style={{ fontSize: '11px', color: '#334155' }}>
                      Motif : <em>"{log.reason}"</em>
                    </div>

                    <div style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      marginTop: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: '#FFFFFF',
                      color: log.action === 'CANCELLED' ? '#ef4444' : '#10b981'
                    }}>
                      Montant : {log.old_total} F ➔ {log.new_total} F (Écart : {log.new_total - log.old_total} F)
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid #E2E8F0',
          background: '#F8FAFC',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              background: '#F1F5F9',
              border: 'none',
              color: '#0F172A',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
