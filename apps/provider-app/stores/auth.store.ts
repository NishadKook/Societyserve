import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { ProviderProfile } from '@/types';

interface AuthState {
  userId: string | null;
  phone: string | null;
  accessToken: string | null;
  providerProfile: ProviderProfile | null;
  isAuthenticated: boolean;

  setAuth: (userId: string, phone: string, accessToken: string, refreshToken: string) => Promise<void>;
  setProviderProfile: (profile: ProviderProfile) => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  phone: null,
  accessToken: null,
  providerProfile: null,
  isAuthenticated: false,

  setAuth: async (userId, phone, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('providerAccessToken', accessToken);
    await SecureStore.setItemAsync('providerRefreshToken', refreshToken);
    set({ userId, phone, accessToken, isAuthenticated: true });
  },

  setProviderProfile: (profile) => set({ providerProfile: profile }),

  logout: async () => {
    await SecureStore.deleteItemAsync('providerAccessToken');
    await SecureStore.deleteItemAsync('providerRefreshToken');
    set({ userId: null, phone: null, accessToken: null, providerProfile: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    const token = await SecureStore.getItemAsync('providerAccessToken');
    if (token) {
      try {
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1])) as { sub: string; phone: string };
        set({ userId: payload.sub, phone: payload.phone, accessToken: token, isAuthenticated: true });
      } catch {
        await SecureStore.deleteItemAsync('providerAccessToken');
      }
    }
  },
}));
