import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';
import { Note } from '../../types';
import { MindDeskCard } from '../Common/MindDeskCard';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, formatShortDate, isDeadlineSoon, isOverdue } from '../../utils/formatters';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onPress,
  onEdit,
  onDelete,
}) => {
  const overdue = isOverdue(note.deadline);
  const deadlineSoon = isDeadlineSoon(note.deadline);
  const attachmentCount = note.attachments?.length || 0;

  return (
    <MindDeskCard onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{note.category || 'General'}</Text>
        </View>

        {note.folder ? (
          <View style={styles.folderBadge}>
            <Ionicons name="folder-outline" size={12} color={Colors.primary} />
            <Text style={styles.folderText}>{note.folder}</Text>
          </View>
        ) : null}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onEdit}
            accessibilityLabel="Edit note"
            accessibilityRole="button"
          >
            <Ionicons name="pencil-outline" size={17} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onDelete}
            accessibilityLabel="Delete note"
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={17} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {note.title}
      </Text>

      <Text style={styles.description} numberOfLines={3}>
        {note.description}
      </Text>

      <View style={styles.footerRow}>
        {note.deadline ? (
          <View
            style={[
              styles.deadlineBadge,
              overdue
                ? styles.deadlineOverdue
                : deadlineSoon
                ? styles.deadlineSoon
                : styles.deadlineNormal,
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={
                overdue
                  ? Colors.danger
                  : deadlineSoon
                  ? Colors.warning
                  : Colors.textMuted
              }
            />
            <Text
              style={[
                styles.deadlineText,
                overdue
                  ? styles.deadlineTextOverdue
                  : deadlineSoon
                  ? styles.deadlineTextSoon
                  : null,
              ]}
            >
              {formatShortDate(note.deadline)}
              {overdue ? ' (Overdue)' : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.createdDate}>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.createdDateText}>{formatDate(note.createdAt)}</Text>
          </View>
        )}

        {attachmentCount > 0 ? (
          <View style={styles.attachmentBadge}>
            <Ionicons name="attach" size={14} color={Colors.primary} />
            <Text style={styles.attachmentText}>{attachmentCount}</Text>
          </View>
        ) : null}
      </View>
    </MindDeskCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 11,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  folderText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 6,
  },
  actionBtn: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 22,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  deadlineNormal: {
    backgroundColor: Colors.cardSecondary,
  },
  deadlineSoon: {
    backgroundColor: Colors.warningLight,
  },
  deadlineOverdue: {
    backgroundColor: Colors.dangerLight,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  deadlineTextSoon: {
    color: Colors.warning,
  },
  deadlineTextOverdue: {
    color: Colors.danger,
  },
  createdDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  createdDateText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  attachmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
