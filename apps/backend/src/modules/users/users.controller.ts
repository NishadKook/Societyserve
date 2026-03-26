import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole, ServiceCategory } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateTenantProfileDto } from './dto/create-tenant-profile.dto';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user with profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.id, user.role);
  }

  // ── Tenant profile ──────────────────────────────────────────────────────────

  @Post('tenant-profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'Create tenant profile and request society approval' })
  @ApiResponse({ status: 201, description: 'Profile created, pending admin approval' })
  @ApiResponse({ status: 409, description: 'Profile already exists or flat taken' })
  async createTenantProfile(
    @Body() dto: CreateTenantProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.createTenantProfile(user.id, dto);
  }

  @Put('tenant-profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tenant profile' })
  async updateTenantProfile(
    @Body() dto: UpdateTenantProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateTenantProfile(user.id, dto);
  }

  // ── Provider profile ────────────────────────────────────────────────────────

  @Post('provider-profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Create provider profile' })
  @ApiResponse({ status: 201, description: 'Profile created' })
  async createProviderProfile(
    @Body() dto: CreateProviderProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.createProviderProfile(user.id, dto);
  }

  @Put('provider-profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update provider profile' })
  async updateProviderProfile(
    @Body() dto: UpdateProviderProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateProviderProfile(user.id, dto);
  }

  // ── Provider: join society ──────────────────────────────────────────────────

  @Post('provider-profile/join-society/:societyId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to join a society (max 5)' })
  @ApiResponse({ status: 200, description: 'Join request submitted' })
  @ApiResponse({ status: 400, description: 'Already in 5 societies' })
  async requestJoinSociety(
    @Param('societyId') societyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.requestJoinSociety(user.id, societyId);
  }

  // ── Tenant: browse providers in their society ───────────────────────────────

  @Get('providers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'Browse approved providers in your society' })
  @ApiQuery({ name: 'category', enum: ServiceCategory, required: false })
  async browseProviders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('category') category?: ServiceCategory,
  ) {
    return this.usersService.browseProviders(user.id, category);
  }

  @Get('providers/:providerId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'Get a single provider profile' })
  async getProvider(@Param('providerId') providerId: string) {
    return this.usersService.getProvider(providerId);
  }

  @Get('providers/:providerId/services')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'Get active services for a provider (tenant booking)' })
  async getProviderServices(@Param('providerId') providerId: string) {
    return this.usersService.getProviderServices(providerId);
  }

  // ── Provider: block/unblock dates ───────────────────────────────────────────

  @Get('provider-profile/blocked-dates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Get my blocked dates (next 90 days)' })
  async getMyBlockedDates(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyBlockedDates(user.id);
  }

  @Post('provider-profile/blocked-dates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Block a date (mark as unavailable)' })
  async blockDate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { date: string; reason?: string },
  ) {
    await this.usersService.blockDate(user.id, body.date, body.reason);
  }

  @Delete('provider-profile/blocked-dates/:date')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a date' })
  async unblockDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date') date: string,
  ) {
    await this.usersService.unblockDate(user.id, date);
  }

  // ── Public: check provider availability for a date (used by tenant app) ─────

  @Get(':providerId/availability')
  @ApiOperation({ summary: 'Check if a provider is blocked on a given date' })
  @ApiQuery({ name: 'date', description: 'YYYY-MM-DD', required: true })
  async getProviderAvailability(
    @Param('providerId') providerId: string,
    @Query('date') date: string,
  ) {
    return this.usersService.getProviderAvailability(providerId, date);
  }
}
