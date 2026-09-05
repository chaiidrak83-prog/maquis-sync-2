import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { teamService } from '../services/teamService';

interface StaffRegisterModalProps {
  visible: boolean;
  onClose: () => void;
  defaultRole?: 'SERVEUSE' | 'GERANT';
  onRegisteredSuccess?: (role: 'SERVEUSE' | 'GERANT', phone: string) => void;
}

export function StaffRegisterModal({
  visible,
  onClose,
  defaultRole = 'SERVEUSE',
  onRegisteredSuccess,
}: StaffRegisterModalProps) {
  const [role, setRole] = useState<'SERVEUSE' | 'GERANT'>(defaultRole);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [codeEtablissement, setCodeEtablissement] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMessage('Veuillez saisir votre nom complet.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMessage('Numéro de téléphone invalide (au moins 8 chiffres).');
      return;
    }
    if (!password.trim() || password.trim().length < 4) {
      setErrorMessage('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    if (!codeEtablissement.trim()) {
      setErrorMessage('Le code établissement est obligatoire.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const formattedCode = codeEtablissement.trim().toUpperCase();
      const res = await teamService.registerStaff(role, {
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim(),
        code_etablissement: formattedCode,
      });

      const roleLabel = role === 'GERANT' ? 'Gérant' : 'Serveuse';
      const supervisor = role === 'GERANT' ? 'le propriétaire' : 'votre gérant ou propriétaire';

      Alert.alert(
        'Inscription Enregistrée ! 🎉',
        `Votre demande pour le rôle de ${roleLabel} a été transmise.\n\nAttendez que ${supervisor} approuve votre compte pour prendre votre service.`,
        [
          {
            text: 'Compris',
            onPress: () => {
              onClose();
              if (onRegisteredSuccess) {
                onRegisteredSuccess(role, phone.trim());
              }
              // Réinitialiser les champs
              setName('');
              setPhone('');
              setPassword('');
              setCodeEtablissement('');
            },
          },
        ],
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de l’inscription.');
    } finally {
      setIsLoading(false);
    }
  };

  const isServeuse = role === 'SERVEUSE';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* BOUTON FERMETURE */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollInner}>
            {/* ILLUSTRATION LOGO SERVEUSE & MARQUE */}
            <View style={styles.brandHeader}>
              <View style={styles.illustrationCircle}>
                <Text style={styles.waitressIcon}>{isServeuse ? '👩🏾‍🍳' : '👔'}</Text>
                <View style={styles.trayBadge}>
                  <Text style={styles.trayIcon}>🍹🍺</Text>
                </View>
              </View>

              <Text style={styles.brandTitle}>
                Maquis <Text style={styles.brandAccent}>SaaS</Text>
              </Text>
            </View>

            {/* SÉLECTEUR DE RÔLE (TABS) */}
            <View style={styles.roleToggle}>
              <TouchableOpacity
                style={[styles.roleTab, isServeuse && styles.roleTabActive]}
                onPress={() => setRole('SERVEUSE')}
              >
                <Text style={[styles.roleTabText, isServeuse && styles.roleTabTextActive]}>
                  🍹 Serveuse
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleTab, !isServeuse && styles.roleTabActive]}
                onPress={() => setRole('GERANT')}
              >
                <Text style={[styles.roleTabText, !isServeuse && styles.roleTabTextActive]}>
                  👔 Gérant
                </Text>
              </TouchableOpacity>
            </View>

            {/* EN-TÊTE TITRE & SOUS-TITRE */}
            <Text style={styles.mainTitle}>
              {isServeuse ? 'INSCRIPTION SERVEUSE' : 'INSCRIPTION GÉRANT'}
            </Text>
            <Text style={styles.subtitle}>
              {isServeuse
                ? 'Créez votre compte. Il sera validé par votre propriétaire ou gérant.'
                : 'Créez votre compte. Il sera validé par votre propriétaire.'}
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* 1. NOM COMPLET */}
            <View style={styles.outlinedField}>
              <View style={styles.labelWrapper}>
                <Text style={styles.floatingLabel}>Nom Complet</Text>
              </View>
              <View style={styles.inputInnerRow}>
                <Text style={styles.fieldIcon}>👤</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder={isServeuse ? 'Kadi Barry' : 'Koffi Mensah'}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* 2. NUMÉRO DE TÉLÉPHONE */}
            <View style={styles.outlinedField}>
              <View style={styles.labelWrapper}>
                <Text style={styles.floatingLabel}>Numéro de Téléphone</Text>
              </View>
              <View style={styles.inputInnerRow}>
                <Text style={styles.fieldIcon}>📞</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+226 70 12 34 56"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* 3. MOT DE PASSE */}
            <View style={styles.outlinedField}>
              <View style={styles.labelWrapper}>
                <Text style={styles.floatingLabel}>Mot de Passe</Text>
              </View>
              <View style={styles.inputInnerRow}>
                <Text style={styles.fieldIcon}>🔒</Text>
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. CODE ÉTABLISSEMENT (MIS EN ÉVIDENCE AVEC BORDURE ORANGÉE) */}
            <View style={[styles.outlinedField, styles.highlightedField]}>
              <View style={styles.labelWrapper}>
                <Text style={[styles.floatingLabel, styles.highlightedLabel]}>
                  {isServeuse
                    ? 'Code Établissement (Donné par le responsable)'
                    : 'Code Établissement (Donné par le propriétaire)'}
                </Text>
              </View>
              <View style={styles.inputInnerRow}>
                <Text style={styles.fieldIconKey}>🔑</Text>
                <TextInput
                  style={[styles.textInput, styles.highlightedInput]}
                  value={codeEtablissement}
                  onChangeText={(text) => setCodeEtablissement(text.toUpperCase())}
                  placeholder="ABCD123 ou MQ-8492"
                  placeholderTextColor="#d97706"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* BOUTON S'INSCRIRE */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>S'INSCRIRE</Text>
              )}
            </TouchableOpacity>

            {/* NOTE BAS DE PAGE */}
            <Text style={styles.footerNote}>
              {isServeuse
                ? 'Une fois inscrite, attendez que votre responsable approuve votre compte.'
                : 'Une fois inscrit, attendez que votre propriétaire approuve votre compte.'}
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 22,
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
  },
  scrollInner: {
    paddingBottom: 20,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  illustrationCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff7ed',
    borderWidth: 2,
    borderColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  waitressIcon: {
    fontSize: 34,
  },
  trayBadge: {
    position: 'absolute',
    right: -4,
    top: 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  trayIcon: {
    fontSize: 12,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#ea580c',
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  roleTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  roleTabTextActive: {
    color: '#ea580c',
    fontWeight: '800',
  },
  mainTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  outlinedField: {
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  highlightedField: {
    borderColor: '#f97316',
    borderWidth: 2,
    backgroundColor: '#fffaf5',
  },
  labelWrapper: {
    position: 'absolute',
    top: -10,
    left: 14,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    zIndex: 2,
  },
  floatingLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  highlightedLabel: {
    color: '#ea580c',
  },
  inputInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldIcon: {
    fontSize: 18,
  },
  fieldIconKey: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    padding: 0,
  },
  highlightedInput: {
    color: '#c2410c',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  eyeIcon: {
    fontSize: 18,
    paddingHorizontal: 4,
  },
  submitButton: {
    backgroundColor: '#ea580c',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12.5,
    color: '#64748b',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
});

export default StaffRegisterModal;
