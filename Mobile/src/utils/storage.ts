import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'minddesk_jwt_token';
const USER_KEY = 'minddesk_user_data';

// Web in-memory fallback since SecureStore is native-only
const memoryFallback: Record<string, string> = {};

export const SecureStorage = {
  async setToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          memoryFallback[TOKEN_KEY] = token;
        }
        return;
      }
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.warn('SecureStore setToken error:', error);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          return localStorage.getItem(TOKEN_KEY);
        }
        return memoryFallback[TOKEN_KEY] || null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.warn('SecureStore getToken error:', error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(TOKEN_KEY);
        }
        delete memoryFallback[TOKEN_KEY];
        return;
      }
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.warn('SecureStore removeToken error:', error);
    }
  },

  async setUserData(user: any): Promise<void> {
    try {
      const serialized = JSON.stringify(user);
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(USER_KEY, serialized);
        } else {
          memoryFallback[USER_KEY] = serialized;
        }
        return;
      }
      await SecureStore.setItemAsync(USER_KEY, serialized);
    } catch (error) {
      console.warn('SecureStore setUserData error:', error);
    }
  },

  async getUserData(): Promise<any | null> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          raw = localStorage.getItem(USER_KEY);
        } else {
          raw = memoryFallback[USER_KEY] || null;
        }
      } else {
        raw = await SecureStore.getItemAsync(USER_KEY);
      }
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('SecureStore getUserData error:', error);
      return null;
    }
  },

  async removeUserData(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(USER_KEY);
        }
        delete memoryFallback[USER_KEY];
        return;
      }
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.warn('SecureStore removeUserData error:', error);
    }
  },

  async clearAll(): Promise<void> {
    await this.removeToken();
    await this.removeUserData();
  },
};
