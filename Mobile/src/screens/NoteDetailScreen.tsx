import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors, Shadows } from '../theme/colors';
import { Note, Category } from '../types';
import { MindDeskHeader } from '../components/Common/MindDeskHeader';
import { AttachmentItem } from '../components/Notes/AttachmentItem';
import { CreateNoteModal } from '../components/Modals/CreateNoteModal';
import { noteService } from '../services/noteService';
import { attachmentService } from '../services/attachmentService';
import { categoryService } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatShortDate, isOverdue } from '../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NoteDetailRoute = RouteProp<RootStackParamList, 'NoteDetail'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export const NoteDetailScreen: React.FC = () => {
  const route = useRoute<NoteDetailRoute>();
  const navigation = useNavigation<RootNav>();
  const { user } = useAuth();

  const [currentNote, setCurrentNote] = useState<Note>(route.params.note);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  React.useEffect(() => {
    if (user?.email) {
      categoryService.getCategories(user.email).then(setCategories).catch(console.warn);
    }
  }, [user?.email]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to permanently delete "${currentNote.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await noteService.deleteNote(currentNote._id);
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    Alert.alert(
      'Delete Attachment',
      'Are you sure you want to permanently remove this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await attachmentService.deleteNoteAttachment(currentNote._id, attachmentId);
              setCurrentNote((prev) => ({
                ...prev,
                attachments: prev.attachments?.filter((a) => a._id !== attachmentId),
              }));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete attachment.');
            }
          },
        },
      ]
    );
  };

  const overdue = isOverdue(currentNote.deadline);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <MindDeskHeader
        title="Note Details"
        showBack
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setIsEditModalOpen(true)}
              accessibilityLabel="Edit note"
            >
              <Ionicons name="pencil-outline" size={19} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleDelete}
              accessibilityLabel="Delete note"
            >
              <Ionicons name="trash-outline" size={19} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta badges */}
        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{currentNote.category}</Text>
          </View>

          {currentNote.folder ? (
            <View style={styles.folderBadge}>
              <Ionicons name="folder-outline" size={13} color={Colors.primary} />
              <Text style={styles.folderText}>{currentNote.folder}</Text>
            </View>
          ) : null}

          {currentNote.deadline ? (
            <View
              style={[
                styles.deadlineBadge,
                overdue ? styles.deadlineOverdue : styles.deadlineNormal,
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={13}
                color={overdue ? Colors.danger : Colors.textMuted}
              />
              <Text
                style={[
                  styles.deadlineText,
                  overdue ? styles.deadlineTextOverdue : null,
                ]}
              >
                Due: {formatShortDate(currentNote.deadline)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Note Title */}
        <Text style={styles.title}>{currentNote.title}</Text>

        <Text style={styles.createdDate}>
          Created on {formatDate(currentNote.createdAt)}
        </Text>

        {/* Note Body */}
        <View style={[styles.bodyCard, Shadows.small]}>
          <Text style={styles.descriptionText}>{currentNote.description}</Text>
        </View>

        {/* Attachments Section */}
        {currentNote.attachments && currentNote.attachments.length > 0 ? (
          <View style={styles.attachmentsSection}>
            <View style={styles.attachmentsHeader}>
              <Ionicons name="attach" size={18} color={Colors.primary} />
              <Text style={styles.attachmentsTitle}>
                Attachments ({currentNote.attachments.length})
              </Text>
            </View>

            {currentNote.attachments.map((att) => (
              <AttachmentItem
                key={att._id}
                attachment={att}
                showDelete
                onDelete={() => handleDeleteAttachment(att._id)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Edit Note Modal */}
      <CreateNoteModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updatedNote) => setCurrentNote(updatedNote)}
        categories={categories}
        initialNote={currentNote}
        userEmail={user?.email || ''}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  categoryPill: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  folderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  folderText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  deadlineNormal: {
    backgroundColor: Colors.cardSecondary,
  },
  deadlineOverdue: {
    backgroundColor: Colors.dangerLight,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  deadlineTextOverdue: {
    color: Colors.danger,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 30,
    marginBottom: 6,
  },
  createdDate: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  bodyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 20,
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.dark,
    lineHeight: 24,
  },
  attachmentsSection: {
    marginTop: 4,
  },
  attachmentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  attachmentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
});
