import { api } from './api';
import type { Service } from '@/types';

export const servicesService = {
  list: () => api.get<Service[]>('/services/my'),

  create: (data: {
    category: string;
    title: string;
    description?: string;
    price: number;
    durationMinutes: number;
  }) => api.post<Service>('/services', data),

  update: (id: string, data: {
    title?: string;
    description?: string;
    price?: number;
    durationMinutes?: number;
    isActive?: boolean;
  }) => api.patch<Service>(`/services/${id}`, data),

  remove: (id: string) => api.delete(`/services/${id}`),
};
