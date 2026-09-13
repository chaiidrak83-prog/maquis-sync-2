import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, CheckCircle, Smartphone, X } from 'lucide-react';

export default function PwaInstallButton({ 
  className = '', 
  style = {}, 
  variant = 'navbar', // 'navbar' | 'hero' | 'floating'
  onLaunchApp = null 
}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (installed PWA)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true ||
      new URLSearchParams(window.location.search).get('source') === 'pwa';
    
    if (isStandalone) {
      setIsInstalled(true);
    }

    // 2. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    if (isIosDevice && isSafari && !isStandalone) {
      setIsIOS(true);
    }

    // 3. Listen for beforeinstallprompt (Android / Chromium)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 4. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('✓ MaquisSync PWA installée avec succès');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // If already installed, launch the app directly
    if (isInstalled) {
      if (onLaunchApp) {
        onLaunchApp();
      } else {
        window.location.href = '/?source=pwa#pos';
      }
      return;
    }

    // If iOS Safari, show step-by-step modal guide
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // If deferredPrompt is available (Android / Chrome)
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        if (onLaunchApp) {
          setTimeout(() => onLaunchApp(), 500);
        }
      }
      setDeferredPrompt(null);
    } else {
      // Fallback: If clicked on unsupported desktop browser or prompt not ready
      if (onLaunchApp) {
        onLaunchApp();
      } else {
        const demoSection = document.getElementById('demo');
        if (demoSection) {
          demoSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  // Variant styling
  const isHero = variant === 'hero';

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`btn ${isHero ? 'btn-primary btn-lg btn-pulse' : 'btn-secondary'} ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 700,
          borderRadius: isHero ? '12px' : '10px',
          padding: isHero ? '12px 24px' : '8px 16px',
          fontSize: isHero ? '15px' : '13px',
          background: isInstalled 
            ? 'rgba(16, 185, 129, 0.15)' 
            : isHero 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
              : 'rgba(16, 185, 129, 0.1)',
          color: isInstalled ? '#10b981' : isHero ? '#ffffff' : '#10b981',
          border: isInstalled ? '1px solid #10b981' : isHero ? 'none' : '1px solid rgba(16, 185, 129, 0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          ...style
        }}
        title={isInstalled ? "Ouvrir l'application" : "Installer l'application sur votre smartphone"}
      >
        {isInstalled ? (
          <>
            <CheckCircle size={isHero ? 18 : 15} />
            <span>Ouvrir l'application</span>
          </>
        ) : (
          <>
            <Download size={isHero ? 18 : 15} />
            <span>Installer l'application</span>
          </>
        )}
      </button>

      {/* iOS Safari Instruction Modal */}
      {showIOSModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px'
          }}
          onClick={() => setShowIOSModal(false)}
        >
          <div 
            style={{
              backgroundColor: '#1E1E28',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxWidth: '400px',
              width: '100%',
              padding: '24px',
              color: '#FFFFFF',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIOSModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#FFFFFF',
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

            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div 
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
                }}
              >
                <Smartphone size={28} color="#FFFFFF" />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800 }}>
                Installer MaquisSync sur iPhone
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#9CA3AF', lineHeight: '1.4' }}>
                Suivez ces 2 étapes simples dans Safari pour installer l'application 100% hors-ligne sur votre écran :
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255, 255, 255, 0.04)', padding: '12px 14px', borderRadius: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Share size={20} />
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                  <strong>Étape 1 :</strong> Appuyez sur le bouton <strong>Partager</strong> en bas de Safari.
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255, 255, 255, 0.04)', padding: '12px 14px', borderRadius: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PlusSquare size={20} />
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                  <strong>Étape 2 :</strong> Faites défiler et appuyez sur <strong>« Sur l'écran d'accueil »</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px'
              }}
            >
              C'est compris !
            </button>
          </div>
        </div>
      )}
    </>
  );
}
