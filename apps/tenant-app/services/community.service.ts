import { api } from './api';
import type { CommunityPost, CommunityReply } from '@/types';

export const communityService = {
  listPosts: () => api.get<CommunityPost[]>('/community/posts'),

  getPost: (postId: string) =>
    api.get<CommunityPost & { replies: CommunityReply[] }>(`/community/posts/${postId}`),

  createPost: (content: string) => api.post('/community/posts', { content }),

  createReply: (postId: string, content: string) =>
    api.post(`/community/posts/${postId}/replies`, { content }),
};
