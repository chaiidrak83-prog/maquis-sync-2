import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { superAdminService } from '../../services/superAdminService';

export default function SuperAdminCommunicationScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [lastReport, setLastReport] = useState<{
    title: string;
    sentCount: number;
    timestamp: string;
  } | null>(null);

  const handleSendBroadcast = async () => {
    if (!title.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le titre de la notification.');
      return;
    }
    if (!body.trim()) {
      Alert.alert('Champ requis', 'Veuillez rédiger le corps de votre message.');
      return;
    }

    const targetLabel =
      target === 'ALL'
        ? 'l’ensemble des gérants'
        : target === 'ACTIVE'
        ? 'les comptes actifs uniquement'
        : 'les comptes en attente de validation';

    Alert.alert(
      'Confirmer la diffusion push',
      `Vous vous apprêtez à envoyer une notification push instantanée à ${targetLabel} :\n\n📌 "${title}"\n📝 "${body}"\n\nSouhaitez-vous diffuser ce message maintenant ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Diffuser la notification 🚀',
          style: 'default',
          onPress: async () => {
            setIsSending(true);
            try {
              const res = await superAdminService.broadcastNotification({
                title: title.trim(),
                body: body.trim(),
                target,
              });

              setLastReport({
                title: title.trim(),
                sentCount: res.sentCount,
                timestamp: new Date().toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              });

              Alert.alert(
                'Diffusion Réussie ! 🔔',
                `La notification a été diffusée avec succès via Expo Server SDK à ${res.sentCount} appareils.`,
              );

              // Réinitialiser les champs
              setTitle('');
              setBody('');
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible d’envoyer la notification.');
            } finally {
              setIsSending(false);
            }
          },
        },
      ],
    );
  };

  // Modèles prédéfinis pour faciliter l'envoi
  const handleUseTemplate = (tmplTitle: string, tmplBody: string) => {
    setTitle(tmplTitle);
    setBody(tmplBody);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Console de Communication Push Globale</Text>
        <Text style={styles.bannerSub}>
          Diffusez des annonces opérationnelles, des alertes de maintenance ou des relances commerciales directement sur les smartphones des gérants.
        </Text>
      </View>

      {/* Target Audience Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Cible des Destinataires</Text>
        <View style={styles.targetRow}>
          {[
            { key: 'ALL', label: '📢 Tous les gérants' },
            { key: 'ACTIVE', label: '✅ Actifs' },
            { key: 'PENDING', label: '⏳ En attente' },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.targetBtn, target === t.key && styles.targetBtnActive]}
              onPress={() => setTarget(t.key as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.targetBtnText, target === t.key && styles.targetBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Message Composer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Rédiger le Message</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Titre de la notification</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Nouveauté : Mode inventaire amélioré !"
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
          <Text style={styles.charCount}>{title.length}/60 caractères</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Corps du message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Rédigez ici le contenu de la notification transmise sur l'écran verrouillé des gérants..."
            placeholderTextColor="#64748b"
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={4}
            maxLength={250}
          />
          <Text style={styles.charCount}>{body.length}/250 caractères</Text>
        </View>

        {/* Quick Templates */}
        <Text style={[styles.label, { marginTop: 4 }]}>Modèles rapides :</Text>
        <View style={styles.templateRow}>
          <TouchableOpacity
            style={styles.templateChip}
            onPress={() =>
              handleUseTemplate(
                'Mise à jour MaquisSync 🚀',
                'Une nouvelle version de votre application est disponible. Pensez à synchroniser vos ventes !',
              )
            }
          >
            <Text style={styles.templateText}>📦 Mise à jour</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.templateChip}
            onPress={() =>
              handleUseTemplate(
                'Rappel de Clôture de Caisse 💰',
                'N’oubliez pas d’enregistrer la fin de shift de vos serveuses pour générer le bilan WhatsApp.',
              )
            }
          >
            <Text style={styles.templateText}>🌙 Fin de Shift</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.templateChip}
            onPress={() =>
              handleUseTemplate(
                'Validation de votre Compte ⚡',
                'Votre compte est en attente de règlement Orange Money. Finalisez votre paiement pour débloquer les ventes.',
              )
            }
          >
            <Text style={styles.templateText}>⏳ Relance Paiement</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Phone Notification Preview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>3. Aperçu sur le Mobile Client</Text>
        <View style={styles.phoneNotificationBox}>
          <View style={styles.previewTop}>
            <View style={styles.appIconCircle}>
              <Text style={{ fontSize: 12 }}>🍺</Text>
            </View>
            <Text style={styles.appName}>MaquisSync • Maintenant</Text>
          </View>
          <Text style={styles.previewTitle}>{title || 'Titre de votre notification'}</Text>
          <Text style={styles.previewBody}>
            {body || 'Le texte rédigé apparaîtra ici tel qu’il sera affiché sur le téléphone des gérants.'}
          </Text>
        </View>
      </View>

      {/* Send Button */}
      <TouchableOpacity
        style={[styles.sendButton, isSending && { opacity: 0.6 }]}
        onPress={handleSendBroadcast}
        disabled={isSending}
        activeOpacity={0.85}
      >
        {isSending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.sendButtonText}>Envoyer la notification push à tous 🚀</Text>
        )}
      </TouchableOpacity>

      {/* Last report summary */}
      {lastReport && (
        <View style={styles.reportBox}>
          <Text style={styles.reportTitle}>✅ Dernière diffusion réussie à {lastReport.timestamp}</Text>
          <Text style={styles.reportText}>
            "{lastReport.title}" transmis à {lastReport.sentCount} appareils.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
    gap: 16,
  },
  banner: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  bannerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSub: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  targetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  targetBtn: {
    flex: 1,
    backgroundColor: '#090d16',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  targetBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  targetBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  targetBtnTextActive: {
    color: '#ef4444',
    fontWeight: '900',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'right',
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateChip: {
    backgroundColor: '#090d16',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  templateText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  phoneNotificationBox: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  appIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  previewTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  previewBody: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
  },
  sendButton: {
    backgroundColor: '#ef4444',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  reportBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  reportTitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  reportText: {
    color: '#cbd5e1',
    fontSize: 11,
  },
});
