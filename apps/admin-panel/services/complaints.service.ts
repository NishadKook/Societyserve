import { api } from '@/lib/api';

export interface Complaint {
  id: string;
  type: string;
  status: string;
  description: string;
  resolution: string | null;
  createdAt: string;
  tenant: { fullName: string; flatNumber: string };
  provider: { fullName: string; serviceCategory: string };
}

export const complaintsService = {
  listAdminComplaints: () =>
    api.get<Complaint[]>('/complaints/admin'),

  resolveComplaint: (id: string, resolution: string) =>
    api.patch(`/complaints/${id}/resolve`, { resolution }),
};
