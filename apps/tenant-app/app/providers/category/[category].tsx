import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { providersService } from '@/services/providers.service';
import { useAuthStore } from '@/stores/auth.store';
import { CATEGORY_LABELS } from '@/utils/format';
import type { ProviderMembership, ServiceCategory } from '@/types';

export default function ProvidersListScreen() {
  const { category } = useLocalSearchParams<{ category: ServiceCategory }>();
  const societyId = useAuthStore((s) => s.tenantProfile?.societyId ?? '');

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['providers', societyId, category],
    queryFn: () => providersService.browse(societyId, category).then((r) => r.data),
    enabled: !!societyId,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{CATEGORY_LABELS[category] ?? category}</Text>
        <Text style={styles.sub}>{memberships?.length ?? 0} available</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        <FlatList
          data={memberships}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No {CATEGORY_LABELS[category]} available in your society</Text>
            </View>
          }
          renderItem={({ item }) => <ProviderCard membership={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function ProviderCard({ membership }: { membership: ProviderMembership }) {
  const { provider } = membership;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/providers/[providerId]/index', params: { providerId: provider.id } })}
    >
      <View style={styles.cardInner}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{provider.fullName.charAt(0)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{provider.fullName}</Text>
          <Text style={styles.exp}>{provider.experienceYears} yr{provider.experienceYears !== 1 ? 's' : ''} experience</Text>
          {provider.bio ? <Text style={styles.bio} numberOfLines={1}>{provider.bio}</Text> : null}
        </View>
        <View style={styles.ratingBox}>
          <Text style={styles.star}>⭐</Text>
          <Text style={styles.rating}>{Number(provider.avgRating).toFixed(1)}</Text>
          <Text style={styles.reviews}>({provider.totalReviews})</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() => router.push({ pathname: '/providers/[providerId]/book', params: { providerId: provider.id } })}
      >
        <Text style={styles.bookBtnText}>Book Now</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#2563EB' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  exp: { fontSize: 12, color: '#6B7280' },
  bio: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  ratingBox: { alignItems: 'center' },
  star: { fontSize: 16 },
  rating: { fontSize: 16, fontWeight: '700', color: '#111827' },
  reviews: { fontSize: 11, color: '#9CA3AF' },
  bookBtn: {
    backgroundColor: '#2563EB', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },
});
