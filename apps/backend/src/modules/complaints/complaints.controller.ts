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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ComplaintStatus, UserRole } from '@prisma/client';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Complaints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  // ── Tenant ──────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'Raise a complaint against a provider' })
  async createComplaint(
    @Body() dto: CreateComplaintDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.complaintsService.createComplaint(user.id, dto);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'List my complaints' })
  async listMyComplaints(@CurrentUser() user: AuthenticatedUser) {
    return this.complaintsService.listMyComplaints(user.id);
  }

  // ── Society Admin: safety complaints ───────────────────────────────────────

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN)
  @ApiOperation({ summary: 'List safety complaints for your society (admin only)' })
  async listAdminComplaints(@CurrentUser() user: AuthenticatedUser) {
    return this.complaintsService.listAdminComplaints(user.id);
  }

  // ── Super Admin: ops complaints ─────────────────────────────────────────────

  @Get('ops')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List service and payment complaints (ops team only)' })
  @ApiQuery({ name: 'status', enum: ComplaintStatus, required: false })
  async listOpsComplaints(@Query('status') status?: ComplaintStatus) {
    return this.complaintsService.listOpsComplaints(status);
  }

  // ── Shared ──────────────────────────────────────────────────────────────────

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT, UserRole.SOCIETY_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get complaint details' })
  async getComplaint(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.complaintsService.getComplaint(user.id, user.role, id);
  }

  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SOCIETY_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a complaint' })
  async resolveComplaint(
    @Param('id') id: string,
    @Body() dto: ResolveComplaintDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.complaintsService.resolveComplaint(user.id, user.role, id, dto);
  }
}
