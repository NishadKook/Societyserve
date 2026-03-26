import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { bookingsService } from '@/services/bookings.service';
import { formatDate, formatTime, isToday, CATEGORY_LABELS } from '@/utils/format';
import type { Booking } from '@/types';

export default function HomeScreen() {
  const providerProfile = useAuthStore((s) => s.providerProfile);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['providerBookings'],
    queryFn: () => bookingsService.list().then((r) => r.data),
  });

  const pending = bookings?.filter((b) => b.status === 'PENDING') ?? [];
  const todaySchedule = bookings?.filter(
    (b) => b.status === 'CONFIRMED' && isToday(b.scheduledAt)
  ) ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {providerProfile?.fullName?.split(' ')[0] ?? 'there'} 👋</Text>
            <Text style={styles.category}>{CATEGORY_LABELS[providerProfile?.serviceCategory ?? ''] ?? ''}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {providerProfile?.avgRating != null ? Number(providerProfile.avgRating).toFixed(1) : '—'}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pending.length}</Text>
            <Text style={styles.statLabel}>New Requests</Text>
          </View>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Text style={styles.statNumber}>{todaySchedule.length}</Text>
            <Text style={styles.statLabel}>Today's Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{providerProfile?.totalReviews ?? 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {pending.length > 0 && (
          <TouchableOpacity style={styles.alertBanner} onPress={() => router.push('/(tabs)/requests')}>
            <Text style={styles.alertEmoji}>📥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>You have {pending.length} new request{pending.length > 1 ? 's' : ''}!</Text>
              <Text style={styles.alertSub}>Tap to review and accept</Text>
            </View>
            <Text style={styles.alertArrow}>›</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        {isLoading ? (
          <ActivityIndicator color="#16A34A" style={{ marginTop: 20 }} />
        ) : todaySchedule.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>No jobs scheduled for today</Text>
          </View>
        ) : (
          todaySchedule.map((booking) => (
            <TodayJobCard key={booking.id} booking={booking} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TodayJobCard({ booking }: { booking: Booking }) {
  return (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: booking.id } })}
    >
      <View style={styles.jobTime}>
        <Text style={styles.jobTimeText}>{formatTime(booking.scheduledAt)}</Text>
      </View>
      <View style={styles.jobDivider} />
      <View style={{ flex: 1 }}>
        <Text style={styles.jobName}>{booking.tenant.fullName}</Text>
        <Text style={styles.jobFlat}>Flat {booking.tenant.flatNumber}</Text>
        <Text style={styles.jobService}>{booking.service.title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  category: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  ratingBadge: { backgroundColor: '#FEF9C3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#854D0E' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statCardGreen: { backgroundColor: '#DCFCE7' },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEF3C7', marginHorizontal: 20, borderRadius: 14, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#FDE68A' },
  alertEmoji: { fontSize: 24 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  alertSub: { fontSize: 12, color: '#D97706', marginTop: 2 },
  alertArrow: { fontSize: 22, color: '#D97706', fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', paddingHorizontal: 20, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  jobCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  jobTime: { alignItems: 'center', minWidth: 52 },
  jobTimeText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  jobDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  jobName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  jobFlat: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  jobService: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
