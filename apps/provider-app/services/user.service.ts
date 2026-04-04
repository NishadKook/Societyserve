import { api } from './api';
import type { User } from '@/types';

export const userService = {
  getMe: () => api.get<User>('/users/me'),

  createProviderProfile: (data: {
    fullName: string;
    serviceCategory: string;
    experienceYears: number;
    bio: string;
  }) => api.post('/users/provider-profile', data),

  updateProviderProfile: (data: {
    fullName?: string;
    experienceYears?: number;
    bio?: string;
    profilePhotoUrl?: string;
  }) => api.put('/users/provider-profile', data),

  joinSociety: (societyId: string) =>
    api.post(`/users/provider-profile/join-society/${societyId}`),

  getBlockedDates: () => api.get<{ date: string; reason?: string | null }[]>('/users/provider-profile/blocked-dates'),
  blockDate: (date: string) => api.post('/users/provider-profile/blocked-dates', { date }),
  unblockDate: (date: string) => api.delete(`/users/provider-profile/blocked-dates/${date}`),
};
