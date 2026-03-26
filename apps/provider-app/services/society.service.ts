import { api } from './api';
import type { Society } from '@/types';

export const societyService = {
  search: (query: string) =>
    api.get<Society[]>('/societies/search', { params: { q: query } }),
};
