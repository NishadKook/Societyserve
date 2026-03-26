import { useState, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityService } from '@/services/community.service';
import { formatDate } from '@/utils/format';
import type { CommunityReply } from '@/types';

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const inputRef = useRef<TextInput>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => communityService.getPost(postId).then((r) => r.data),
    enabled: !!postId,
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => communityService.createReply(postId, content),
    onSuccess: () => {
      setReply('');
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
    onError: () => Alert.alert('Error', 'Failed to post reply'),
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (!post) {
    return <View style={styles.center}><Text style={styles.errorText}>Post not found</Text></View>;
  }

  const authorName = post.author.tenantProfile?.fullName ?? 'Resident';
  const flat = post.author.tenantProfile?.flatNumber;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={post.replies ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={() => (
            <View style={styles.postCard}>
              {post.isPinned && <Text style={styles.pinBadge}>📌 Pinned</Text>}
              <Text style={styles.postContent}>{post.content}</Text>
              <Text style={styles.postMeta}>
                {authorName}{flat ? ` · Flat ${flat}` : ''} · {formatDate(post.createdAt)}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.noReplies}>No replies yet. Be the first!</Text>}
          renderItem={({ item }) => <ReplyCard reply={item} />}
        />

        {/* Reply input */}
        <View style={styles.replyBar}>
          <TextInput
            ref={inputRef}
            style={styles.replyInput}
            value={reply}
            onChangeText={setReply}
            placeholder="Write a reply..."
            placeholderTextColor="#9CA3AF"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!reply.trim() || replyMutation.isPending) && styles.sendBtnDisabled]}
            onPress={() => replyMutation.mutate(reply.trim())}
            disabled={!reply.trim() || replyMutation.isPending}
          >
            {replyMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReplyCard({ reply }: { reply: CommunityReply }) {
  const name = reply.author.tenantProfile?.fullName ?? 'Resident';
  const flat = reply.author.tenantProfile?.flatNumber;
  return (
    <View style={styles.replyCard}>
      <View style={styles.replyAvatar}>
        <Text style={styles.replyAvatarText}>{name.charAt(0)}</Text>
      </View>
      <View style={styles.replyBody}>
        <Text style={styles.replyAuthor}>{name}{flat ? ` · Flat ${flat}` : ''}</Text>
        <Text style={styles.replyContent}>{reply.content}</Text>
        <Text style={styles.replyDate}>{formatDate(reply.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#9CA3AF', fontSize: 15 },
  list: { padding: 16, gap: 10 },
  postCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  pinBadge: { fontSize: 11, color: '#D97706', fontWeight: '600', marginBottom: 8 },
  postContent: { fontSize: 16, color: '#111827', lineHeight: 24, marginBottom: 12 },
  postMeta: { fontSize: 12, color: '#9CA3AF' },
  noReplies: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, paddingVertical: 24 },
  replyCard: { flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  replyAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  replyAvatarText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  replyBody: { flex: 1 },
  replyAuthor: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },
  replyContent: { fontSize: 14, color: '#111827', lineHeight: 20 },
  replyDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  replyBar: {
    flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', alignItems: 'flex-end',
  },
  replyInput: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827',
    maxHeight: 100, backgroundColor: '#F9FAFB',
  },
  sendBtn: { backgroundColor: '#2563EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
