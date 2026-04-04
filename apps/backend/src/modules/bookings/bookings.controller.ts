import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ── Tenant ──────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created, pending provider acceptance' })
  async createBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.createBooking(user.id, dto);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'List tenant bookings' })
  async listMyBookings(
    @Query() dto: ListBookingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.listTenantBookings(user.id, dto);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark visit as complete — triggers payment' })
  async markComplete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.markComplete(user.id, id);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  async cancelBooking(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.cancelBooking(user.id, id, body?.reason);
  }

  @Patch(':id/reschedule')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reschedule a pending or confirmed booking' })
  async rescheduleBooking(
    @Param('id') id: string,
    @Body() body: { newScheduledAt: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.rescheduleBooking(user.id, id, body.newScheduledAt);
  }

  @Post(':id/report-no-show')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report provider no-show — cancels booking and files complaint' })
  async reportNoShow(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.reportNoShow(user.id, id);
  }

  // ── Provider ────────────────────────────────────────────────────────────────

  @Get('provider/my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'List provider bookings' })
  async listProviderBookings(
    @Query() dto: ListBookingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.listProviderBookings(user.id, dto);
  }

  @Get('provider/earnings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Get provider earnings summary' })
  async getProviderEarnings(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.getProviderEarnings(user.id);
  }

  @Get('provider/transactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Get paginated provider transaction history' })
  async getProviderTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.getProviderTransactions(
      user.id,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(50, Math.max(1, parseInt(limit, 10) || 20)),
    );
  }

  @Patch(':id/mark-arrived')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark arrival at tenant location (CONFIRMED → IN_PROGRESS)' })
  async markArrived(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.markArrived(user.id, id);
  }

  @Patch(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a booking (within 2 hours)' })
  async acceptBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.acceptBooking(user.id, id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a booking' })
  async rejectBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.rejectBooking(user.id, id);
  }

  // ── Public: provider availability for tenant browsing ────────────────────────

  @Get('provider/:providerId/availability')
  @ApiOperation({ summary: 'Get provider blocked dates and recurring slots (tenant browsing, no extra auth)' })
  async getProviderAvailability(@Param('providerId') providerId: string) {
    return this.bookingsService.getProviderAvailability(providerId);
  }

  // ── Shared ──────────────────────────────────────────────────────────────────

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT, UserRole.PROVIDER, UserRole.SOCIETY_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get booking details' })
  async getBookingById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.getBookingById(user.id, user.role, id);
  }
}
