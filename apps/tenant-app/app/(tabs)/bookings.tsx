import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings.service';
import { formatDate, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/utils/format';
import type { Booking, BookingStatus } from '@/types';

const FILTERS: { label: string; value: BookingStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function BookingsScreen() {
  const [filter, setFilter] = useState<BookingStatus | 'ALL'>('ALL');

  const { data: bookings, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => bookingsService.list().then((r) => r.data),
  });

  const filtered = filter === 'ALL'
    ? bookings
    : bookings?.filter((b) => b.status === filter);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {/* Filter tabs */}
      <View>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => f.value}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === item.value && styles.filterChipActive]}
              onPress={() => setFilter(item.value)}
            >
              <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>No bookings yet</Text>
            </View>
          }
          renderItem={({ item }) => <BookingCard booking={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const colors = STATUS_COLORS[booking.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: booking.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{STATUS_LABELS[booking.status]}</Text>
        </View>
        <Text style={styles.date}>{formatDate(booking.scheduledAt)}</Text>
      </View>
      <Text style={styles.providerName}>{booking.provider.fullName}</Text>
      <Text style={styles.category}>{CATEGORY_LABELS[booking.provider.serviceCategory]}</Text>
      <Text style={styles.time}>{new Date(booking.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  filterList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 12, color: '#9CA3AF' },
  providerName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  category: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  time: { fontSize: 13, color: '#374151' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});
