import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalStatus, JobStatus } from '@prisma/client';
import { CreateJobRequestDto } from './dto/create-job-request.dto';
import { SubmitBidDto } from './dto/submit-bid.dto';

const JOB_EXPIRY_HOURS = 24;

@Injectable()
export class JobBoardService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tenant: post a job ──────────────────────────────────────────────────────

  async createJobRequest(tenantUserId: string, dto: CreateJobRequestDto) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');
    if (tenantProfile.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException('Your account is not yet approved');
    }

    const expiresAt = new Date(Date.now() + JOB_EXPIRY_HOURS * 60 * 60 * 1000);

    return this.prisma.jobBoardRequest.create({
      data: {
        tenantId: tenantProfile.id,
        societyId: tenantProfile.societyId,
        category: dto.category,
        description: dto.description,
        timePreference: dto.timePreference,
        photoUrl: dto.photoUrl,
        status: JobStatus.OPEN,
        expiresAt,
      },
    });
  }

  // ── Tenant: view open jobs in their society ─────────────────────────────────

  async listJobRequests(tenantUserId: string) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');
    if (tenantProfile.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException('Your account is not yet approved');
    }

    return this.prisma.jobBoardRequest.findMany({
      where: {
        societyId: tenantProfile.societyId,
        tenantId: tenantProfile.id,
        status: { in: [JobStatus.OPEN, JobStatus.BIDDING] },
        expiresAt: { gt: new Date() },
      },
      include: {
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Tenant: view all bids on a job ──────────────────────────────────────────

  async getJobWithBids(tenantUserId: string, requestId: string) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');

    const job = await this.prisma.jobBoardRequest.findFirst({
      where: { id: requestId, tenantId: tenantProfile.id },
      include: {
        bids: {
          include: {
            provider: {
              select: {
                id: true,
                fullName: true,
                profilePhotoUrl: true,
                avgRating: true,
                totalReviews: true,
                experienceYears: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!job) throw new NotFoundException('Job request not found');
    return job;
  }

  // ── Tenant: select a bid ────────────────────────────────────────────────────

  async selectBid(tenantUserId: string, requestId: string, bidId: string) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');

    const job = await this.prisma.jobBoardRequest.findFirst({
      where: { id: requestId, tenantId: tenantProfile.id },
    });
    if (!job) throw new NotFoundException('Job request not found');
    if (job.status === JobStatus.ASSIGNED) {
      throw new ConflictException('A bid has already been selected for this job');
    }

    const bid = await this.prisma.jobBoardBid.findFirst({
      where: { id: bidId, requestId },
    });
    if (!bid) throw new NotFoundException('Bid not found');

    return this.prisma.$transaction([
      this.prisma.jobBoardBid.update({
        where: { id: bidId },
        data: { isSelected: true },
      }),
      this.prisma.jobBoardRequest.update({
        where: { id: requestId },
        data: { status: JobStatus.ASSIGNED, selectedBidId: bidId },
      }),
    ]);
  }

  // ── Provider: view open jobs in their approved societies ────────────────────

  async listOpenJobsForProvider(providerUserId: string) {
    const providerProfile = await this.prisma.providerProfile.findUnique({
      where: { userId: providerUserId },
      include: {
        societyMemberships: {
          where: { approvalStatus: ApprovalStatus.APPROVED },
          select: { societyId: true },
        },
      },
    });
    if (!providerProfile) throw new NotFoundException('Provider profile not found');

    const societyIds = providerProfile.societyMemberships.map((m) => m.societyId);
    if (societyIds.length === 0) return [];

    return this.prisma.jobBoardRequest.findMany({
      where: {
        societyId: { in: societyIds },
        category: providerProfile.serviceCategory,
        status: { in: [JobStatus.OPEN, JobStatus.BIDDING] },
        expiresAt: { gt: new Date() },
        // Exclude jobs provider already bid on
        bids: { none: { providerId: providerProfile.id } },
      },
      select: {
        id: true,
        description: true,
        photoUrl: true,
        timePreference: true,
        category: true,
        createdAt: true,
        expiresAt: true,
        _count: { select: { bids: true } },
        society: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Provider: submit a bid ──────────────────────────────────────────────────

  async submitBid(providerUserId: string, requestId: string, dto: SubmitBidDto) {
    const providerProfile = await this.prisma.providerProfile.findUnique({
      where: { userId: providerUserId },
    });
    if (!providerProfile) throw new NotFoundException('Provider profile not found');

    const job = await this.prisma.jobBoardRequest.findUnique({
      where: { id: requestId },
      include: {
        society: { select: { id: true } },
      },
    });
    if (!job) throw new NotFoundException('Job request not found');
    if (job.status === JobStatus.ASSIGNED || job.status === JobStatus.EXPIRED) {
      throw new BadRequestException('This job is no longer accepting bids');
    }
    if (new Date() > job.expiresAt) {
      throw new BadRequestException('This job has expired');
    }

    // Verify provider is approved in that society
    const membership = await this.prisma.providerSocietyMembership.findUnique({
      where: {
        providerId_societyId: {
          providerId: providerProfile.id,
          societyId: job.societyId,
        },
      },
    });
    if (!membership || membership.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException('You are not approved in this society');
    }

    const [bid] = await this.prisma.$transaction([
      this.prisma.jobBoardBid.create({
        data: {
          requestId,
          providerId: providerProfile.id,
          price: dto.price,
          estimatedMinutes: dto.estimatedMinutes,
          message: dto.message,
        },
      }),
      this.prisma.jobBoardRequest.update({
        where: { id: requestId },
        data: { status: JobStatus.BIDDING },
      }),
    ]);

    return bid;
  }
}
