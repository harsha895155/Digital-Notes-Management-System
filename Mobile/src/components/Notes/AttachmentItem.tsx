import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '../../theme/colors';
import { Attachment } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { formatFileSize } from '../../utils/formatters';
import { attachmentService } from '../../services/attachmentService';

interface AttachmentItemProps {
  attachment: Attachment;
  onDelete?: () => void;
  showDelete?: boolean;
}

export const AttachmentItem: React.FC<AttachmentItemProps> = ({
  attachment,
  onDelete,
  showDelete = false,
}) => {
  const [downloading, setDownloading] = useState(false);

  const getFileIcon = (mime: string, name: string): keyof typeof Ionicons.glyphMap => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (mime.includes('image') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      return 'image-outline';
    }
    if (mime.includes('pdf') || ext === 'pdf') {
      return 'document-text-outline';
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return 'document-outline';
    }
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
      return 'grid-outline';
    }
    if (['zip', 'rar', '7z'].includes(ext || '')) {
      return 'archive-outline';
    }
    return 'document-attach-outline';
  };

  const handleOpen = async () => {
    try {
      setDownloading(true);
      await attachmentService.downloadAndOpenFile(attachment);
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not open the file.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.fileInfo}
        onPress={handleOpen}
        disabled={downloading}
        accessibilityRole="button"
        accessibilityLabel={`Open ${attachment.originalName}`}
      >
        <View style={styles.iconCircle}>
          <Ionicons
            name={getFileIcon(attachment.mimeType, attachment.originalName)}
            size={18}
            color={Colors.primary}
          />
        </View>

        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={1}>
            {attachment.originalName}
          </Text>
          <Text style={styles.size}>{formatFileSize(attachment.size)}</Text>
        </View>

        {downloading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.downloadIcon} />
        ) : (
          <Ionicons
            name="download-outline"
            size={18}
            color={Colors.primary}
            style={styles.downloadIcon}
          />
        )}
      </TouchableOpacity>

      {showDelete && onDelete ? (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          accessibilityLabel="Delete attachment"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 10,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark,
  },
  size: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  downloadIcon: {
    paddingHorizontal: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
});
