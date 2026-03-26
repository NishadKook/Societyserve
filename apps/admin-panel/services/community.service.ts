import { api } from '@/lib/api';

export interface CommunityPost {
  id: string;
  content: string;
  photoUrl: string | null;
  isPinned: boolean;
  authorId: string;
  createdAt: string;
  _count: { replies: number };
}

export const communityService = {
  listPosts: (page = 1) =>
    api.get<CommunityPost[]>('/community/posts', { params: { page } }),

  createBroadcast: (content: string) =>
    api.post('/community/posts', { content }),

  pinPost: (postId: string) =>
    api.patch(`/community/posts/${postId}/pin`),

  deletePost: (postId: string) =>
    api.delete(`/community/posts/${postId}`),
};
