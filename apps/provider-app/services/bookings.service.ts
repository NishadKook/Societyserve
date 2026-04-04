import { api } from './api';
import type { Booking } from '@/types';

export const bookingsService = {
  list: () => api.get<Booking[]>('/bookings/provider/my'),

  getById: (id: string) => api.get<Booking>(`/bookings/${id}`),

  accept: (id: string) => api.patch(`/bookings/${id}/accept`),

  reject: (id: string) => api.patch(`/bookings/${id}/reject`),

  markArrived: (id: string) => api.patch(`/bookings/${id}/mark-arrived`),
};
