'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pin, Trash2, Megaphone, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { communityService, type CommunityPost } from '@/services/community.service';
import { formatDate } from '@/lib/utils';

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const [broadcast, setBroadcast] = useState('');
  const [sending, setSending] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['communityPosts'],
    queryFn: () => communityService.listPosts().then((r) => r.data),
  });

  const pinMutation = useMutation({
    mutationFn: (postId: string) => communityService.pinPost(postId),
    onSuccess: () => {
      toast.success('Post updated');
      void queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => communityService.deletePost(postId),
    onSuccess: () => {
      toast.success('Post deleted');
      void queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    },
  });

  const sendBroadcast = async () => {
    if (!broadcast.trim()) return;
    setSending(true);
    try {
      await communityService.createBroadcast(broadcast);
      setBroadcast('');
      toast.success('Broadcast sent');
      void queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    } catch {
      toast.error('Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Community</h1>
        <p className="text-gray-500 text-sm mt-1">Manage posts and send broadcasts</p>
      </div>

      {/* Broadcast box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-blue-600" />
          <h2 className="font-semibold text-blue-900 text-sm">Send Broadcast</h2>
        </div>
        <textarea
          value={broadcast}
          onChange={(e) => setBroadcast(e.target.value)}
          placeholder="Type an announcement for all tenants..."
          rows={3}
          className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={sendBroadcast}
          disabled={sending || !broadcast.trim()}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send to All Tenants'}
        </button>
      </div>

      {/* Posts list */}
      <div className="max-w-2xl">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm">Recent Posts</h2>

        {isLoading && <div className="text-gray-400 text-sm">Loading...</div>}

        {!isLoading && (!posts || posts.length === 0) && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
            No posts yet
          </div>
        )}

        <div className="space-y-3">
          {posts?.map((post: CommunityPost) => (
            <div
              key={post.id}
              className={`bg-white border rounded-xl p-5 ${post.isPinned ? 'border-amber-300' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {post.isPinned && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mb-2">
                      <Pin className="w-3 h-3" /> Pinned
                    </span>
                  )}
                  <p className="text-gray-900 text-sm">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">{formatDate(post.createdAt)}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MessageSquare className="w-3 h-3" />
                      {post._count.replies} replies
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => pinMutation.mutate(post.id)}
                    disabled={pinMutation.isPending}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-amber-500"
                    title={post.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(post.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                    title="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
