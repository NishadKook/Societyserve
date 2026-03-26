import { api } from './api';
import type { Society } from '@/types';

export const societyService = {
  search: (q?: string, city?: string) =>
    api.get<Society[]>('/societies/search', { params: { q, city } }),
};
