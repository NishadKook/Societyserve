export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  items: T[];
}

export interface Stats {
  societies: number;
  tenants: number;
  providers: number;
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  pendingProviderApprovals: number;
  pendingTenantApprovals: number;
}

export interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  pincode: string;
  totalUnits: number;
  isActive: boolean;
  createdAt: string;
  approvedTenants: number;
  approvedProviders: number;
}

export interface User {
  id: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  name: string | null;
}

export interface Booking {
  id: string;
  status: string;
  scheduledAt: string;
  totalAmount: string;
  createdAt: string;
  service: {
    title: string;
    category: string;
  };
  tenant: {
    id: string;
    fullName: string;
    society: { id: string; name: string };
    user: { phone: string };
  };
  provider: {
    id: string;
    fullName: string;
    user: { phone: string };
  };
}

export interface Complaint {
  id: string;
  description: string;
  status: string;
  type: string;
  createdAt: string;
  tenant: {
    fullName: string;
    flatNumber: string;
    society: { name: string };
  };
  provider: {
    fullName: string;
    serviceCategory: string;
  };
  booking: {
    scheduledAt: string;
    totalAmount: string;
  } | null;
}

export interface CreateSocietyData {
  name: string;
  address: string;
  city: string;
  pincode: string;
  totalUnits: number;
}
