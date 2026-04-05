import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  ApprovalStatus,
  BookingStatus,
  BookingType,
  UserRole,
  PaymentStatus,
} from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { isRecurringCategory } from '../../common/utils/categories';

const PLATFORM_FEE_PHASE1 = 0; // Free during pilot
const AUTO_ACCEPT_HOURS = 48;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('bookings') private readonly bookingsQueue: Queue,
  ) {}

  // ── Tenant: create booking ──────────────────────────────────────────────────

  async createBooking(tenantUserId: string, dto: CreateBookingDto) {
    // Get tenant profile and verify approved
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');
    if (tenantProfile.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException('Your account is not yet approved by the society admin');
    }

    // Verify service exists and belongs to the provider
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      include: { provider: true },
    });
    if (!service || !service.isActive) throw new NotFoundException('Service not found');
    if (service.providerId !== dto.providerId) {
      throw new BadRequestException('Service does not belong to this provider');
    }

    // Verify provider is approved in tenant's society
    const membership = await this.prisma.providerSocietyMembership.findUnique({
      where: {
        providerId_societyId: {
          providerId: dto.providerId,
          societyId: tenantProfile.societyId,
        },
      },
    });
    if (!membership || membership.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException('This provider is not approved in your society');
    }

    // Check for double-booking conflict (provider)
    const scheduledAt = new Date(dto.scheduledAt);
    const conflictWindow = new Date(scheduledAt.getTime() + service.durationMinutes * 60 * 1000);
    const conflict = await this.prisma.booking.findFirst({
      where: {
        providerId: dto.providerId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        scheduledAt: { gte: scheduledAt, lt: conflictWindow },
      },
    });
    if (conflict) throw new BadRequestException('Provider already has a booking at this time');

    // Validate booking type against service category
    if (isRecurringCategory(service.category)) {
      if (dto.bookingType === BookingType.ONE_TIME) {
        throw new BadRequestException(
          `${service.category} is a recurring category — only RECURRING or TRIAL booking types are allowed`,
        );
      }
    } else {
      if (dto.bookingType !== BookingType.ONE_TIME) {
        throw new BadRequestException(
          `${service.category} is an on-demand category — only ONE_TIME booking type is allowed`,
        );
      }
    }

    if (dto.bookingType === BookingType.RECURRING && !dto.recurrenceRule) {
      throw new BadRequestException('Recurring bookings require a recurrenceRule');
    }

    // For RECURRING: check if weekday+time slot is already taken by another confirmed recurring booking
    if (dto.bookingType === BookingType.RECURRING && dto.recurrenceRule) {
      const newRule = dto.recurrenceRule as { weekdays: number[]; startTime: string; endTime: string };
      const existingRecurring = await this.prisma.booking.findMany({
        where: {
          providerId: dto.providerId,
          bookingType: BookingType.RECURRING,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
        select: { recurrenceRule: true },
      });
      for (const existing of existingRecurring) {
        const rule = existing.recurrenceRule as { weekdays: number[]; startTime: string; endTime: string } | null;
        if (!rule?.weekdays) continue;
        const weekdayOverlap = newRule.weekdays.some((d) => rule.weekdays.includes(d));
        const timeOverlap = newRule.startTime < rule.endTime && newRule.endTime > rule.startTime;
        if (weekdayOverlap && timeOverlap) {
          throw new BadRequestException('This recurring time slot is already booked for this provider');
        }
      }
    }

    // For ONE_TIME: also check if it conflicts with a confirmed recurring booking
    if (dto.bookingType === BookingType.ONE_TIME) {
      const bookingWeekday = scheduledAt.getDay(); // 0=Sun
      const bookingTimeStr = `${String(scheduledAt.getHours()).padStart(2, '0')}:${String(scheduledAt.getMinutes()).padStart(2, '0')}`;
      const endTimeStr = (() => {
        const end = new Date(conflictWindow);
        return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
      })();
      const recurringConflicts = await this.prisma.booking.findMany({
        where: {
          providerId: dto.providerId,
          bookingType: BookingType.RECURRING,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
        select: { recurrenceRule: true },
      });
      for (const existing of recurringConflicts) {
        const rule = existing.recurrenceRule as { weekdays: number[]; startTime: string; endTime: string } | null;
        if (!rule?.weekdays) continue;
        if (rule.weekdays.includes(bookingWeekday) && bookingTimeStr < rule.endTime && endTimeStr > rule.startTime) {
          throw new BadRequestException('This time slot is already taken by a recurring booking for this provider');
        }
      }
    }

    // Pricing: RECURRING → monthlyPrice, TRIAL → trialPrice, ONE_TIME → price
    let workerPrice: number;
    if (dto.bookingType === BookingType.RECURRING) {
      if (service.monthlyPrice == null) {
        throw new BadRequestException('This service does not have a monthly subscription price configured');
      }
      workerPrice = Number(service.monthlyPrice);
    } else if (dto.bookingType === BookingType.TRIAL) {
      if (service.trialPrice == null) {
        throw new BadRequestException('This service does not have a trial price configured');
      }
      workerPrice = Number(service.trialPrice);
    } else {
      workerPrice = Number(service.price);
    }
    const platformFee = PLATFORM_FEE_PHASE1;
    const totalAmount = workerPrice + platformFee;
    const autoAcceptDeadline = new Date(Date.now() + AUTO_ACCEPT_HOURS * 60 * 60 * 1000);

    const booking = await this.prisma.booking.create({
      data: {
        tenantId: tenantProfile.id,
        providerId: dto.providerId,
        serviceId: dto.serviceId,
        societyId: tenantProfile.societyId,
        bookingType: dto.bookingType,
        status: BookingStatus.PENDING,
        scheduledAt,
        workerPrice,
        platformFee,
        totalAmount,
        notes: dto.notes,
        autoAcceptDeadline,
        recurrenceRule: dto.recurrenceRule ? JSON.parse(JSON.stringify(dto.recurrenceRule)) : undefined,
      },
      include: {
        service: { select: { title: true, durationMinutes: true } },
        provider: { select: { fullName: true, serviceCategory: true } },
      },
    });

    // Queue auto-cancel job for 2-hour window
    await this.bookingsQueue.add(
      'auto-cancel',
      { bookingId: booking.id },
      { delay: AUTO_ACCEPT_HOURS * 60 * 60 * 1000, jobId: `auto-cancel-${booking.id}` },
    );

    this.logger.log(`Booking created: ${booking.id}`);
    return booking;
  }

  // ── Provider: accept booking ────────────────────────────────────────────────

  async acceptBooking(providerUserId: string, bookingId: string) {
    const booking = await this.getBookingForProvider(providerUserId, bookingId);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(`Cannot accept a booking in ${booking.status} status`);
    }

    // Remove the auto-cancel job
    const job = await this.bookingsQueue.getJob(`auto-cancel-${bookingId}`);
    if (job) await job.remove();

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });
  }

  // ── Provider: reject booking ────────────────────────────────────────────────

  async rejectBooking(providerUserId: string, bookingId: string) {
    const booking = await this.getBookingForProvider(providerUserId, bookingId);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(`Cannot reject a booking in ${booking.status} status`);
    }

    const job = await this.bookingsQueue.getJob(`auto-cancel-${bookingId}`);
    if (job) await job.remove();

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  // ── Tenant: mark visit complete → triggers payment ──────────────────────────

  async markComplete(tenantUserId: string, bookingId: string) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId: tenantProfile.id },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException('Only confirmed or in-progress bookings can be marked complete');
    }

    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.COMPLETED, completedAt: new Date() },
      }),
      // Append-only payment record — initiated state
      this.prisma.payment.create({
        data: {
          bookingId,
          status: PaymentStatus.INITIATED,
          workerAmount: booking.workerPrice,
          platformAmount: booking.platformFee,
          totalAmount: booking.totalAmount,
        },
      }),
    ]);

    this.logger.log(`Booking completed: ${bookingId} — payment initiated`);
    return updatedBooking;
  }

  // ── Tenant: cancel booking ──────────────────────────────────────────────────

  async cancelBooking(tenantUserId: string, bookingId: string, reason?: string) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId: tenantProfile.id },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const cancellableStatuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException('This booking cannot be cancelled');
    }

    const job = await this.bookingsQueue.getJob(`auto-cancel-${bookingId}`);
    if (job) await job.remove();

    // Store cancellation reason in notes field
    let updatedNotes = booking.notes ?? '';
    if (reason) {
      updatedNotes = updatedNotes
        ? `${updatedNotes}\n[CANCELLED: ${reason}]`
        : `[CANCELLED: ${reason}]`;
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        notes: updatedNotes || booking.notes,
      },
    });
  }

  // ── Tenant: reschedule booking ─────────────────────────────────────────────

  async rescheduleBooking(tenantUserId: string, bookingId: string, newScheduledAt: string) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId: tenantProfile.id },
      include: { service: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const reschedulableStatuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
    if (!reschedulableStatuses.includes(booking.status)) {
      throw new BadRequestException('Only pending or confirmed bookings can be rescheduled');
    }

    const scheduledAt = new Date(newScheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('New time must be in the future');
    }

    // Check for conflicts at new time
    const conflictWindow = new Date(scheduledAt.getTime() + booking.service.durationMinutes * 60 * 1000);
    const conflict = await this.prisma.booking.findFirst({
      where: {
        providerId: booking.providerId,
        id: { not: bookingId },
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        scheduledAt: { gte: scheduledAt, lt: conflictWindow },
      },
    });
    if (conflict) throw new BadRequestException('Provider already has a booking at this time');

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { scheduledAt },
      include: {
        service: { select: { title: true, durationMinutes: true } },
        provider: { select: { fullName: true, serviceCategory: true } },
      },
    });
  }

  // ── Tenant: report no-show ─────────────────────────────────────────────────

  async reportNoShow(tenantUserId: string, bookingId: string) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId: tenantProfile.id },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be reported as no-show');
    }

    if (new Date(booking.scheduledAt) > new Date()) {
      throw new BadRequestException('Cannot report no-show before the scheduled time');
    }

    // Cancel booking and auto-create safety complaint
    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          notes: booking.notes
            ? `${booking.notes}\n[NO-SHOW REPORTED]`
            : '[NO-SHOW REPORTED]',
        },
      }),
      this.prisma.complaint.create({
        data: {
          bookingId,
          tenantId: tenantProfile.id,
          providerId: booking.providerId,
          type: 'SAFETY',
          description: `Provider no-show for booking ${bookingId} scheduled at ${booking.scheduledAt.toISOString()}`,
        },
      }),
    ]);

    this.logger.log(`No-show reported for booking: ${bookingId}`);
    return updatedBooking;
  }

  // ── Provider: mark arrived (CONFIRMED → IN_PROGRESS) ──────────────────────

  async markArrived(providerUserId: string, bookingId: string) {
    const booking = await this.getBookingForProvider(providerUserId, bookingId);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be marked as arrived');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.IN_PROGRESS },
    });
  }

  // ── List bookings ───────────────────────────────────────────────────────────

  async listTenantBookings(tenantUserId: string, dto: ListBookingsDto) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    return this.prisma.booking.findMany({
      where: {
        tenantId: tenantProfile.id,
        ...(dto.status && { status: dto.status }),
      },
      include: {
        service: { select: { title: true, durationMinutes: true } },
        provider: { select: { fullName: true, serviceCategory: true, profilePhotoUrl: true } },
        review: { select: { rating: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async listProviderBookings(providerUserId: string, dto: ListBookingsDto) {
    const providerProfile = await this.prisma.providerProfile.findUnique({
      where: { userId: providerUserId },
    });
    if (!providerProfile) throw new NotFoundException('Provider profile not found');

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    return this.prisma.booking.findMany({
      where: {
        providerId: providerProfile.id,
        ...(dto.status && { status: dto.status }),
      },
      include: {
        service: { select: { title: true, durationMinutes: true } },
        tenant: { select: { fullName: true, flatNumber: true, profilePhotoUrl: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getBookingById(userId: string, role: UserRole, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        tenant: { select: { fullName: true, flatNumber: true, profilePhotoUrl: true, userId: true } },
        provider: { select: { fullName: true, serviceCategory: true, profilePhotoUrl: true, userId: true } },
        payments: true,
        review: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    // Verify ownership
    if (role === UserRole.TENANT && booking.tenant.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    if (role === UserRole.PROVIDER && booking.provider.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return booking;
  }

  // ── Auto-cancel processor (called by BullMQ) ────────────────────────────────

  async processAutoCancel(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status !== BookingStatus.PENDING) return;

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.AUTO_CANCELLED },
    });

    this.logger.log(`Booking auto-cancelled (no provider response): ${bookingId}`);
  }

  // ── Provider availability for tenant browsing (no auth) ──────────────────────

  async getProviderAvailability(providerId: string): Promise<{
    blockedDates: string[];
    recurringSlots: { weekdays: number[]; startTime: string; endTime: string }[];
  }> {
    // Blocked dates (next 60 days)
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setDate(to.getDate() + 60);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    const blockedRows = await this.prisma.providerBlockedDate.findMany({
      where: { providerId, date: { gte: fromStr, lte: toStr } },
      select: { date: true },
    });
    const blockedDates = blockedRows.map((r) => r.date);

    // Confirmed recurring bookings — extract their recurrenceRule
    const recurringBookings = await this.prisma.booking.findMany({
      where: {
        providerId,
        bookingType: BookingType.RECURRING,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        recurrenceRule: { not: {} as never },
      },
      select: { recurrenceRule: true },
    });

    const recurringSlots = recurringBookings
      .map((b) => b.recurrenceRule as { weekdays: number[]; startTime: string; endTime: string } | null)
      .filter((r): r is { weekdays: number[]; startTime: string; endTime: string } => !!r && Array.isArray(r.weekdays));

    return { blockedDates, recurringSlots };
  }

  // ── Provider: earnings summary ───────────────────────────────────────────────

  async getProviderEarnings(providerUserId: string) {
    const providerProfile = await this.prisma.providerProfile.findUnique({
      where: { userId: providerUserId },
    });
    if (!providerProfile) throw new NotFoundException('Provider profile not found');

    const now = new Date();

    // Start of today (midnight local)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Start of this week (Monday)
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);

    // Start of this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, weekAgg, monthAgg, totalAgg] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { providerId: providerProfile.id, status: BookingStatus.COMPLETED, completedAt: { gte: todayStart } },
        _sum: { workerPrice: true },
        _count: true,
      }),
      this.prisma.booking.aggregate({
        where: { providerId: providerProfile.id, status: BookingStatus.COMPLETED, completedAt: { gte: weekStart } },
        _sum: { workerPrice: true },
        _count: true,
      }),
      this.prisma.booking.aggregate({
        where: { providerId: providerProfile.id, status: BookingStatus.COMPLETED, completedAt: { gte: monthStart } },
        _sum: { workerPrice: true },
        _count: true,
      }),
      this.prisma.booking.aggregate({
        where: { providerId: providerProfile.id, status: BookingStatus.COMPLETED },
        _sum: { workerPrice: true },
        _count: true,
      }),
    ]);

    const recentTransactions = await this.prisma.booking.findMany({
      where: { providerId: providerProfile.id, status: BookingStatus.COMPLETED },
      include: {
        tenant: { select: { fullName: true } },
        service: { select: { title: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    return {
      todayEarnings: Number(todayAgg._sum.workerPrice ?? 0),
      todayJobs: todayAgg._count,
      weekEarnings: Number(weekAgg._sum.workerPrice ?? 0),
      weekJobs: weekAgg._count,
      monthEarnings: Number(monthAgg._sum.workerPrice ?? 0),
      monthJobs: monthAgg._count,
      totalEarnings: Number(totalAgg._sum.workerPrice ?? 0),
      totalJobs: totalAgg._count,
      recentTransactions: recentTransactions.map((b) => ({
        bookingId: b.id,
        tenantName: b.tenant.fullName,
        serviceName: b.service.title,
        amount: Number(b.workerPrice),
        date: b.completedAt?.toISOString() ?? b.createdAt.toISOString(),
      })),
    };
  }

  // ── Provider: paginated transactions ────────────────────────────────────────

  async getProviderTransactions(providerUserId: string, page: number, limit: number) {
    const providerProfile = await this.prisma.providerProfile.findUnique({
      where: { userId: providerUserId },
    });
    if (!providerProfile) throw new NotFoundException('Provider profile not found');

    const [transactions, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { providerId: providerProfile.id, status: BookingStatus.COMPLETED },
        include: {
          tenant: { select: { fullName: true } },
          service: { select: { title: true } },
        },
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({
        where: { providerId: providerProfile.id, status: BookingStatus.COMPLETED },
      }),
    ]);

    return {
      transactions: transactions.map((b) => ({
        bookingId: b.id,
        tenantName: b.tenant.fullName,
        serviceName: b.service.title,
        amount: Number(b.workerPrice),
        date: b.completedAt?.toISOString() ?? b.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async getBookingForProvider(providerUserId: string, bookingId: string) {
    const providerProfile = await this.prisma.providerProfile.findUnique({
      where: { userId: providerUserId },
    });
    if (!providerProfile) throw new NotFoundException('Provider profile not found');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, providerId: providerProfile.id },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return booking;
  }
}
