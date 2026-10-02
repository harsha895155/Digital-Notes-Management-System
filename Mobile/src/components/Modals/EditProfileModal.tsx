import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { User } from '../../types';
import { MindDeskInput } from '../Common/MindDeskInput';
import { MindDeskButton } from '../Common/MindDeskButton';
import { Ionicons } from '@expo/vector-icons';
import { profileService } from '../../services/profileService';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  currentUser: User | null;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  onSuccess,
  currentUser,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && currentUser) {
      setFullName(currentUser.fullName || '');
      setUsername(currentUser.username || '');
      setPhone(currentUser.phone || '');
      setBio(currentUser.bio || '');
      setError('');
    }
  }, [visible, currentUser]);

  const handleSave = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Full Name must be at least 2 characters.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await profileService.updateProfile({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        phone: phone.trim(),
        bio: bio.trim(),
      });

      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Text style={styles.modalSubtitle}>Update your personal information</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <MindDeskInput
              label="Full Name *"
              placeholder="e.g. Harsha Vardhan"
              value={fullName}
              onChangeText={setFullName}
              leftIcon="person-outline"
              maxLength={100}
            />

            <MindDeskInput
              label="Username"
              placeholder="e.g. harshavardhan"
              value={username}
              onChangeText={setUsername}
              leftIcon="at-outline"
              maxLength={50}
              autoCapitalize="none"
            />

            <MindDeskInput
              label="Phone Number"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChangeText={setPhone}
              leftIcon="call-outline"
              keyboardType="phone-pad"
              maxLength={25}
            />

            <MindDeskInput
              label="Bio"
              placeholder="Tell us a little bit about yourself..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </ScrollView>

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
              title={loading ? 'Saving...' : 'Save Changes'}
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
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.dark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 12,
  },
});
