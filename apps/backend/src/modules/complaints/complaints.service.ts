import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalStatus, ComplaintStatus, ComplaintType, UserRole } from '@prisma/client';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tenant: raise complaint ─────────────────────────────────────────────────

  async createComplaint(tenantUserId: string, dto: CreateComplaintDto) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');
    if (tenantProfile.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException('Your account is not yet approved');
    }

    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: dto.providerId },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    return this.prisma.complaint.create({
      data: {
        tenantId: tenantProfile.id,
        providerId: dto.providerId,
        type: dto.type,
        description: dto.description,
        bookingId: dto.bookingId,
        status: ComplaintStatus.OPEN,
      },
    });
  }

  // ── Tenant: view own complaints ─────────────────────────────────────────────

  async listMyComplaints(tenantUserId: string) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');

    return this.prisma.complaint.findMany({
      where: { tenantId: tenantProfile.id },
      include: {
        provider: { select: { fullName: true, serviceCategory: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Society Admin: view SAFETY complaints for their society ─────────────────

  async listAdminComplaints(adminUserId: string) {
    const society = await this.prisma.society.findFirst({
      where: { adminUserId },
    });
    if (!society) throw new NotFoundException('No society found for this admin');

    // Admin only sees SAFETY complaints for their society
    return this.prisma.complaint.findMany({
      where: {
        type: ComplaintType.SAFETY,
        tenant: { societyId: society.id },
      },
      include: {
        tenant: { select: { fullName: true, flatNumber: true } },
        provider: { select: { fullName: true, serviceCategory: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Super Admin: view SERVICE + PAYMENT complaints (ops team) ───────────────

  async listOpsComplaints(status?: ComplaintStatus) {
    return this.prisma.complaint.findMany({
      where: {
        type: { in: [ComplaintType.SERVICE, ComplaintType.PAYMENT] },
        ...(status && { status }),
      },
      include: {
        tenant: { select: { fullName: true, flatNumber: true, society: { select: { name: true } } } },
        provider: { select: { fullName: true, serviceCategory: true } },
        booking: { select: { scheduledAt: true, totalAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Resolve complaint ───────────────────────────────────────────────────────

  async resolveComplaint(
    resolverId: string,
    role: UserRole,
    complaintId: string,
    dto: ResolveComplaintDto,
  ) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { tenant: { select: { societyId: true } } },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    // Admin can only resolve SAFETY complaints in their society
    if (role === UserRole.SOCIETY_ADMIN) {
      if (complaint.type !== ComplaintType.SAFETY) {
        throw new ForbiddenException('Society admin can only resolve safety complaints');
      }
      const society = await this.prisma.society.findFirst({ where: { adminUserId: resolverId } });
      if (!society || society.id !== complaint.tenant.societyId) {
        throw new ForbiddenException('This complaint is not in your society');
      }
    }

    return this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: ComplaintStatus.RESOLVED,
        resolution: dto.resolution,
        resolvedBy: resolverId,
        resolvedAt: new Date(),
      },
    });
  }

  async getComplaint(userId: string, role: UserRole, complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        tenant: { select: { fullName: true, flatNumber: true, userId: true } },
        provider: { select: { fullName: true, serviceCategory: true } },
        booking: { select: { scheduledAt: true, totalAmount: true } },
      },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (role === UserRole.TENANT && complaint.tenant.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return complaint;
  }
}
