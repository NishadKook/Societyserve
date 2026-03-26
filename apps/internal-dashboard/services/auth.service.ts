import { api } from '@/lib/api';

export const authService = {
  sendOtp: (phone: string) =>
    api.post<{ message: string }>('/auth/send-otp', { phone }),

  verifyOtp: (phone: string, otp: string) =>
    api.post<{
      accessToken: string;
      refreshToken: string;
      isNewUser: boolean;
    }>('/auth/verify-otp', { phone, otp, role: 'SUPER_ADMIN' }),
};
