import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchSocietiesDto } from './dto/search-societies.dto';
import { CreateSocietyDto } from './dto/create-society.dto';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class SocietiesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchSocietiesDto) {
    return this.prisma.society.findMany({
      where: {
        isActive: true,
        adminUserId: { not: null }, // only list societies with an assigned admin
        ...(dto.city && {
          city: { contains: dto.city, mode: 'insensitive' },
        }),
        ...(dto.q && {
          name: { contains: dto.q, mode: 'insensitive' },
        }),
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        pincode: true,
        totalUnits: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }

  async findById(id: string) {
    const society = await this.prisma.society.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        pincode: true,
        totalUnits: true,
        isActive: true,
      },
    });

    if (!society) throw new NotFoundException('Society not found');
    return society;
  }

  async create(dto: CreateSocietyDto) {
    const existing = await this.prisma.society.findFirst({
      where: { name: dto.name, city: dto.city },
    });
    if (existing) throw new ConflictException('Society already exists in this city');

    return this.prisma.society.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        pincode: dto.pincode,
        totalUnits: dto.totalUnits,
        isActive: false, // ops team activates after verification
      },
    });
  }

  async activate(id: string) {
    await this.findById(id);
    return this.prisma.society.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // Admin approval: tenants
  async getPendingTenants(adminUserId: string, societyId: string) {
    await this.verifyAdmin(adminUserId, societyId);

    return this.prisma.tenantProfile.findMany({
      where: { societyId, approvalStatus: ApprovalStatus.PENDING },
      select: {
        id: true,
        fullName: true,
        flatNumber: true,
        profilePhotoUrl: true,
        createdAt: true,
        user: { select: { phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveTenant(adminUserId: string, societyId: string, tenantProfileId: string) {
    await this.verifyAdmin(adminUserId, societyId);
    return this.updateTenantApproval(tenantProfileId, societyId, ApprovalStatus.APPROVED, adminUserId);
  }

  async rejectTenant(adminUserId: string, societyId: string, tenantProfileId: string) {
    await this.verifyAdmin(adminUserId, societyId);
    return this.updateTenantApproval(tenantProfileId, societyId, ApprovalStatus.REJECTED, adminUserId);
  }

  // Admin approval: providers
  async getPendingProviders(adminUserId: string, societyId: string) {
    await this.verifyAdmin(adminUserId, societyId);

    return this.prisma.providerSocietyMembership.findMany({
      where: { societyId, approvalStatus: ApprovalStatus.PENDING },
      select: {
        id: true,
        createdAt: true,
        provider: {
          select: {
            id: true,
            fullName: true,
            serviceCategory: true,
            profilePhotoUrl: true,
            experienceYears: true,
            avgRating: true,
            user: { select: { phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveProvider(adminUserId: string, societyId: string, membershipId: string) {
    await this.verifyAdmin(adminUserId, societyId);
    return this.updateProviderMembership(membershipId, societyId, ApprovalStatus.APPROVED, adminUserId);
  }

  async rejectProvider(adminUserId: string, societyId: string, membershipId: string) {
    await this.verifyAdmin(adminUserId, societyId);
    return this.updateProviderMembership(membershipId, societyId, ApprovalStatus.REJECTED, adminUserId);
  }

  // Get active tenants list (admin view)
  async getActiveTenants(adminUserId: string, societyId: string) {
    await this.verifyAdmin(adminUserId, societyId);

    return this.prisma.tenantProfile.findMany({
      where: { societyId, approvalStatus: ApprovalStatus.APPROVED },
      select: {
        id: true,
        fullName: true,
        flatNumber: true,
        profilePhotoUrl: true,
        approvedAt: true,
        user: { select: { phone: true } },
      },
      orderBy: { flatNumber: 'asc' },
    });
  }

  // Get active providers list (admin view)
  async getActiveProviders(adminUserId: string, societyId: string) {
    await this.verifyAdmin(adminUserId, societyId);

    return this.prisma.providerSocietyMembership.findMany({
      where: { societyId, approvalStatus: ApprovalStatus.APPROVED },
      select: {
        id: true,
        joinedAt: true,
        provider: {
          select: {
            id: true,
            fullName: true,
            serviceCategory: true,
            profilePhotoUrl: true,
            avgRating: true,
            totalReviews: true,
          },
        },
      },
    });
  }

  async getMySociety(adminUserId: string) {
    const society = await this.prisma.society.findFirst({
      where: { adminUserId },
      select: { id: true, name: true, city: true, address: true, isActive: true },
    });
    if (!society) throw new NotFoundException('No society linked to your account');
    return society;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async verifyAdmin(adminUserId: string, societyId: string): Promise<void> {
    const society = await this.prisma.society.findUnique({
      where: { id: societyId },
    });
    if (!society) throw new NotFoundException('Society not found');
    if (society.adminUserId !== adminUserId) {
      throw new ForbiddenException('You are not the admin of this society');
    }
  }

  private async updateTenantApproval(
    tenantProfileId: string,
    societyId: string,
    status: ApprovalStatus,
    adminUserId: string,
  ) {
    const profile = await this.prisma.tenantProfile.findFirst({
      where: { id: tenantProfileId, societyId },
    });
    if (!profile) throw new NotFoundException('Tenant profile not found');

    return this.prisma.tenantProfile.update({
      where: { id: tenantProfileId },
      data: {
        approvalStatus: status,
        approvedAt: status === ApprovalStatus.APPROVED ? new Date() : null,
        approvedBy: adminUserId,
      },
    });
  }

  private async updateProviderMembership(
    membershipId: string,
    societyId: string,
    status: ApprovalStatus,
    adminUserId: string,
  ) {
    const membership = await this.prisma.providerSocietyMembership.findFirst({
      where: { id: membershipId, societyId },
    });
    if (!membership) throw new NotFoundException('Membership not found');

    return this.prisma.providerSocietyMembership.update({
      where: { id: membershipId },
      data: {
        approvalStatus: status,
        approvedAt: status === ApprovalStatus.APPROVED ? new Date() : null,
        approvedBy: adminUserId,
        joinedAt: status === ApprovalStatus.APPROVED ? new Date() : null,
      },
    });
  }
}
