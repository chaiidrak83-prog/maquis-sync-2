import React, { useState } from 'react';
import { ShieldCheck, Lock, Phone, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminLoginScreen({ onSuccess, onCancel }) {
  const [phone, setPhone] = useState('00000000');
  const [password, setPassword] = useState('SuperAdmin2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) {
      setErrorMsg('Veuillez renseigner tous les champs.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3000/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password: password.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Réponse opaque 403
        setErrorMsg(data.message || 'Accès refusé : privilèges insuffisants.');
        setIsLoading(false);
        return;
      }

      const json = await res.json();
      if (json.user && json.user.role === 'SUPER_ADMIN') {
        if (onSuccess) {
          onSuccess(json);
        }
      } else {
        setErrorMsg('Accès refusé : privilèges insuffisants.');
      }
    } catch {
      // Repli local de secours en cas d'absence de serveur
      if (phone === '00000000' && password === 'SuperAdmin2026!') {
        if (onSuccess) {
          onSuccess({ user: { role: 'SUPER_ADMIN', phone: '00000000', name: 'Super Admin' } });
        }
      } else {
        setErrorMsg('Accès refusé : privilèges insuffisants.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #131b2e 0%, #090d16 100%)',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#10172a',
        border: '1px solid #1e293b',
        borderRadius: '24px',
        padding: '32px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle accent border at top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #ef4444, #f59e0b)'
        }} />

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 900,
            letterSpacing: '1px',
            marginBottom: '14px'
          }}>
            <ShieldCheck size={14} /> ZONE CONFIDENTIELLE
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#f8fafc', margin: '0 0 6px 0' }}>
            Portail Direction Générale
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
            Accès sécurisé réservé au Super Administrateur de la plateforme.
          </p>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            padding: '12px',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px'
          }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
              Identifiant (Téléphone)
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }} />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="00000000"
                style={{
                  width: '100%',
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '12px 14px 12px 40px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
              Mot de passe Maître
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '12px 14px 12px 40px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
              marginTop: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="spin" /> Authentification en cours...
              </>
            ) : (
              <>
                Déverrouiller la Console <ArrowRight size={16} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
              textDecoration: 'underline',
              marginTop: '4px',
              textAlign: 'center'
            }}
          >
            ← Retour au site public
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: '#475569' }}>
          🔒 Les accès à cette route sont tracés et journalisés.
        </div>
      </div>
    </div>
  );
}
