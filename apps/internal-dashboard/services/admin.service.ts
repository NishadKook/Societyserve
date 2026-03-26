import { api } from '@/lib/api';
import type {
  Stats,
  Society,
  User,
  Booking,
  Complaint,
  PaginatedResponse,
  CreateSocietyData,
} from '@/types';

export const adminService = {
  getStats: () => api.get<Stats>('/admin/stats'),

  getSocieties: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<Society>>('/admin/societies', {
      params: { page, limit },
    }),

  createSociety: (data: CreateSocietyData) =>
    api.post<Society>('/admin/societies', data),

  getUsers: (role?: string, page = 1, limit = 20) =>
    api.get<PaginatedResponse<User>>('/admin/users', {
      params: { role: role || undefined, page, limit },
    }),

  getBookings: (status?: string, page = 1, limit = 20) =>
    api.get<PaginatedResponse<Booking>>('/admin/bookings', {
      params: { status: status || undefined, page, limit },
    }),

  deactivateUser: (id: string) =>
    api.patch<User>(`/admin/users/${id}/deactivate`),

  getComplaints: (status?: string) =>
    api.get<Complaint[]>('/complaints/ops', {
      params: { status: status || undefined },
    }),
};
