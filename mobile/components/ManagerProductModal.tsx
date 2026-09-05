import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { posService, Product, DEFAULT_BOTTLE_IMAGES } from '@/services/posService';

interface ManagerProductModalProps {
  visible: boolean;
  onClose: () => void;
  onProductAdded: (product: Product) => void;
  establishmentId?: string;
}

export function ManagerProductModal({
  visible,
  onClose,
  onProductAdded,
  establishmentId,
}: ManagerProductModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('50');
  const [volume, setVolume] = useState('65cl');
  const [category, setCategory] = useState<'Bière' | 'Sucrerie' | 'Eau'>('Bière');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Prendre directement la bouteille en photo avec la caméra
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission requise',
          'L\'accès à la caméra est nécessaire pour photographier la bouteille.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        if (asset.base64) {
          setImageBase64(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setImageBase64(asset.uri);
        }
      }
    } catch (err: any) {
      console.warn('Erreur caméra:', err);
      Alert.alert('Erreur', 'Impossible d\'activer la caméra sur cet appareil.');
    }
  };

  // 2. Choisir une photo de boisson depuis la galerie
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission requise',
          'L\'accès à la galerie photos est nécessaire.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        if (asset.base64) {
          setImageBase64(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setImageBase64(asset.uri);
        }
      }
    } catch (err: any) {
      console.warn('Erreur galerie:', err);
      Alert.alert('Erreur', 'Impossible d\'accéder à la galerie.');
    }
  };

  // Enregistrement de la nouvelle boisson
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le nom de la boisson (ex: Brakina).');
      return;
    }
    const numPrice = parseInt(price, 10);
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Prix invalide', 'Veuillez saisir un prix de vente valide (ex: 900 FCFA).');
      return;
    }
    const numStock = parseInt(stock, 10) || 50;

    setIsSaving(true);
    try {
      // Détermine l'illustration fallback selon la catégorie si aucune photo n'a été prise
      let finalImage = imageBase64 || imageUri;
      if (!finalImage) {
        if (category === 'Bière') finalImage = DEFAULT_BOTTLE_IMAGES.biere_ambre;
        else if (category === 'Sucrerie') finalImage = DEFAULT_BOTTLE_IMAGES.sucrerie_rouge;
        else finalImage = DEFAULT_BOTTLE_IMAGES.eau_bleue;
      }

      const created = await posService.addProduct({
        name: name.trim(),
        volume: volume.trim(),
        price: numPrice,
        category,
        current_stock: numStock,
        imageUrl: finalImage,
        establishment_id: establishmentId,
      });

      // Réinitialiser le formulaire
      setName('');
      setPrice('');
      setStock('50');
      setImageUri(null);
      setImageBase64(null);

      onProductAdded(created);
      onClose();
      Alert.alert('Succès', `La boisson "${created.name}" a été ajoutée au menu avec sa photo !`);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d\'ajouter la boisson.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Ajouter une Boisson</Text>
              <Text style={styles.modalSub}>Menu & Catalogue visuel du Gérant</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. Zone Photo Bouteille */}
            <Text style={styles.sectionLabel}>1. Photo de la Bouteille</Text>
            <View style={styles.imagePickerSection}>
              {imageUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => {
                      setImageUri(null);
                      setImageBase64(null);
                    }}
                  >
                    <Text style={styles.retakeBtnText}>🔄 Changer la photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyPreview}>
                  <Text style={styles.emptyPreviewIcon}>🍾</Text>
                  <Text style={styles.emptyPreviewText}>Aucune photo associée</Text>
                  <Text style={styles.emptyPreviewHint}>Photographiez la bouteille pour que les serveuses la reconnaissent immédiatement</Text>
                </View>
              )}

              {/* Gros Bouton Caméra (Prise directe) */}
              <TouchableOpacity
                style={styles.cameraBigButton}
                onPress={handleTakePhoto}
                activeOpacity={0.85}
              >
                <Text style={styles.cameraBigButtonIcon}>📸</Text>
                <View>
                  <Text style={styles.cameraBigButtonText}>Prendre en Photo la Bouteille</Text>
                  <Text style={styles.cameraBigButtonSub}>Ouvre la caméra du téléphone</Text>
                </View>
              </TouchableOpacity>

              {/* Bouton secondaire Galerie */}
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <Text style={styles.galleryButtonText}>🖼️ Choisir une image dans la galerie</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Sélection de Catégorie (Code Couleur Dynamique) */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>2. Catégorie de Boisson</Text>
            <View style={styles.categoryRow}>
              {/* Bière */}
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  category === 'Bière' && styles.categoryPillActiveBiere,
                ]}
                onPress={() => setCategory('Bière')}
              >
                <Text style={styles.categoryPillIcon}>🍺</Text>
                <Text
                  style={[
                    styles.categoryPillText,
                    category === 'Bière' && { color: '#f59e0b', fontWeight: 'bold' },
                  ]}
                >
                  Bière
                </Text>
              </TouchableOpacity>

              {/* Sucrerie */}
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  category === 'Sucrerie' && styles.categoryPillActiveSucrerie,
                ]}
                onPress={() => setCategory('Sucrerie')}
              >
                <Text style={styles.categoryPillIcon}>🥤</Text>
                <Text
                  style={[
                    styles.categoryPillText,
                    category === 'Sucrerie' && { color: '#ef4444', fontWeight: 'bold' },
                  ]}
                >
                  Sucrerie
                </Text>
              </TouchableOpacity>

              {/* Eau */}
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  category === 'Eau' && styles.categoryPillActiveEau,
                ]}
                onPress={() => setCategory('Eau')}
              >
                <Text style={styles.categoryPillIcon}>💧</Text>
                <Text
                  style={[
                    styles.categoryPillText,
                    category === 'Eau' && { color: '#0ea5e9', fontWeight: 'bold' },
                  ]}
                >
                  Eau
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3. Informations de Vente */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>3. Détails & Prix</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom de la Boisson *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Brakina, Beaufort, Coca, Guinness..."
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Prix (F CFA) *</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="Ex: 900"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Volume</Text>
                <TextInput
                  style={styles.input}
                  placeholder="65cl, 33cl, 1.5L"
                  placeholderTextColor="#64748b"
                  value={volume}
                  onChangeText={setVolume}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stock Initial (bouteilles)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 50"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={stock}
                onChangeText={setStock}
              />
            </View>

            {/* Bouton de Sauvegarde */}
            <TouchableOpacity
              style={[styles.submitButton, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <>
                  <Text style={styles.submitButtonIcon}>💾</Text>
                  <Text style={styles.submitButtonText}>Ajouter au Catalogue</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  imagePickerSection: {
    alignItems: 'center',
    marginBottom: 6,
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePreview: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  retakeBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  retakeBtnText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  emptyPreview: {
    width: '100%',
    height: 120,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  emptyPreviewIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyPreviewText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyPreviewHint: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  cameraBigButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraBigButtonIcon: {
    fontSize: 26,
  },
  cameraBigButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cameraBigButtonSub: {
    color: '#064e3b',
    fontSize: 11,
    fontWeight: '500',
  },
  galleryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  galleryButtonText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  categoryPillActiveBiere: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  categoryPillActiveSucrerie: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  categoryPillActiveEau: {
    borderColor: '#0ea5e9',
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  categoryPillIcon: {
    fontSize: 18,
  },
  categoryPillText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceInput: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38bdf8',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 14,
  },
  submitButtonIcon: {
    fontSize: 18,
  },
  submitButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ManagerProductModal;
