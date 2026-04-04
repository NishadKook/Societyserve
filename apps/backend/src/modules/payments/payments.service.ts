import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Razorpay = require('razorpay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: any;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.config.get<string>('RAZORPAY_KEY_ID'),
      key_secret: this.config.get<string>('RAZORPAY_KEY_SECRET'),
    });
    this.webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') ?? '';
  }

  // ── Create Razorpay order for a completed booking ──────────────────────────

  async createOrder(bookingId: string, userId: string) {
    // Verify the booking belongs to this tenant and is COMPLETED
    const tenantProfile = await this.prisma.tenantProfile.findUnique({
      where: { userId },
    });
    if (!tenantProfile) throw new NotFoundException('Tenant profile not found');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId: tenantProfile.id },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Payment can only be initiated for completed bookings');
    }

    // Find the INITIATED payment record (created by markComplete)
    const initiatedPayment = await this.prisma.payment.findFirst({
      where: { bookingId, status: PaymentStatus.INITIATED },
      orderBy: { createdAt: 'desc' },
    });
    if (!initiatedPayment) {
      throw new BadRequestException('No initiated payment found for this booking');
    }

    // Check if an order was already created (look for a payment with razorpayOrderId)
    const existingOrder = await this.prisma.payment.findFirst({
      where: {
        bookingId,
        razorpayOrderId: { not: null },
        status: { in: [PaymentStatus.INITIATED, PaymentStatus.CAPTURED] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existingOrder?.status === PaymentStatus.CAPTURED) {
      throw new BadRequestException('Payment already captured for this booking');
    }
    if (existingOrder?.razorpayOrderId) {
      // Return existing order details so frontend can retry checkout
      return {
        orderId: existingOrder.razorpayOrderId,
        amount: Number(existingOrder.totalAmount) * 100,
        currency: existingOrder.currency,
        bookingId,
      };
    }

    // Create Razorpay order — amount in paise
    const amountInPaise = Math.round(Number(initiatedPayment.totalAmount) * 100);
    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: initiatedPayment.currency,
      receipt: `booking_${bookingId}`,
      notes: { bookingId },
    });

    // Append-only: create new payment record with the Razorpay order ID
    await this.prisma.payment.create({
      data: {
        bookingId,
        razorpayOrderId: order.id,
        status: PaymentStatus.INITIATED,
        workerAmount: initiatedPayment.workerAmount,
        platformAmount: initiatedPayment.platformAmount,
        totalAmount: initiatedPayment.totalAmount,
        currency: initiatedPayment.currency,
      },
    });

    this.logger.log(`Razorpay order created: ${order.id} for booking ${bookingId}`);

    return {
      orderId: order.id,
      amount: amountInPaise,
      currency: initiatedPayment.currency,
      bookingId,
    };
  }

  // ── Verify payment signature (called from frontend after checkout) ─────────

  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    // Find the payment record with this order ID
    const paymentRecord = await this.prisma.payment.findFirst({
      where: { razorpayOrderId, status: PaymentStatus.INITIATED },
      orderBy: { createdAt: 'desc' },
    });
    if (!paymentRecord) {
      throw new NotFoundException('Payment record not found for this order');
    }

    // Check if already captured
    const alreadyCaptured = await this.prisma.payment.findFirst({
      where: { razorpayOrderId, status: PaymentStatus.CAPTURED },
    });
    if (alreadyCaptured) {
      return { status: 'already_captured', paymentId: alreadyCaptured.id };
    }

    // Verify signature: HMAC SHA256 of orderId|paymentId with key_secret
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') ?? '';
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      // Append FAILED record
      await this.prisma.payment.create({
        data: {
          bookingId: paymentRecord.bookingId,
          razorpayOrderId,
          razorpayPaymentId,
          status: PaymentStatus.FAILED,
          workerAmount: paymentRecord.workerAmount,
          platformAmount: paymentRecord.platformAmount,
          totalAmount: paymentRecord.totalAmount,
          currency: paymentRecord.currency,
          failureReason: 'Signature verification failed',
        },
      });

      this.logger.warn(`Payment signature verification failed for order ${razorpayOrderId}`);
      throw new BadRequestException('Payment verification failed: invalid signature');
    }

    // Append CAPTURED record
    const capturedPayment = await this.prisma.payment.create({
      data: {
        bookingId: paymentRecord.bookingId,
        razorpayOrderId,
        razorpayPaymentId,
        status: PaymentStatus.CAPTURED,
        workerAmount: paymentRecord.workerAmount,
        platformAmount: paymentRecord.platformAmount,
        totalAmount: paymentRecord.totalAmount,
        currency: paymentRecord.currency,
      },
    });

    this.logger.log(
      `Payment captured: ${razorpayPaymentId} for booking ${paymentRecord.bookingId}`,
    );

    return { status: 'captured', paymentId: capturedPayment.id };
  }

  // ── Handle Razorpay webhook ────────────────────────────────────────────────

  async handleWebhook(body: any, signature: string) {
    // Validate webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.warn('Webhook signature verification failed');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;
    this.logger.log(`Razorpay webhook received: ${event}`);

    if (event === 'payment.captured') {
      const paymentEntity = body.payload?.payment?.entity;
      if (!paymentEntity) return { status: 'ignored', reason: 'no payment entity' };

      const razorpayOrderId: string = paymentEntity.order_id;
      const razorpayPaymentId: string = paymentEntity.id;

      // Find the INITIATED payment record for this order
      const paymentRecord = await this.prisma.payment.findFirst({
        where: { razorpayOrderId, status: PaymentStatus.INITIATED },
        orderBy: { createdAt: 'desc' },
      });

      if (!paymentRecord) {
        this.logger.warn(`No initiated payment found for webhook order ${razorpayOrderId}`);
        return { status: 'ignored', reason: 'no matching initiated payment' };
      }

      // Check idempotency — already captured?
      const alreadyCaptured = await this.prisma.payment.findFirst({
        where: { razorpayOrderId, status: PaymentStatus.CAPTURED },
      });
      if (alreadyCaptured) {
        this.logger.log(`Payment already captured for order ${razorpayOrderId}, skipping`);
        return { status: 'already_captured' };
      }

      // Append CAPTURED record with webhook payload for audit
      await this.prisma.payment.create({
        data: {
          bookingId: paymentRecord.bookingId,
          razorpayOrderId,
          razorpayPaymentId,
          status: PaymentStatus.CAPTURED,
          workerAmount: paymentRecord.workerAmount,
          platformAmount: paymentRecord.platformAmount,
          totalAmount: paymentRecord.totalAmount,
          currency: paymentRecord.currency,
          webhookPayload: body,
        },
      });

      this.logger.log(
        `Payment captured via webhook: ${razorpayPaymentId} for booking ${paymentRecord.bookingId}`,
      );

      return { status: 'captured' };
    }

    if (event === 'payment.failed') {
      const paymentEntity = body.payload?.payment?.entity;
      if (!paymentEntity) return { status: 'ignored', reason: 'no payment entity' };

      const razorpayOrderId: string = paymentEntity.order_id;
      const razorpayPaymentId: string = paymentEntity.id;
      const failureReason: string =
        paymentEntity.error_description || paymentEntity.error_reason || 'Unknown';

      const paymentRecord = await this.prisma.payment.findFirst({
        where: { razorpayOrderId, status: PaymentStatus.INITIATED },
        orderBy: { createdAt: 'desc' },
      });

      if (!paymentRecord) {
        return { status: 'ignored', reason: 'no matching initiated payment' };
      }

      // Append FAILED record
      await this.prisma.payment.create({
        data: {
          bookingId: paymentRecord.bookingId,
          razorpayOrderId,
          razorpayPaymentId,
          status: PaymentStatus.FAILED,
          workerAmount: paymentRecord.workerAmount,
          platformAmount: paymentRecord.platformAmount,
          totalAmount: paymentRecord.totalAmount,
          currency: paymentRecord.currency,
          failureReason,
          webhookPayload: body,
        },
      });

      this.logger.log(`Payment failed via webhook: ${razorpayPaymentId} — ${failureReason}`);

      return { status: 'failed' };
    }

    return { status: 'ignored', reason: `unhandled event: ${event}` };
  }

  // ── Get payment history for a booking ──────────────────────────────────────

  async getPaymentsByBooking(bookingId: string, userId: string, userRole: string) {
    // Verify the user has access to this booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tenant: { select: { userId: true } },
        provider: { select: { userId: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isTenant = booking.tenant.userId === userId;
    const isProvider = booking.provider.userId === userId;
    if (!isTenant && !isProvider) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return this.prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
