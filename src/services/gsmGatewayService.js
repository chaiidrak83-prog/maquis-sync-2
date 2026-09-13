/**
 * Service Passerelle SMS GSM Locale (0 FCFA)
 * Permet d'envoyer des SMS réels sans abonnement API tiers en utilisant
 * un smartphone Android local équipé d'un forfait SIM SMS illimité.
 */

const STORAGE_KEY = 'maquissync_gsm_gateway_config';

const DEFAULT_CONFIG = {
  enabled: true,
  url: 'http://192.168.1.50:8080/send',
  apiKey: '',
  timeoutMs: 4000
};

export const gsmGatewayService = {
  /**
   * Récupère la configuration locale de la passerelle
   */
  getConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  },

  /**
   * Sauvegarde la configuration
   */
  saveConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (err) {
      console.warn('Erreur sauvegarde config passerelle GSM:', err);
      return false;
    }
  },

  /**
   * Envoi d'un SMS via la passerelle Android locale
   * @param {string} phoneNumber - Numéro de téléphone du destinataire
   * @param {string} message - Texte du SMS
   * @returns {Promise<{success: boolean, simulated: boolean, message: string, details?: any}>}
   */
  async sendSms(phoneNumber, message) {
    const config = this.getConfig();
    const cleanPhone = (phoneNumber || '').replace(/\s+/g, '');

    console.log(`📡 [Passerelle GSM] Tentative d'envoi vers ${cleanPhone} : "${message}"`);

    // Si passerelle désactivée ou URL vide -> mode simulation immédiat
    if (!config.enabled || !config.url) {
      return this._simulateFallback(cleanPhone, message, 'Passerelle désactivée manuellement');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 4000);

      // Supporte les charges utiles courantes des serveurs SMS Android (SMS Gateway API / Traccar / SMS Forwarder)
      const payload = {
        to: cleanPhone,
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        message: message,
        text: message
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        headers['X-API-KEY'] = config.apiKey;
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✓ [Passerelle GSM] SMS envoyé avec succès au ${cleanPhone} via ${config.url}`);
        return {
          success: true,
          simulated: false,
          message: `SMS transmis avec succès via la passerelle GSM locale (${cleanPhone})`
        };
      } else {
        console.warn(`[Passerelle GSM] Réponse HTTP ${response.status}. Repli en mode local.`);
        return this._simulateFallback(cleanPhone, message, `Erreur passerelle HTTP ${response.status}`);
      }
    } catch (error) {
      const reason = error.name === 'AbortError' ? 'Délai dépassé (Timeout)' : (error.message || 'Passerelle injoignable');
      console.warn(`[Passerelle GSM] Échec connexion (${reason}). Repli en mode simulation locale.`);
      return this._simulateFallback(cleanPhone, message, reason);
    }
  },

  /**
   * Mode repli sécurisé en cas d'inaccessibilité de la passerelle
   */
  _simulateFallback(phone, message, reason) {
    // Notification console détaillée
    console.info(
      `%c[SMS SIMULÉ - 0 FCFA]%c Vers: ${phone} | Contenu: "${message}" | Raison: ${reason}`,
      'background: #10b981; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
      'color: #10b981;'
    );

    return {
      success: true,
      simulated: true,
      message: `SMS simulé en local pour ${phone} (${reason})`,
      preview: {
        phone,
        message,
        timestamp: new Date().toLocaleTimeString('fr-FR')
      }
    };
  },

  /**
   * Teste la connectivité avec l'adresse IP de la passerelle
   */
  async testConnection(testUrl, apiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const url = testUrl || this.getConfig().url;

      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
      }).catch(() => null);

      clearTimeout(timeoutId);
      return res !== null;
    } catch {
      return false;
    }
  },

  // Modèles de messages SMS standardisés
  formatCreditSms({ establishmentName = 'MaquisSync', amount, pinCode }) {
    return `${establishmentName}: Avoir de ${amount} F CFA créé pour vous. Code PIN secret: ${pinCode}. Présentez ce code lors de votre prochaine visite pour déduire de votre commande.`;
  },

  formatConsignmentSms({ establishmentName = 'MaquisSync', itemDetails, quantity = 1, pinCode }) {
    return `${establishmentName}: Consignation confirmée pour ${quantity}x ${itemDetails}. Code PIN secret: ${pinCode}. Présentez ce code au barman pour récupérer vos boissons fraîches.`;
  },

  formatRedemptionSms({ establishmentName = 'MaquisSync', itemDetails, waitressName = 'notre équipe' }) {
    return `${establishmentName}: Votre retrait (${itemDetails}) a été validé avec succès par ${waitressName}. Solde restant: 0. Merci pour votre confiance !`;
  }
};
