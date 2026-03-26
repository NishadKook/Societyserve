import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, UserRole } from '@prisma/client';
import { CreateSocietyDto } from '../societies/dto/create-society.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      societies,
      tenants,
      providers,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      pendingProviderApprovals,
      pendingTenantApprovals,
    ] = await Promise.all([
      this.prisma.society.count(),
      this.prisma.user.count({ where: { role: UserRole.TENANT } }),
      this.prisma.user.count({ where: { role: UserRole.PROVIDER } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
      this.prisma.providerSocietyMembership.count({ where: { approvalStatus: 'PENDING' } }),
      this.prisma.tenantProfile.count({ where: { approvalStatus: 'PENDING' } }),
    ]);

    return {
      societies,
      tenants,
      providers,
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      pendingProviderApprovals,
      pendingTenantApprovals,
    };
  }

  async getAllSocieties(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.society.count(),
      this.prisma.society.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              tenantProfiles: { where: { approvalStatus: 'APPROVED' } },
            },
          },
          providerSocietyMemberships: {
            where: { approvalStatus: 'APPROVED' },
            select: { id: true },
          },
        },
      }),
    ]);

    const societies = items.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      city: s.city,
      pincode: s.pincode,
      totalUnits: s.totalUnits,
      isActive: s.isActive,
      createdAt: s.createdAt,
      approvedTenants: s._count.tenantProfiles,
      approvedProviders: s.providerSocietyMemberships.length,
    }));

    return { total, page, limit, items: societies };
  }

  async createSociety(dto: CreateSocietyDto) {
    return this.prisma.society.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        pincode: dto.pincode,
        totalUnits: dto.totalUnits,
      },
    });
  }

  async getAllUsers(role: UserRole | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = role ? { role } : {};

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenantProfile: { select: { fullName: true } },
          providerProfile: { select: { fullName: true } },
        },
      }),
    ]);

    const users = items.map((u) => ({
      id: u.id,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      name: u.tenantProfile?.fullName ?? u.providerProfile?.fullName ?? null,
    }));

    return { total, page, limit, items: users };
  }

  async getAllBookings(status: BookingStatus | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [total, items] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { title: true, category: true } },
          tenant: {
            select: {
              id: true,
              society: { select: { id: true, name: true } },
              user: { select: { phone: true } },
              fullName: true,
            },
          },
          provider: {
            select: {
              id: true,
              user: { select: { phone: true } },
              fullName: true,
            },
          },
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  async deactivateUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, phone: true, role: true, isActive: true },
    });
  }
}
