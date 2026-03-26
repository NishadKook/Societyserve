import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityService } from '@/services/community.service';
import { formatDate } from '@/utils/format';
import type { CommunityPost } from '@/types';

export default function CommunityScreen() {
  const queryClient = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [content, setContent] = useState('');

  const { data: posts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['communityPosts'],
    queryFn: () => communityService.listPosts().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (text: string) => communityService.createPost(text),
    onSuccess: () => {
      setShowCompose(false);
      setContent('');
      void queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    },
    onError: () => Alert.alert('Error', 'Failed to post'),
  });

  const sorted = posts
    ? [...posts].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
    : [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity style={styles.fab} onPress={() => setShowCompose(true)}>
          <Text style={styles.fabText}>+ Post</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
            </View>
          }
          renderItem={({ item }) => <PostCard post={item} />}
        />
      )}

      {/* Compose Modal */}
      <Modal visible={showCompose} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Post</Text>
              <TouchableOpacity onPress={() => setShowCompose(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textarea}
              value={content}
              onChangeText={setContent}
              placeholder="Share something with your society..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.postBtn, (!content.trim() || createMutation.isPending) && styles.postBtnDisabled]}
              onPress={() => createMutation.mutate(content.trim())}
              disabled={!content.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.postBtnText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function PostCard({ post }: { post: CommunityPost }) {
  const authorName = post.author.tenantProfile?.fullName ?? 'Resident';
  const flat = post.author.tenantProfile?.flatNumber;

  return (
    <TouchableOpacity
      style={[styles.card, post.isPinned && styles.cardPinned]}
      onPress={() => router.push({ pathname: '/community/[postId]', params: { postId: post.id } })}
    >
      {post.isPinned && <Text style={styles.pinBadge}>📌 Pinned</Text>}
      <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text>
      <View style={styles.postMeta}>
        <Text style={styles.postAuthor}>{authorName}{flat ? ` · Flat ${flat}` : ''}</Text>
        <View style={styles.metaRight}>
          <Text style={styles.replyCount}>💬 {post._count.replies}</Text>
          <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  fab: { backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  cardPinned: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },
  pinBadge: { fontSize: 11, color: '#D97706', fontWeight: '600', marginBottom: 8 },
  postContent: { fontSize: 14, color: '#111827', lineHeight: 20, marginBottom: 12 },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postAuthor: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  metaRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  replyCount: { fontSize: 12, color: '#9CA3AF' },
  postDate: { fontSize: 11, color: '#9CA3AF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: { fontSize: 18, color: '#9CA3AF' },
  textarea: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#111827', minHeight: 120, marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  postBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
