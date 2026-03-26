import { api } from './api';

export const complaintsService = {
  create: (data: { bookingId: string; type: string; description: string }) =>
    api.post('/complaints', data),

  listMine: () => api.get('/complaints/my'),
};
