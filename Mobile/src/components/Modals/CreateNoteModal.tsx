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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Note, Category, Attachment } from '../../types';
import { MindDeskInput } from '../Common/MindDeskInput';
import { MindDeskButton } from '../Common/MindDeskButton';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { attachmentService, SelectedFile } from '../../services/attachmentService';
import { noteService } from '../../services/noteService';
import { formatShortDate } from '../../utils/formatters';
import { AttachmentItem } from '../Notes/AttachmentItem';

interface CreateNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (note: Note) => void;
  categories: Category[];
  initialNote?: Note | null;
  userEmail: string;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  visible,
  onClose,
  onSuccess,
  categories,
  initialNote,
  userEmail,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [folder, setFolder] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newFiles, setNewFiles] = useState<SelectedFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Synchronize initial state when opening modal
  useEffect(() => {
    if (visible) {
      if (initialNote) {
        setTitle(initialNote.title || '');
        setDescription(initialNote.description || '');
        setCategory(initialNote.category || (categories[0]?.name || 'General'));
        setFolder(initialNote.folder || '');
        setDeadline(initialNote.deadline ? new Date(initialNote.deadline) : null);
        setExistingAttachments(initialNote.attachments || []);
        setNewFiles([]);
      } else {
        setTitle('');
        setDescription('');
        setCategory(categories[0]?.name || 'General');
        setFolder('');
        setDeadline(null);
        setExistingAttachments([]);
        setNewFiles([]);
      }
      setError('');
    }
  }, [visible, initialNote, categories]);

  // Current category's folders
  const currentCategoryObj = categories.find((c) => c.name === category);
  const currentFolders = currentCategoryObj?.folders || [];

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets) {
        const picked = res.assets.map((a) => ({
          uri: a.uri,
          name: a.name,
          mimeType: a.mimeType,
          size: a.size,
        }));
        setNewFiles((prev) => [...prev, ...picked]);
      }
    } catch (e: any) {
      Alert.alert('File Picker Error', e.message || 'Could not pick document.');
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to select photos.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets) {
        const picked = res.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName || `photo_${Date.now()}.jpg`,
          mimeType: a.mimeType || 'image/jpeg',
          size: a.fileSize || 0,
        }));
        setNewFiles((prev) => [...prev, ...picked]);
      }
    } catch (e: any) {
      Alert.alert('Image Picker Error', e.message || 'Could not pick image.');
    }
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingAttachment = (attachmentId: string) => {
    setExistingAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please provide a title for the note.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // 1. Upload new attachments if any
      let uploadedAttachments: Attachment[] = [];
      if (newFiles.length > 0) {
        uploadedAttachments = await attachmentService.uploadBatchFiles(newFiles);
      }

      const combinedAttachments = [...existingAttachments, ...uploadedAttachments];

      if (initialNote) {
        // Update existing note
        const updated = await noteService.updateNote(initialNote._id, {
          title: title.trim(),
          description: description.trim(),
          category,
          folder: folder.trim(),
          deadline: deadline ? deadline.toISOString() : null,
          attachments: combinedAttachments,
        });
        onSuccess(updated);
      } else {
        // Create new note
        const created = await noteService.createNote({
          title: title.trim(),
          description: description.trim(),
          category,
          folder: folder.trim(),
          deadline: deadline ? deadline.toISOString() : null,
          userEmail,
          attachments: combinedAttachments,
        });
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {initialNote ? 'Edit Note' : 'Create New Note'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {initialNote ? 'Update your note content & files' : 'Capture your thoughts and attachments'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close modal">
              <Ionicons name="close" size={22} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Title */}
            <MindDeskInput
              label="Title *"
              placeholder="e.g. Project Plan & Architecture"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />

            {/* Category Selector */}
            <Text style={styles.sectionLabel}>Category *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={[
                    styles.categoryChip,
                    category === cat.name && styles.categoryChipActive,
                  ]}
                  onPress={() => {
                    setCategory(cat.name);
                    setFolder('');
                  }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat.name && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Folders in selected Category */}
            {currentFolders.length > 0 ? (
              <View style={styles.folderSection}>
                <Text style={styles.sectionLabel}>Folder (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[styles.folderChip, folder === '' && styles.folderChipActive]}
                    onPress={() => setFolder('')}
                  >
                    <Text style={[styles.folderChipText, folder === '' && styles.folderChipTextActive]}>
                      None
                    </Text>
                  </TouchableOpacity>
                  {currentFolders.map((f) => (
                    <TouchableOpacity
                      key={f._id}
                      style={[styles.folderChip, folder === f.name && styles.folderChipActive]}
                      onPress={() => setFolder(f.name)}
                    >
                      <Ionicons
                        name="folder-outline"
                        size={12}
                        color={folder === f.name ? '#FFFFFF' : Colors.primary}
                      />
                      <Text style={[styles.folderChipText, folder === f.name && styles.folderChipTextActive]}>
                        {f.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Deadline */}
            <Text style={styles.sectionLabel}>Deadline (Optional)</Text>
            <View style={styles.deadlineContainer}>
              <TouchableOpacity
                style={styles.deadlineButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <Text style={styles.deadlineButtonText}>
                  {deadline ? formatShortDate(deadline.toISOString()) : 'Set deadline date'}
                </Text>
              </TouchableOpacity>

              {deadline && (
                <TouchableOpacity
                  style={styles.clearDeadlineBtn}
                  onPress={() => setDeadline(null)}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={deadline || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDeadline(selectedDate);
                }}
              />
            )}

            {/* Description */}
            <MindDeskInput
              label="Description *"
              placeholder="Write your note details here..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            {/* Attachments Section */}
            <View style={styles.attachmentHeaderRow}>
              <Text style={styles.sectionLabel}>Attachments</Text>
              <View style={styles.attachmentActionButtons}>
                <TouchableOpacity style={styles.attachBtn} onPress={handlePickDocument}>
                  <Ionicons name="document-attach-outline" size={16} color={Colors.primary} />
                  <Text style={styles.attachBtnText}>Doc</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
                  <Ionicons name="image-outline" size={16} color={Colors.primary} />
                  <Text style={styles.attachBtnText}>Image</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Existing Attachments */}
            {existingAttachments.map((att) => (
              <AttachmentItem
                key={att._id}
                attachment={att}
                showDelete
                onDelete={() => handleRemoveExistingAttachment(att._id)}
              />
            ))}

            {/* Newly selected files waiting for save */}
            {newFiles.map((file, idx) => (
              <View key={idx} style={styles.newFilePill}>
                <Ionicons name="cloud-upload-outline" size={16} color={Colors.primary} />
                <Text style={styles.newFileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveNewFile(idx)}>
                  <Ionicons name="close-circle" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <MindDeskButton
              title="Cancel"
              variant="outline"
              size="md"
              onPress={onClose}
              disabled={saving}
              style={{ flex: 1 }}
            />
            <MindDeskButton
              title={saving ? 'Saving...' : initialNote ? 'Update Note' : 'Create Note'}
              variant="primary"
              size="md"
              onPress={handleSave}
              loading={saving}
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
    maxHeight: '90%',
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
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  categoryScroll: {
    marginBottom: 14,
  },
  categoryScrollContent: {
    gap: 8,
  },
  categoryChip: {
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.dark,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: Colors.textLight,
  },
  folderSection: {
    marginBottom: 14,
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 6,
    gap: 4,
  },
  folderChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  folderChipText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  folderChipTextActive: {
    color: '#FFFFFF',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deadlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  deadlineButtonText: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
  },
  clearDeadlineBtn: {
    marginLeft: 8,
    padding: 4,
  },
  attachmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  newFilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 6,
    gap: 8,
  },
  newFileName: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark,
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
