import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, Download, Printer, Maximize, Check, RefreshCw, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';

export default function OwnerQrGeneratorModal({
  establishmentId = 'a0000000-0000-0000-0000-000000000001',
  establishmentName = 'Maquis Le Grand Faso',
  onClose
}) {
  const [qrType, setQrType] = useState('POINTAGE'); // 'POINTAGE' | 'TABLE'
  const [tableLabel, setTableLabel] = useState('Comptoir Caisse');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tokenStamp, setTokenStamp] = useState(() => Date.now().toString(36).toUpperCase());
  const printContainerRef = useRef(null);

  // Payload dynamique du QR Code
  const qrPayload = qrType === 'POINTAGE'
    ? `MAQUIS_POINTAGE:${establishmentId}:${establishmentName.replace(/:/g, '')}:${tokenStamp}`
    : `MAQUIS_TABLE:${establishmentId}:${tableLabel.replace(/:/g, '')}:${tokenStamp}`;

  // Génération du QR Code via le package qrcode
  useEffect(() => {
    QRCode.toDataURL(qrPayload, {
      width: 480,
      margin: 2,
      color: {
        dark: '#08080c',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H'
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.warn('Erreur génération QR Code:', err));
  }, [qrPayload]);

  // Régénération d'un nouveau jeton dynamique
  const handleRegenerateToken = () => {
    setTokenStamp(Date.now().toString(36).toUpperCase());
  };

  // Téléchargement du QR Code en image PNG
  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${qrType}_${establishmentName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Impression de la fiche de comptoir
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 5, 8, 0.92)',
      backdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      color: '#0F172A',
      boxSizing: 'border-box'
    }}>
      {/* Modal Container */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '20px',
        width: '100%',
        maxWidth: isFullscreen ? '100vw' : '480px',
        maxHeight: isFullscreen ? '100vh' : '92vh',
        height: isFullscreen ? '100vh' : 'auto',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
        zIndex: 100000
      }}>
        {/* En-tête */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(217, 160, 91, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary, #d9a05b)'
            }}>
              <QrCode size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Générateur QR Code Officiel</h4>
              <span style={{ fontSize: '11px', color: '#475569' }}>
                {establishmentName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                background: isFullscreen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                color: isFullscreen ? '#10b981' : '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={isFullscreen ? "Quitter plein écran" : "Mode Borne Plein Écran"}
            >
              <Maximize size={15} />
            </button>

            <button
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: '#0F172A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div style={{
          padding: '16px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px'
        }}>
          {/* Sélecteur de type QR */}
          {!isFullscreen && (
            <div style={{
              display: 'flex',
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '4px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <button
                type="button"
                onClick={() => setQrType('POINTAGE')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: qrType === 'POINTAGE' ? 'var(--primary, #d9a05b)' : 'transparent',
                  color: qrType === 'POINTAGE' ? '#09090d' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                🏢 Pointage Équipe (Comptoir)
              </button>
              <button
                type="button"
                onClick={() => setQrType('TABLE')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: qrType === 'TABLE' ? 'var(--primary, #d9a05b)' : 'transparent',
                  color: qrType === 'TABLE' ? '#09090d' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                🏷️ QR Table / Zone
              </button>
            </div>
          )}

          {/* Si type Table, choix du nom de table */}
          {qrType === 'TABLE' && !isFullscreen && (
            <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
              <select
                className="input-field"
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', fontSize: '12px', background: '#1e293b' }}
              >
                <option value="Comptoir Caisse">Comptoir Caisse</option>
                <option value="Table 1">Table 1</option>
                <option value="Table 2">Table 2</option>
                <option value="Table 3">Table 3</option>
                <option value="Table 4">Table 4</option>
                <option value="Table 5">Table 5</option>
                <option value="VIP Salon 1">VIP Salon 1</option>
                <option value="VIP Salon 2">VIP Salon 2</option>
                <option value="Terrasse Extérieure">Terrasse Extérieure</option>
              </select>

              <button
                onClick={handleRegenerateToken}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Régénérer jeton de sécurité"
              >
                <RefreshCw size={13} />
                Nouveau Jeton
              </button>
            </div>
          )}

          {/* Affichage de la fiche imprimable / visuelle */}
          <div
            ref={printContainerRef}
            className="printable-qr-card"
            style={{
              background: '#ffffff',
              color: '#09090d',
              borderRadius: '16px',
              padding: isFullscreen ? '32px' : '20px',
              width: isFullscreen ? 'auto' : '100%',
              maxWidth: isFullscreen ? '420px' : '320px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            {/* Header imprimable */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#09090d',
              color: '#0F172A',
              padding: '6px 14px',
              borderRadius: '20px',
              marginBottom: '12px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.5px'
            }}>
              <span>⚡ MAQUISYNC</span>
              <span style={{ color: '#d9a05b' }}>OFFICIEL</span>
            </div>

            <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '2px', color: '#09090d' }}>
              {establishmentName}
            </div>

            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: qrType === 'POINTAGE' ? '#059669' : '#d97706',
              marginBottom: '14px'
            }}>
              {qrType === 'POINTAGE' ? 'POINTAGE DU SERVICE (ARRIVÉE / DÉPART)' : `COMMANDE : ${tableLabel}`}
            </div>

            {/* Image QR Code HD */}
            <div style={{
              background: '#ffffff',
              padding: '8px',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code Officiel"
                  style={{
                    width: isFullscreen ? '280px' : '210px',
                    height: isFullscreen ? '280px' : '210px',
                    display: 'block'
                  }}
                />
              ) : (
                <div style={{ width: '210px', height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Chargement...
                </div>
              )}
            </div>

            {/* Consigne d'usage */}
            <div style={{
              fontSize: '11px',
              color: '#475569',
              marginTop: '12px',
              lineHeight: 1.3,
              fontWeight: 600
            }}>
              Pointez la caméra de votre téléphone avec l'application MaquisSync pour enregistrer votre rotation.
            </div>

            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '6px' }}>
              ID: {establishmentId.slice(0, 8)} • Jeton : {tokenStamp}
            </div>
          </div>

          {/* Mode Borne info */}
          {isFullscreen && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              borderRadius: '12px',
              padding: '8px 16px',
              color: '#10b981',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Check size={16} />
              <span>Mode Borne Comptoir Actif • Les serveuses peuvent scanner cet écran à leur arrivée</span>
            </div>
          )}
        </div>

        {/* Barre d'actions d'export */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: '8px',
          background: '#F8FAFC'
        }}>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Download size={15} />
            <span>Télécharger PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Printer size={15} />
            <span>Imprimer Fiche Badge</span>
          </button>
        </div>
      </div>

      {/* Style d'impression directe */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-qr-card, .printable-qr-card * {
            visibility: visible;
          }
          .printable-qr-card {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 80% !important;
            max-width: 500px !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
