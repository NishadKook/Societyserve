import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Processor('bookings')
export class BookingsProcessor {
  private readonly logger = new Logger(BookingsProcessor.name);

  constructor(private readonly bookingsService: BookingsService) {}

  @Process('auto-cancel')
  async handleAutoCancel(job: Job<{ bookingId: string }>): Promise<void> {
    this.logger.log(`Processing auto-cancel for booking: ${job.data.bookingId}`);
    await this.bookingsService.processAutoCancel(job.data.bookingId);
  }
}
