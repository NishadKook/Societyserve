import { api } from './api';

export interface EarningsSummary {
  todayEarnings: number;
  todayJobs: number;
  weekEarnings: number;
  weekJobs: number;
  monthEarnings: number;
  monthJobs: number;
  totalEarnings: number;
  totalJobs: number;
  recentTransactions: Transaction[];
}

export interface Transaction {
  bookingId: string;
  tenantName: string;
  serviceName: string;
  amount: number;
  date: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const earningsService = {
  getSummary: () => api.get<EarningsSummary>('/bookings/provider/earnings'),

  getTransactions: (page = 1, limit = 20) =>
    api.get<TransactionsResponse>('/bookings/provider/transactions', {
      params: { page, limit },
    }),
};
