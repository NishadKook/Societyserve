import { api } from './api';
import type { User } from '@/types';

export const userService = {
  getMe: () => api.get<User>('/users/me'),

  createTenantProfile: (data: { fullName: string; flatNumber: string; societyId: string }) =>
    api.post('/users/tenant-profile', data),

  updateTenantProfile: (data: { fullName?: string; flatNumber?: string; profilePhotoUrl?: string }) =>
    api.put('/users/tenant-profile', data),

  deleteAccount: () => api.delete('/users/me'),
};
