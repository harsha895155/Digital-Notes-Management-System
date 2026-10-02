import api from './api';
import { ProfileData, User } from '../types';
import { Platform } from 'react-native';

export interface UpdateProfilePayload {
  fullName?: string;
  username?: string;
  phone?: string;
  bio?: string;
}

export const profileService = {
  async getProfile(): Promise<ProfileData> {
    const res = await api.get<ProfileData>('/api/profile');
    return res.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<{ message: string; user: User }> {
    const res = await api.put<{ message: string; user: User }>('/api/profile', payload);
    return res.data;
  },

  async uploadAvatar(fileUri: string, mimeType = 'image/jpeg'): Promise<{ message: string; profileImage: string; user: User }> {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'avatar.jpg';

    if (Platform.OS === 'web') {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      formData.append('avatar', blob, filename);
    } else {
      // React Native FormData object for native uploads
      formData.append('avatar', {
        uri: fileUri,
        type: mimeType,
        name: filename,
      } as any);
    }

    const res = await api.post<{ message: string; profileImage: string; user: User }>(
      '/api/profile/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },

  async removeAvatar(): Promise<{ message: string; user: User }> {
    const res = await api.delete<{ message: string; user: User }>('/api/profile/avatar');
    return res.data;
  },
};
