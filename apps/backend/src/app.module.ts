import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SocietiesModule } from './modules/societies/societies.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommunityModule } from './modules/community/community.module';
import { JobBoardModule } from './modules/job-board/job-board.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { ServicesModule } from './modules/services/services.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.ENVIRONMENT ?? 'development'}`,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SocietiesModule,
    BookingsModule,
    PaymentsModule,
    NotificationsModule,
    CommunityModule,
    JobBoardModule,
    LoyaltyModule,
    ReviewsModule,
    ComplaintsModule,
    ServicesModule,
    AdminModule,
    UploadsModule,
  ],
})
export class AppModule {}
