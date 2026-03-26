import { api } from './api';

export const authService = {
  sendOtp: (phone: string) =>
    api.post('/auth/send-otp', { phone }),

  verifyOtp: (phone: string, otp: string) =>
    api.post<{ accessToken: string; refreshToken: string }>('/auth/verify-otp', { phone, otp }),
};
