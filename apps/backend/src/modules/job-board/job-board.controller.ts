import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JobBoardService } from './job-board.service';
import { CreateJobRequestDto } from './dto/create-job-request.dto';
import { SubmitBidDto } from './dto/submit-bid.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Job Board')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-board')
export class JobBoardController {
  constructor(private readonly jobBoardService: JobBoardService) {}

  // ── Tenant ──────────────────────────────────────────────────────────────────

  @Post('requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'Post an adhoc job request' })
  async createJobRequest(
    @Body() dto: CreateJobRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobBoardService.createJobRequest(user.id, dto);
  }

  @Get('requests/my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'List my open job requests' })
  async listMyJobRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.jobBoardService.listJobRequests(user.id);
  }

  @Get('requests/:requestId/bids')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'View all bids on a job request' })
  async getJobWithBids(
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobBoardService.getJobWithBids(user.id, requestId);
  }

  @Patch('requests/:requestId/bids/:bidId/select')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Select a bid — tenant chooses, never auto-lowest' })
  async selectBid(
    @Param('requestId') requestId: string,
    @Param('bidId') bidId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobBoardService.selectBid(user.id, requestId, bidId);
  }

  // ── Provider ────────────────────────────────────────────────────────────────

  @Get('requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'View open job requests in my approved societies' })
  async listOpenJobs(@CurrentUser() user: AuthenticatedUser) {
    return this.jobBoardService.listOpenJobsForProvider(user.id);
  }

  @Post('requests/:requestId/bids')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Submit a bid on a job request' })
  async submitBid(
    @Param('requestId') requestId: string,
    @Body() dto: SubmitBidDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jobBoardService.submitBid(user.id, requestId, dto);
  }
}
