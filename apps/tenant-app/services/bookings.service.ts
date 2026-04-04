import { api } from './api';
import type { Booking, BookingType } from '@/types';

export interface CreateBookingDto {
  providerId: string;
  societyId: string;
  bookingType: BookingType;
  scheduledAt: string;
  serviceId?: string;
  recurrenceRule?: {
    weekdays: number[];
    startTime: string;
    endTime: string;
  };
  notes?: string;
}

export const bookingsService = {
  list: () => api.get<Booking[]>('/bookings/my'),

  get: (id: string) => api.get<Booking>(`/bookings/${id}`),

  create: (dto: CreateBookingDto) => api.post<Booking>('/bookings', dto),

  cancel: (id: string, reason?: string) => api.patch(`/bookings/${id}/cancel`, { reason }),

  markComplete: (id: string) => api.patch(`/bookings/${id}/complete`),

  reschedule: (id: string, newScheduledAt: string) =>
    api.patch(`/bookings/${id}/reschedule`, { newScheduledAt }),

  reportNoShow: (id: string) => api.post(`/bookings/${id}/report-no-show`),

  submitReview: (bookingId: string, rating: number, comment: string) =>
    api.post(`/reviews/bookings/${bookingId}`, { rating, comment }),
};
