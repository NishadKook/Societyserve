import { api } from '@/lib/api';

export interface TenantApproval {
  id: string;
  fullName: string;
  flatNumber: string;
  profilePhotoUrl: string | null;
  createdAt: string;
  user: { phone: string };
}

export interface ProviderApproval {
  id: string;
  createdAt: string;
  provider: {
    id: string;
    fullName: string;
    serviceCategory: string;
    profilePhotoUrl: string | null;
    experienceYears: number;
    avgRating: string;
    user: { phone: string };
  };
}

export interface ActiveTenant {
  id: string;
  fullName: string;
  flatNumber: string;
  profilePhotoUrl: string | null;
  approvedAt: string;
  user: { phone: string };
}

export interface ActiveProvider {
  id: string;
  joinedAt: string;
  provider: {
    id: string;
    fullName: string;
    serviceCategory: string;
    profilePhotoUrl: string | null;
    avgRating: string;
    totalReviews: number;
  };
}

export const societyService = {
  getPendingTenants: (societyId: string) =>
    api.get<TenantApproval[]>(`/societies/${societyId}/tenants/pending`),

  approveTenant: (societyId: string, tenantProfileId: string) =>
    api.patch(`/societies/${societyId}/tenants/${tenantProfileId}/approve`),

  rejectTenant: (societyId: string, tenantProfileId: string) =>
    api.patch(`/societies/${societyId}/tenants/${tenantProfileId}/reject`),

  getPendingProviders: (societyId: string) =>
    api.get<ProviderApproval[]>(`/societies/${societyId}/providers/pending`),

  approveProvider: (societyId: string, membershipId: string) =>
    api.patch(`/societies/${societyId}/providers/${membershipId}/approve`),

  rejectProvider: (societyId: string, membershipId: string) =>
    api.patch(`/societies/${societyId}/providers/${membershipId}/reject`),

  getActiveTenants: (societyId: string) =>
    api.get<ActiveTenant[]>(`/societies/${societyId}/tenants`),

  getActiveProviders: (societyId: string) =>
    api.get<ActiveProvider[]>(`/societies/${societyId}/providers`),
};
