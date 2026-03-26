import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(tenantUserId: string, bookingId: string, dto: CreateReviewDto) {
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId: tenantUserId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId: tenantProfile.id },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed bookings');
    }

    const existing = await this.prisma.review.findUnique({ where: { bookingId } });
    if (existing) throw new ConflictException('You have already reviewed this booking');

    // Create review and update provider's avg rating in a transaction
    const [review] = await this.prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          bookingId,
          tenantId: tenantProfile.id,
          providerId: booking.providerId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });

      // Recalculate avg rating
      const agg = await tx.review.aggregate({
        where: { providerId: booking.providerId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.providerProfile.update({
        where: { id: booking.providerId },
        data: {
          avgRating: agg._avg.rating ?? 0,
          totalReviews: agg._count.rating,
        },
      });

      return [newReview];
    });

    return review;
  }

  async getProviderReviews(providerId: string, page = 1, limit = 20) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      select: { id: true, fullName: true, avgRating: true, totalReviews: true },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const reviews = await this.prisma.review.findMany({
      where: { providerId },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        tenant: { select: { fullName: true, profilePhotoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { provider, reviews };
  }
}
