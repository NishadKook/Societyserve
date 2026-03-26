import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { TenantProfile } from '@/types';

interface AuthState {
  userId: string | null;
  phone: string | null;
  accessToken: string | null;
  tenantProfile: TenantProfile | null;
  isAuthenticated: boolean;

  setAuth: (userId: string, phone: string, accessToken: string, refreshToken: string) => Promise<void>;
  setTenantProfile: (profile: TenantProfile) => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  phone: null,
  accessToken: null,
  tenantProfile: null,
  isAuthenticated: false,

  setAuth: async (userId, phone, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ userId, phone, accessToken, isAuthenticated: true });
  },

  setTenantProfile: (profile) => set({ tenantProfile: profile }),

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ userId: null, phone: null, accessToken: null, tenantProfile: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      try {
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1])) as { sub: string; phone: string };
        set({ userId: payload.sub, phone: payload.phone, accessToken: token, isAuthenticated: true });
      } catch {
        await SecureStore.deleteItemAsync('accessToken');
      }
    }
  },
}));
