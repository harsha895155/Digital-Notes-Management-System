import api, { API_URL } from './api';
import { Attachment } from '../types';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SecureStorage } from '../utils/storage';

export interface SelectedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export const attachmentService = {
  /**
   * Upload batch files to /api/upload
   */
  async uploadBatchFiles(files: SelectedFile[]): Promise<Attachment[]> {
    if (!files.length) return [];

    const formData = new FormData();
    for (const f of files) {
      if (Platform.OS === 'web') {
        const response = await fetch(f.uri);
        const blob = await response.blob();
        formData.append('files', blob, f.name);
      } else {
        formData.append('files', {
          uri: f.uri,
          name: f.name,
          type: f.mimeType || 'application/octet-stream',
        } as any);
      }
    }

    const res = await api.post<{ message: string; attachments: Attachment[] }>(
      '/api/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return res.data.attachments || [];
  },

  /**
   * Delete an attachment from a note
   */
  async deleteNoteAttachment(noteId: string, attachmentId: string): Promise<void> {
    await api.delete(`/api/notes/${noteId}/attachments/${attachmentId}`);
  },

  /**
   * Securely download and share/open a file attachment
   */
  async downloadAndOpenFile(attachment: Attachment): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // In web browser, direct window open with download endpoint
        const token = await SecureStorage.getToken();
        const url = `${API_URL}/api/attachments/${attachment._id}/download?token=${encodeURIComponent(token || '')}`;
        window.open(url, '_blank');
        return;
      }

      const fileUri = `${FileSystem.documentDirectory}${attachment.originalName}`;
      const token = await SecureStorage.getToken();

      const downloadResult = await FileSystem.downloadAsync(
        `${API_URL}/api/attachments/${attachment._id}/download`,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (downloadResult.status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          alert(`File saved to ${downloadResult.uri}`);
        }
      } else {
        throw new Error('Failed to download file from server');
      }
    } catch (err: any) {
      console.error('File download error:', err);
      throw new Error(err.message || 'Could not download or open the attachment');
    }
  },
};
