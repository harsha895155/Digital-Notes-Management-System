import api from './api';
import { User } from '../types';

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/api/login', { email, password });
    return res.data;
  },

  async register(
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/api/register', {
      fullName,
      email,
      password,
      confirmPassword,
    });
    return res.data;
  },

  async changePassword(
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const res = await api.put<{ message: string }>('/api/change-password', {
      email,
      currentPassword,
      newPassword,
    });
    return res.data;
  },
};
