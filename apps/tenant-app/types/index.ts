export type UserRole = 'TENANT' | 'PROVIDER' | 'SOCIETY_ADMIN' | 'SUPER_ADMIN';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type BookingType = 'ONE_TIME' | 'RECURRING';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'AUTO_CANCELLED';
export type ServiceCategory = 'MAID' | 'COOK' | 'CLEANER' | 'ELECTRICIAN' | 'CARPENTER' | 'PLUMBER';

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  tenantProfile?: TenantProfile | null;
}

export interface TenantProfile {
  id: string;
  fullName: string;
  flatNumber: string;
  profilePhotoUrl: string | null;
  approvalStatus: ApprovalStatus;
  societyId: string;
}

export interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  pincode: string;
  totalUnits: number;
}

export interface Provider {
  id: string;
  fullName: string;
  serviceCategory: ServiceCategory;
  profilePhotoUrl: string | null;
  bio: string | null;
  experienceYears: number;
  avgRating: number;
  totalReviews: number;
}

export interface ProviderMembership {
  id: string;
  joinedAt: string;
  provider: Provider;
}

export interface Booking {
  id: string;
  bookingType: BookingType;
  status: BookingStatus;
  scheduledAt: string;
  notes: string | null;
  createdAt: string;
  recurrenceRule?: { weekdays: number[]; startTime: string; endTime: string } | null;
  provider: {
    id: string;
    fullName: string;
    serviceCategory: ServiceCategory;
    profilePhotoUrl: string | null;
  };
  service?: { title: string; durationMinutes: number } | null;
  review?: Review | null;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: {
    id: string;
    tenantProfile?: { fullName: string; flatNumber: string } | null;
  };
  _count: { replies: number };
}

export interface CommunityReply {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    tenantProfile?: { fullName: string; flatNumber: string } | null;
  };
}

export interface Complaint {
  id: string;
  description: string;
  status: string;
  createdAt: string;
}
