import { api } from './api';
import type { Service, ServiceSchedule } from '@/types';

export const servicesService = {
  list: () => api.get<Service[]>('/services/my'),

  create: (data: {
    category: string;
    title: string;
    description?: string;
    price: number;
    durationMinutes: number;
    monthlyPrice?: number;
    trialPrice?: number;
    schedule?: ServiceSchedule;
  }) => api.post<Service>('/services', data),

  update: (id: string, data: {
    title?: string;
    description?: string;
    price?: number;
    durationMinutes?: number;
    isActive?: boolean;
    monthlyPrice?: number;
    trialPrice?: number;
    schedule?: ServiceSchedule;
  }) => api.patch<Service>(`/services/${id}`, data),

  remove: (id: string) => api.delete(`/services/${id}`),
};
