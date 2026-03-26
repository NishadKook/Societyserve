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
import { SocietiesService } from './societies.service';
import { SearchSocietiesDto } from './dto/search-societies.dto';
import { CreateSocietyDto } from './dto/create-society.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Societies')
@Controller('societies')
export class SocietiesController {
  constructor(private readonly societiesService: SocietiesService) {}

  // ── Public endpoints ────────────────────────────────────────────────────────

  @Get('search')
  @ApiOperation({ summary: 'Search societies by name and city (public)' })
  @ApiResponse({ status: 200, description: 'List of matching societies' })
  async search(@Query() dto: SearchSocietiesDto) {
    return this.societiesService.search(dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the society managed by the current admin' })
  async getMySociety(@CurrentUser() user: AuthenticatedUser) {
    return this.societiesService.getMySociety(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get society details by ID (public)' })
  @ApiResponse({ status: 200, description: 'Society details' })
  @ApiResponse({ status: 404, description: 'Society not found' })
  async findById(@Param('id') id: string) {
    return this.societiesService.findById(id);
  }

  // ── Super Admin endpoints ───────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new society (super admin only)' })
  @ApiResponse({ status: 201, description: 'Society created' })
  async create(@Body() dto: CreateSocietyDto) {
    return this.societiesService.create(dto);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a society after verification (super admin only)' })
  async activate(@Param('id') id: string) {
    return this.societiesService.activate(id);
  }

  // ── Society Admin endpoints ─────────────────────────────────────────────────

  @Get(':societyId/tenants/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending tenant approvals for a society' })
  async getPendingTenants(
    @Param('societyId') societyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.societiesService.getPendingTenants(user.id, societyId);
  }

  @Patch(':societyId/tenants/:tenantProfileId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a tenant' })
  async approveTenant(
    @Param('societyId') societyId: string,
    @Param('tenantProfileId') tenantProfileId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.societiesService.approveTenant(user.id, societyId, tenantProfileId);
  }

  @Patch(':societyId/tenants/:tenantProfileId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a tenant' })
  async rejectTenant(
    @Param('societyId') societyId: string,
    @Param('tenantProfileId') tenantProfileId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.societiesService.rejectTenant(user.id, societyId, tenantProfileId);
  }

  @Get(':societyId/providers/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending provider approvals for a society' })
  async getPendingProviders(
    @Param('societyId') societyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.societiesService.getPendingProviders(user.id, societyId);
  }

  @Patch(':societyId/providers/:membershipId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a provider for a society' })
  async approveProvider(
    @Param('societyId') societyId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.societiesService.approveProvider(user.id, societyId, membershipId);
  }

  @Patch(':societyId/providers/:membershipId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a provider for a society' })
  async rejectProvider(
    @Param('societyId') societyId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.societiesService.rejectProvider(user.id, societyId, membershipId);
  }

  @Get(':societyId/tenants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active tenants in a society' })
  async getActiveTenants(
    @Param('societyId') societyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.societiesService.getActiveTenants(user.id, societyId);
  }

  @Get(':societyId/providers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active providers in a society' })
  async getActiveProviders(
    @Param('societyId') societyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.societiesService.getActiveProviders(user.id, societyId);
  }
}
