import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT, UserRole.SOCIETY_ADMIN)
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ── Posts ───────────────────────────────────────────────────────────────────

  @Post('posts')
  @ApiOperation({ summary: 'Create a post (tenant: open board; admin: broadcast)' })
  async createPost(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.createPost(user.id, user.role, dto);
  }

  @Get('posts')
  @ApiOperation({ summary: 'List posts in your society (open board or by group)' })
  async listPosts(
    @Query() dto: ListPostsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.listPosts(user.id, user.role, dto);
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: 'Get a post with its replies' })
  async getPost(
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.getPost(user.id, user.role, postId);
  }

  // ── Admin actions ───────────────────────────────────────────────────────────

  @Patch('posts/:postId/pin')
  @Roles(UserRole.SOCIETY_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle pin on a post (admin only)' })
  async pinPost(
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.pinPost(user.id, postId);
  }

  @Delete('posts/:postId')
  @Roles(UserRole.SOCIETY_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a post (admin only)' })
  async deletePost(
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.deletePost(user.id, postId);
  }

  // ── Replies ─────────────────────────────────────────────────────────────────

  @Post('posts/:postId/replies')
  @ApiOperation({ summary: 'Reply to a post' })
  async createReply(
    @Param('postId') postId: string,
    @Body() dto: CreateReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.createReply(user.id, user.role, postId, dto);
  }

  @Delete('replies/:replyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a reply (own reply or admin)' })
  async deleteReply(
    @Param('replyId') replyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.communityService.deleteReply(user.id, user.role, replyId);
  }
}
