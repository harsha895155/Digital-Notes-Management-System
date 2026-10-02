import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { SecureStorage } from '../utils/storage';
import { authService } from '../services/authService';
import { setOnUnauthorizedCallback } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserContext: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load stored credentials on launch
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await SecureStorage.getToken();
        const storedUser = await SecureStorage.getUserData();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (error) {
        console.warn('Failed to restore auth session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Hook up automatic logout on 401 from any API call
    setOnUnauthorizedCallback(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authService.login(email.trim(), password);
    setToken(data.token);
    setUser(data.user);
    await SecureStorage.setToken(data.token);
    await SecureStorage.setUserData(data.user);
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => {
    await authService.register(fullName.trim(), email.trim(), password, confirmPassword);
  };

  const logout = async () => {
    try {
      await SecureStorage.clearAll();
    } catch (e) {
      console.warn('Error clearing secure storage on logout:', e);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const updateUserContext = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updatedFields };
      SecureStorage.setUserData(nextUser);
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        updateUserContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
