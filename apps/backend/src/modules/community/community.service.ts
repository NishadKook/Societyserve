import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalStatus, UserRole } from '@prisma/client';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListPostsDto } from './dto/list-posts.dto';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Get society ID for the current user ─────────────────────────────────────

  private async getSocietyIdForUser(userId: string, role: UserRole): Promise<string> {
    if (role === UserRole.TENANT) {
      const profile = await this.prisma.tenantProfile.findUnique({
        where: { userId },
        select: { societyId: true, approvalStatus: true },
      });
      if (!profile) throw new NotFoundException('Tenant profile not found');
      if (profile.approvalStatus !== ApprovalStatus.APPROVED) {
        throw new ForbiddenException('Your account is not yet approved');
      }
      return profile.societyId;
    }

    if (role === UserRole.SOCIETY_ADMIN) {
      const society = await this.prisma.society.findFirst({
        where: { adminUserId: userId },
        select: { id: true },
      });
      if (!society) throw new NotFoundException('No society found for this admin');
      return society.id;
    }

    throw new ForbiddenException('Access denied');
  }

  // ── Posts ───────────────────────────────────────────────────────────────────

  async createPost(userId: string, role: UserRole, dto: CreatePostDto) {
    const societyId = await this.getSocietyIdForUser(userId, role);

    // Only admins can use groupId=null (broadcast); tenants post to open board
    if (role === UserRole.TENANT && !dto.groupId) {
      // posting to open board — allowed
    }

    return this.prisma.communityPost.create({
      data: {
        societyId,
        authorId: userId,
        groupId: dto.groupId ?? null,
        content: dto.content,
        photoUrl: dto.photoUrl,
      },
      include: {
        replies: false,
      },
    });
  }

  async listPosts(userId: string, role: UserRole, dto: ListPostsDto) {
    const societyId = await this.getSocietyIdForUser(userId, role);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    return this.prisma.communityPost.findMany({
      where: {
        societyId,
        isDeleted: false,
        groupId: dto.groupId ?? null,
      },
      select: {
        id: true,
        content: true,
        photoUrl: true,
        isPinned: true,
        authorId: true,
        createdAt: true,
        _count: { select: { replies: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getPost(userId: string, role: UserRole, postId: string) {
    const societyId = await this.getSocietyIdForUser(userId, role);

    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, societyId, isDeleted: false },
      include: {
        replies: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  // ── Admin: pin / delete post ────────────────────────────────────────────────

  async pinPost(adminUserId: string, postId: string) {
    const societyId = await this.getSocietyIdForUser(adminUserId, UserRole.SOCIETY_ADMIN);

    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, societyId, isDeleted: false },
    });
    if (!post) throw new NotFoundException('Post not found');

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    });
  }

  async deletePost(adminUserId: string, postId: string) {
    const societyId = await this.getSocietyIdForUser(adminUserId, UserRole.SOCIETY_ADMIN);

    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, societyId },
    });
    if (!post) throw new NotFoundException('Post not found');

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { isDeleted: true },
    });
  }

  // ── Replies ─────────────────────────────────────────────────────────────────

  async createReply(userId: string, role: UserRole, postId: string, dto: CreateReplyDto) {
    const societyId = await this.getSocietyIdForUser(userId, role);

    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, societyId, isDeleted: false },
    });
    if (!post) throw new NotFoundException('Post not found');

    return this.prisma.communityReply.create({
      data: {
        postId,
        authorId: userId,
        content: dto.content,
      },
    });
  }

  async deleteReply(userId: string, role: UserRole, replyId: string) {
    const reply = await this.prisma.communityReply.findUnique({ where: { id: replyId } });
    if (!reply) throw new NotFoundException('Reply not found');

    // Admin can delete any reply; author can delete their own
    if (role !== UserRole.SOCIETY_ADMIN && reply.authorId !== userId) {
      throw new ForbiddenException('You cannot delete this reply');
    }

    return this.prisma.communityReply.update({
      where: { id: replyId },
      data: { isDeleted: true },
    });
  }
}
