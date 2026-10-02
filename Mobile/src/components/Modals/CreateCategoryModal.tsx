import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Category } from '../../types';
import { MindDeskInput } from '../Common/MindDeskInput';
import { MindDeskButton } from '../Common/MindDeskButton';
import { Ionicons } from '@expo/vector-icons';
import { categoryService } from '../../services/categoryService';

interface CreateCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (cat: Category) => void;
  userEmail: string;
  parentCategory?: Category | null; // If provided, adds folder instead of category
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  visible,
  onClose,
  onSuccess,
  userEmail,
  parentCategory,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isFolder = !!parentCategory;

  const handleSave = async () => {
    if (!name.trim()) {
      setError(`Please enter a ${isFolder ? 'folder' : 'category'} name.`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (isFolder && parentCategory) {
        const updatedCat = await categoryService.createFolder(parentCategory._id, name.trim());
        onSuccess(updatedCat);
      } else {
        const newCat = await categoryService.createCategory(name.trim(), userEmail);
        onSuccess(newCat);
      }

      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to create ${isFolder ? 'folder' : 'category'}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isFolder ? `New Folder in "${parentCategory.name}"` : 'New Category'}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <MindDeskInput
              label={isFolder ? 'Folder Name' : 'Category Name'}
              placeholder={isFolder ? 'e.g. Q3 Invoices' : 'e.g. Finances, Work, Study'}
              value={name}
              onChangeText={setName}
              leftIcon={isFolder ? 'folder-outline' : 'pricetag-outline'}
              autoFocus
            />
          </View>

          <View style={styles.modalFooter}>
            <MindDeskButton
              title="Cancel"
              variant="outline"
              size="md"
              onPress={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <MindDeskButton
              title={loading ? 'Creating...' : isFolder ? 'Create Folder' : 'Create Category'}
              variant="primary"
              size="md"
              onPress={handleSave}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(36, 22, 15, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 20,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
  },
  modalBody: {
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
});
