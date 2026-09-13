import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Zap, AlertCircle, CheckCircle, Keyboard } from 'lucide-react';
import jsQR from 'jsqr';

export default function WebQrScanner({ onScan, onClose, title = "Scanner QR Code Comptoir" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (arrière) ou 'user' (avant)
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [canToggleTorch, setCanToggleTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Émission d'un bip sonore mélodieux via Web Audio API (aucun asset externe requis)
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Note La (880Hz)
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      // Audio context inaccessible ou bloqué
    }
  };

  // Vibration tactile mobile W3C
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch (e) {}
    }
  };

  // Initialisation et démarrage du flux vidéo caméra
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraError("La caméra n'est pas supportée sur ce navigateur.");
      setShowManualInput(true);
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Vérification de la capacité de la lampe torche
        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities ? track.getCapabilities() : {};
        setCanToggleTorch(Boolean(capabilities.torch));

        // Lancement de la boucle de détection
        startScanningLoop();
      }
    } catch (err) {
      console.warn("Erreur d'accès à la caméra :", err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? "Permission refusée. Autorisez l'accès à la caméra dans vos paramètres."
          : "Impossible de démarrer la caméra : " + (err.message || 'Erreur inconnue')
      );
      setShowManualInput(true);
    }
  };

  // Arrêt propre du flux vidéo
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Bascule de la torche
  const toggleTorch = async () => {
    if (!streamRef.current || !canToggleTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextTorch = !torchEnabled;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchEnabled(nextTorch);
    } catch (e) {
      console.warn("Impossible d'activer la torche :", e);
    }
  };

  // Bascule avant / arrière
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Boucle de scan multi-moteur : BarcodeDetector natif W3C en priorité, sinon jsQR
  const startScanningLoop = () => {
    let hasNativeDetector = false;
    let barcodeDetector = null;

    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        hasNativeDetector = true;
      } catch (e) {
        hasNativeDetector = false;
      }
    }

    const scanFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || isProcessing) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (videoWidth === 0 || videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      // Moteur 1 : Standard BarcodeDetector
      if (hasNativeDetector && barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              handleDetectedCode(rawValue);
              return;
            }
          }
        } catch (err) {
          // Si le moteur natif échoue temporairement, fallback sur canvas/jsQR
        }
      }

      // Moteur 2 : Fallback jsQR via Canvas offscreen
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
          const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleDetectedCode(code.data);
            return;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Traitement d'un code scanné avec succès
  const handleDetectedCode = (codeValue) => {
    setIsProcessing(true);
    stopCamera();
    playScanBeep();
    triggerHaptic();

    if (onScan) {
      onScan(codeValue);
    }
  };

  // Soumission manuelle de secours
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setIsProcessing(true);
    stopCamera();
    playScanBeep();
    triggerHaptic();

    if (onScan) {
      onScan(manualCode.trim());
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(8, 8, 12, 0.95)',
      backdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px',
      color: '#fff',
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
      boxSizing: 'border-box'
    }}>
      {/* Canvas caché pour l'analyse jsQR */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* En-tête du scanner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--secondary, #10b981)'
          }}>
            <Camera size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{title}</h4>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Pointez la caméra vers le QR Code officiel
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            stopCamera();
            if (onClose) onClose();
          }}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Zone centrale : Viseur vidéo ou Message d'erreur */}
      <div style={{
        position: 'relative',
        flex: 1,
        maxHeight: '480px',
        margin: '12px 0',
        borderRadius: '18px',
        overflow: 'hidden',
        background: '#000',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {cameraError ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            maxWidth: '320px'
          }}>
            <AlertCircle size={42} style={{ color: '#ef4444', marginBottom: '12px' }} />
            <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#fff' }}>Caméra Indisponible</h5>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, marginBottom: '16px' }}>
              {cameraError}
            </p>
            <button
              onClick={() => startCamera()}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '12px', marginRight: '8px' }}
            >
              <RefreshCw size={13} style={{ display: 'inline', marginRight: '4px' }} />
              Réessayer
            </button>
            <button
              onClick={() => setShowManualInput(true)}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              Mode Manuel
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />

            {/* Cadre de visée centré avec coins surbrillants */}
            <div style={{
              position: 'absolute',
              width: '240px',
              height: '240px',
              border: '2px solid rgba(16, 185, 129, 0.5)',
              borderRadius: '20px',
              boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.45)',
              pointerEvents: 'none',
              overflow: 'hidden'
            }}>
              {/* Ligne laser animée */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
                boxShadow: '0 0 12px #10b981',
                animation: 'scannerSweep 2.2s infinite ease-in-out'
              }} />

              {/* Coins visuels */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', borderTop: '4px solid #10b981', borderLeft: '4px solid #10b981', borderTopLeftRadius: '16px' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', borderTop: '4px solid #10b981', borderRight: '4px solid #10b981', borderTopRightRadius: '16px' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '20px', height: '20px', borderBottom: '4px solid #10b981', borderLeft: '4px solid #10b981', borderBottomLeftRadius: '16px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderBottom: '4px solid #10b981', borderRight: '4px solid #10b981', borderBottomRightRadius: '16px' }} />
            </div>

            {/* Statut de détection */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(6px)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
              {isProcessing ? 'Validation du pointage...' : 'Caméra active • Visez le QR Code'}
            </div>
          </>
        )}
      </div>

      {/* Saisie manuelle pliable (de secours si pas de caméra ou QR dégradé) */}
      {showManualInput && (
        <form onSubmit={handleManualSubmit} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '10px'
        }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
            Code de secours (ex: COMPTOIR-01 ou token établissement) :
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Code pointage..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                background: '#1e293b',
                borderColor: 'rgba(255,255,255,0.15)'
              }}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
            >
              Valider
            </button>
          </div>
        </form>
      )}

      {/* Barre d'actions basse : Torche, Rotation caméra, Saisie manuelle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 0',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        {canToggleTorch && (
          <button
            onClick={toggleTorch}
            style={{
              background: torchEnabled ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              border: torchEnabled ? '1px solid #f59e0b' : 'none',
              color: torchEnabled ? '#f59e0b' : 'rgba(255,255,255,0.8)',
              padding: '8px 14px',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            <Zap size={18} />
            <span>Lampe</span>
          </button>
        )}

        <button
          onClick={flipCamera}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.8)',
            padding: '8px 14px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={18} />
          <span>Changer</span>
        </button>

        <button
          onClick={() => setShowManualInput(!showManualInput)}
          style={{
            background: showManualInput ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            border: showManualInput ? '1px solid #10b981' : 'none',
            color: showManualInput ? '#10b981' : 'rgba(255,255,255,0.8)',
            padding: '8px 14px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          <Keyboard size={18} />
          <span>Clavier</span>
        </button>
      </div>

      <style>{`
        @keyframes scannerSweep {
          0% { top: 0%; opacity: 0.2; }
          50% { top: 96%; opacity: 1; }
          100% { top: 0%; opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
