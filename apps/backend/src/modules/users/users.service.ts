import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, ApprovalStatus, ServiceCategory } from '@prisma/client';
import { CreateTenantProfileDto } from './dto/create-tenant-profile.dto';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { BrowseProvidersDto } from './dto/browse-providers.dto';

const MAX_PROVIDER_SOCIETIES = 5;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantProfile: {
          include: { society: { select: { id: true, name: true, city: true } } },
        },
        providerProfile: {
          include: {
            societyMemberships: {
              include: { society: { select: { id: true, name: true, city: true } } },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Tenant Profile ──────────────────────────────────────────────────────────

  async createTenantProfile(userId: string, dto: CreateTenantProfileDto) {
    const existing = await this.prisma.tenantProfile.findUnique({
      where: { userId },
    });
    if (existing) throw new ConflictException('Tenant profile already exists');

    const society = await this.prisma.society.findUnique({
      where: { id: dto.societyId },
    });
    if (!society || !society.isActive) {
      throw new NotFoundException('Society not found or not active');
    }
    if (!society.adminUserId) {
      throw new BadRequestException('This society does not have an admin yet');
    }

    // Check flat number not already taken in this society
    const flatTaken = await this.prisma.tenantProfile.findUnique({
      where: { societyId_flatNumber: { societyId: dto.societyId, flatNumber: dto.flatNumber } },
    });
    if (flatTaken) throw new ConflictException('This flat number is already registered in the society');

    return this.prisma.tenantProfile.create({
      data: {
        userId,
        societyId: dto.societyId,
        flatNumber: dto.flatNumber,
        fullName: dto.fullName,
        approvalStatus: ApprovalStatus.PENDING,
      },
      include: {
        society: { select: { id: true, name: true, city: true } },
      },
    });
  }

  async updateTenantProfile(userId: string, dto: UpdateTenantProfileDto) {
    const profile = await this.prisma.tenantProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tenant profile not found');

    return this.prisma.tenantProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async getTenantProfile(userId: string) {
    const profile = await this.prisma.tenantProfile.findUnique({
      where: { userId },
      include: {
        society: { select: { id: true, name: true, address: true, city: true } },
      },
    });
    if (!profile) throw new NotFoundException('Tenant profile not found');
    return profile;
  }

  // ── Provider Profile ────────────────────────────────────────────────────────

  async createProviderProfile(userId: string, dto: CreateProviderProfileDto) {
    const existing = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (existing) throw new ConflictException('Provider profile already exists');

    return this.prisma.providerProfile.create({
      data: {
        userId,
        fullName: dto.fullName,
        serviceCategory: dto.serviceCategory,
        hourlyRate: dto.hourlyRate,
        experienceYears: dto.experienceYears ?? 0,
        bio: dto.bio,
        idProofUrl: dto.idProofUrl,
        upiId: dto.upiId,
        bankAccount: dto.bankAccount,
        bankIfsc: dto.bankIfsc,
      },
    });
  }

  async updateProviderProfile(userId: string, dto: UpdateProviderProfileDto) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.providerProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async getProviderProfile(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
      include: {
        societyMemberships: {
          include: { society: { select: { id: true, name: true, city: true } } },
        },
      },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');
    return profile;
  }

  // ── Provider: join society request ─────────────────────────────────────────

  async requestJoinSociety(userId: string, societyId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
      include: { societyMemberships: true },
    });
    if (!profile) throw new NotFoundException('Provider profile not found. Create your profile first.');

    const society = await this.prisma.society.findUnique({ where: { id: societyId } });
    if (!society || !society.isActive) throw new NotFoundException('Society not found or not active');
    if (!society.adminUserId) throw new BadRequestException('This society does not have an admin yet and cannot accept join requests');

    // Max 5 societies rule
    const activeMemberships = profile.societyMemberships.filter(
      (m) => m.approvalStatus !== ApprovalStatus.REJECTED,
    );
    if (activeMemberships.length >= MAX_PROVIDER_SOCIETIES) {
      throw new BadRequestException(`You can join a maximum of ${MAX_PROVIDER_SOCIETIES} societies`);
    }

    // Check not already a member or pending
    const existing = await this.prisma.providerSocietyMembership.findUnique({
      where: { providerId_societyId: { providerId: profile.id, societyId } },
    });
    if (existing) {
      if (existing.approvalStatus === ApprovalStatus.PENDING) {
        throw new ConflictException('Join request already pending for this society');
      }
      if (existing.approvalStatus === ApprovalStatus.APPROVED) {
        throw new ConflictException('Already a member of this society');
      }
      // If rejected, allow re-request by updating
      return this.prisma.providerSocietyMembership.update({
        where: { id: existing.id },
        data: { approvalStatus: ApprovalStatus.PENDING, approvedAt: null, approvedBy: null, joinedAt: null },
      });
    }

    return this.prisma.providerSocietyMembership.create({
      data: {
        providerId: profile.id,
        societyId,
        approvalStatus: ApprovalStatus.PENDING,
      },
    });
  }

  // ── Tenant: browse approved providers in their society ──────────────────────

  async browseProviders(userId: string, dto: BrowseProvidersDto) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({ where: { userId } });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');
    if (tenantProfile.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException('Your account is not yet approved by the society admin');
    }

    const { category, minRating, maxPrice, sortBy, search } = dto;

    // Build provider-level filter
    const providerWhere: Record<string, unknown> = { isAvailable: true };
    if (category) providerWhere.serviceCategory = category;
    if (minRating !== undefined) providerWhere.avgRating = { gte: minRating };
    if (maxPrice !== undefined) providerWhere.hourlyRate = { lte: maxPrice };
    if (search) {
      providerWhere.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build sort order
    let orderBy: Record<string, Record<string, string>> = { provider: { avgRating: 'desc' } };
    if (sortBy === 'price') orderBy = { provider: { hourlyRate: 'asc' } };
    else if (sortBy === 'experience') orderBy = { provider: { experienceYears: 'desc' } };

    return this.prisma.providerSocietyMembership.findMany({
      where: {
        societyId: tenantProfile.societyId,
        approvalStatus: ApprovalStatus.APPROVED,
        provider: providerWhere,
      },
      select: {
        provider: {
          select: {
            id: true,
            fullName: true,
            serviceCategory: true,
            profilePhotoUrl: true,
            bio: true,
            experienceYears: true,
            hourlyRate: true,
            avgRating: true,
            totalReviews: true,
          },
        },
      },
      orderBy,
    });
  }
  async getProvider(providerId: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      select: {
        id: true, fullName: true, serviceCategory: true, profilePhotoUrl: true,
        bio: true, experienceYears: true, hourlyRate: true, avgRating: true, totalReviews: true,
      },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }

  async getProviderServices(providerId: string) {
    return this.prisma.service.findMany({
      where: { providerId, isActive: true },
      select: { id: true, title: true, description: true, price: true, durationMinutes: true, category: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Provider: blocked dates ──────────────────────────────────────────────────

  async getMyBlockedDates(userId: string): Promise<{ date: string; reason?: string | null }[]> {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');

    // Return next 90 days of blocked dates
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setDate(to.getDate() + 90);

    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    return this.prisma.providerBlockedDate.findMany({
      where: { providerId: profile.id, date: { gte: fromStr, lte: toStr } },
      select: { date: true, reason: true },
      orderBy: { date: 'asc' },
    });
  }

  async blockDate(userId: string, date: string, reason?: string): Promise<void> {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Date must be YYYY-MM-DD');

    const today = new Date().toISOString().slice(0, 10);
    if (date < today) throw new BadRequestException('Cannot block past dates');

    await this.prisma.providerBlockedDate.upsert({
      where: { providerId_date: { providerId: profile.id, date } },
      create: { providerId: profile.id, date, reason },
      update: { reason },
    });
  }

  async unblockDate(userId: string, date: string): Promise<void> {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');

    await this.prisma.providerBlockedDate.deleteMany({
      where: { providerId: profile.id, date },
    });
  }

  // ── Delete account (soft delete) ──────────────────────────────────────────

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Soft-delete: deactivate user
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Remove all device tokens
    await this.prisma.deviceToken.deleteMany({ where: { userId } });
  }

  async getProviderAvailability(providerId: string, date: string): Promise<{ isBlocked: boolean }> {
    const profile = await this.prisma.providerProfile.findUnique({ where: { id: providerId } });
    if (!profile) throw new NotFoundException('Provider not found');

    const blocked = await this.prisma.providerBlockedDate.findUnique({
      where: { providerId_date: { providerId, date } },
    });
    return { isBlocked: !!blocked };
  }
}
