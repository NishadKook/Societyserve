import { api } from './api';
import type { ProviderMembership, Provider, Review } from '@/types';
import type { ServiceCategory } from '@/types';

export interface BrowseFilters {
  societyId: string;
  category?: ServiceCategory;
  minRating?: number;
  maxPrice?: number;
  sortBy?: 'rating' | 'price' | 'experience';
  search?: string;
}

export const providersService = {
  browse: (societyId: string, category?: ServiceCategory, filters?: Omit<BrowseFilters, 'societyId' | 'category'>) =>
    api.get<ProviderMembership[]>('/users/providers', {
      params: {
        societyId,
        category,
        ...filters,
      },
    }),

  getProvider: (providerId: string) =>
    api.get<Provider>(`/users/providers/${providerId}`),

  getReviews: (providerId: string) =>
    api.get<Review[]>(`/reviews/providers/${providerId}`),

  getAvailability: (providerId: string) =>
    api.get<{ blockedDates: string[]; recurringSlots: { weekdays: number[]; startTime: string; endTime: string }[] }>(
      `/bookings/provider/${providerId}/availability`
    ),

  getServices: (providerId: string) =>
    api.get<{ id: string; title: string; description: string; price: string; durationMinutes: number; category: string }[]>(
      `/users/providers/${providerId}/services`
    ),
};
