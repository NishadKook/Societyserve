import { api } from './api';

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentDto {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const paymentService = {
  createOrder: (bookingId: string) =>
    api.post<CreateOrderResponse>('/payments/create-order', { bookingId }),

  verifyPayment: (dto: VerifyPaymentDto) =>
    api.post<{ success: boolean }>('/payments/verify', dto),
};
