export type UserRole = 'TENANT' | 'PROVIDER' | 'SOCIETY_ADMIN' | 'SUPER_ADMIN';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type BookingType = 'ONE_TIME' | 'RECURRING';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'AUTO_CANCELLED';
export type ServiceCategory = 'MAID' | 'COOK' | 'CLEANER' | 'ELECTRICIAN' | 'CARPENTER' | 'PLUMBER';

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  providerProfile?: ProviderProfile | null;
}

export interface ProviderProfile {
  id: string;
  fullName: string;
  serviceCategory: ServiceCategory;
  profilePhotoUrl: string | null;
  bio: string | null;
  experienceYears: number;
  avgRating: number;
  totalReviews: number;
  societyMemberships?: ProviderMembership[];
}

export interface ProviderMembership {
  id: string;
  joinedAt: string;
  society: Society;
  approvalStatus: ApprovalStatus;
}

export interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  pincode: string;
  totalUnits: number;
}

export interface Service {
  id: string;
  category: ServiceCategory;
  title: string;
  description: string | null;
  price: string; // Decimal returned as string from Prisma
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingType: BookingType;
  status: BookingStatus;
  scheduledAt: string;
  notes: string | null;
  createdAt: string;
  service: {
    title: string;
    durationMinutes: number;
  };
  tenant: {
    id?: string;
    fullName: string;
    flatNumber: string;
    profilePhotoUrl: string | null;
  };
  review?: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
}
