import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { providersService } from '@/services/providers.service';
import { useAuthStore } from '@/stores/auth.store';
import { CATEGORY_LABELS } from '@/utils/format';
import type { ProviderMembership, ServiceCategory } from '@/types';

type SortOption = 'rating' | 'price' | 'experience';
type RatingFilter = 0 | 3 | 4;

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'rating', label: 'Rating' },
  { key: 'price', label: 'Price' },
  { key: 'experience', label: 'Experience' },
];

const RATING_OPTIONS: { key: RatingFilter; label: string }[] = [
  { key: 0, label: 'Any' },
  { key: 3, label: '3+' },
  { key: 4, label: '4+' },
];

export default function ProvidersListScreen() {
  const { category } = useLocalSearchParams<{ category: ServiceCategory }>();
  const societyId = useAuthStore((s) => s.tenantProfile?.societyId ?? '');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [minRating, setMinRating] = useState<RatingFilter>(0);

  const filters = useMemo(() => ({
    sortBy,
    minRating: minRating > 0 ? minRating : undefined,
    search: search.trim() || undefined,
  }), [sortBy, minRating, search]);

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['providers', societyId, category, filters],
    queryFn: () => providersService.browse(societyId, category, filters).then((r) => r.data),
    enabled: !!societyId,
  });

  const handleSearchClear = useCallback(() => setSearch(''), []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{CATEGORY_LABELS[category] ?? category}</Text>
        <Text style={styles.sub}>{memberships?.length ?? 0} available</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or keyword..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleSearchClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filtersRow}>
        {/* Sort chips */}
        <View style={styles.chipGroup}>
          <Text style={styles.chipLabel}>Sort:</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, sortBy === opt.key && styles.chipActive]}
              onPress={() => setSortBy(opt.key)}
            >
              <Text style={[styles.chipText, sortBy === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rating chips */}
        <View style={styles.chipGroup}>
          <Text style={styles.chipLabel}>Rating:</Text>
          {RATING_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, minRating === opt.key && styles.chipActive]}
              onPress={() => setMinRating(opt.key)}
            >
              <Text style={[styles.chipText, minRating === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        <FlatList
          data={memberships}
          keyExtractor={(m) => m.provider?.id ?? m.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>
                {search ? `No results for "${search}"` : `No ${CATEGORY_LABELS[category]} available in your society`}
              </Text>
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
      onPress={() => router.push({ pathname: '/providers/[providerId]', params: { providerId: provider.id } })}
    >
      <View style={styles.cardInner}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{provider.fullName.charAt(0)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{provider.fullName}</Text>
          <Text style={styles.exp}>{provider.experienceYears} yr{provider.experienceYears !== 1 ? 's' : ''} experience</Text>
          {provider.bio ? <Text style={styles.bio} numberOfLines={1}>{provider.bio}</Text> : null}
          {provider.hourlyRate != null && (
            <Text style={styles.price}>₹{provider.hourlyRate}/hr</Text>
          )}
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
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

  // Search
  searchContainer: { paddingHorizontal: 16, marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },
  clearBtn: { fontSize: 16, color: '#9CA3AF', paddingLeft: 8 },

  // Filters
  filtersRow: { paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  chipGroup: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginRight: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#fff' },

  // List
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
  price: { fontSize: 12, fontWeight: '600', color: '#059669', marginTop: 2 },
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
