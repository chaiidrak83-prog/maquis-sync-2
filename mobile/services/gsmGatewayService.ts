import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GsmGatewayConfig {
  enabled: boolean;
  url: string;
  apiKey: string;
  timeoutMs: number;
}

export interface SmsSendResult {
  success: boolean;
  simulated: boolean;
  message: string;
  preview?: {
    phone: string;
    message: string;
    timestamp: string;
  };
}

const STORAGE_KEY = '@maquissync_gsm_gateway_config';

const DEFAULT_CONFIG: GsmGatewayConfig = {
  enabled: true,
  url: 'http://192.168.1.50:8080/send',
  apiKey: '',
  timeoutMs: 4000
};

export const gsmGatewayService = {
  async getConfig(): Promise<GsmGatewayConfig> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  },

  async saveConfig(config: GsmGatewayConfig): Promise<boolean> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (err) {
      console.warn('Erreur sauvegarde config passerelle GSM Mobile:', err);
      return false;
    }
  },

  async sendSms(phoneNumber: string, message: string): Promise<SmsSendResult> {
    const config = await this.getConfig();
    const cleanPhone = (phoneNumber || '').replace(/\s+/g, '');

    console.log(`📡 [Passerelle GSM Mobile] Envoi vers ${cleanPhone}: "${message}"`);

    if (!config.enabled || !config.url) {
      return this._simulateFallback(cleanPhone, message, 'Passerelle désactivée manuellement');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 4000);

      const payload = {
        to: cleanPhone,
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        message,
        text: message
      };

      const headers: Record<string, string> = {
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
        return {
          success: true,
          simulated: false,
          message: `SMS transmis via la passerelle GSM (${cleanPhone})`
        };
      } else {
        return this._simulateFallback(cleanPhone, message, `Erreur passerelle HTTP ${response.status}`);
      }
    } catch (error: any) {
      const reason = error?.name === 'AbortError' ? 'Délai dépassé (Timeout)' : (error?.message || 'Passerelle injoignable');
      return this._simulateFallback(cleanPhone, message, reason);
    }
  },

  _simulateFallback(phone: string, message: string, reason: string): SmsSendResult {
    console.info(`[SMS SIMULÉ - 0 FCFA] Vers: ${phone} | Contenu: "${message}" | Raison: ${reason}`);
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

  formatCreditSms(params: { establishmentName?: string; amount: number; pinCode: string }): string {
    const name = params.establishmentName || 'MaquisSync';
    return `${name}: Avoir de ${params.amount} F CFA créé pour vous. Code PIN secret: ${params.pinCode}. Présentez ce code lors de votre prochaine visite.`;
  },

  formatConsignmentSms(params: { establishmentName?: string; itemDetails: string; quantity?: number; pinCode: string }): string {
    const name = params.establishmentName || 'MaquisSync';
    const qty = params.quantity || 1;
    return `${name}: Consignation confirmée pour ${qty}x ${params.itemDetails}. Code PIN secret: ${params.pinCode}. Présentez ce code au barman pour récupérer vos boissons.`;
  },

  formatRedemptionSms(params: { establishmentName?: string; itemDetails: string; waitressName?: string }): string {
    const name = params.establishmentName || 'MaquisSync';
    const waitress = params.waitressName || 'notre équipe';
    return `${name}: Votre retrait (${params.itemDetails}) a été validé avec succès par ${waitress}. Solde restant: 0. Merci pour votre fidélité !`;
  }
};
