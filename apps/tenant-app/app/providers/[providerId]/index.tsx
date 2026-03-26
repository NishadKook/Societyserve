import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { providersService } from '@/services/providers.service';
import { CATEGORY_LABELS, formatDate } from '@/utils/format';
import type { Review } from '@/types';

function get60Days() {
  const days: { dateStr: string; dayNum: string; dayLabel: string; monthLabel: string }[] = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: d.toISOString().slice(0, 10),
      dayNum: String(d.getDate()),
      dayLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      monthLabel: d.toLocaleDateString('en-IN', { month: 'short' }),
    });
  }
  return days;
}
const DAYS_60 = get60Days();

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayStatus(
  dateStr: string,
  blockedDates: string[],
  recurringSlots: { weekdays: number[]; startTime: string; endTime: string }[]
): 'blocked' | 'busy' | 'available' {
  if (blockedDates.includes(dateStr)) return 'blocked';
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.getDay();
  if (recurringSlots.some((s) => s.weekdays.includes(weekday))) return 'busy';
  return 'available';
}

export default function ProviderDetailScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();

  const { data: provider, isLoading: loadingProvider } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: () => providersService.getProvider(providerId).then((r) => r.data),
    enabled: !!providerId,
  });

  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['reviews', providerId],
    queryFn: () => providersService.getReviews(providerId).then((r) => r.data),
    enabled: !!providerId,
  });

  const { data: availability } = useQuery({
    queryKey: ['providerAvail', providerId],
    queryFn: () => providersService.getAvailability(providerId).then((r) => r.data),
    enabled: !!providerId,
  });

  if (loadingProvider) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (!provider) {
    return <View style={styles.center}><Text style={styles.errorText}>Provider not found</Text></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Provider header */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{provider.fullName.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{provider.fullName}</Text>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{CATEGORY_LABELS[provider.serviceCategory]}</Text>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>⭐ {Number(provider.avgRating).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>{provider.totalReviews}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statVal}>{provider.experienceYears}y</Text>
              <Text style={styles.statLabel}>Experience</Text>
            </View>
          </View>
          {provider.bio ? <Text style={styles.bio}>{provider.bio}</Text> : null}
        </View>

        {/* Book button */}
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push({ pathname: '/providers/[providerId]/book', params: { providerId } })}
        >
          <Text style={styles.bookBtnText}>📅 Book This Provider</Text>
        </TouchableOpacity>

        {/* 60-day availability */}
        <Text style={styles.sectionTitle}>Availability</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.availStrip}>
          {DAYS_60.map((day) => {
            const status = getDayStatus(
              day.dateStr,
              availability?.blockedDates ?? [],
              availability?.recurringSlots ?? []
            );
            return (
              <View
                key={day.dateStr}
                style={[
                  styles.availDay,
                  status === 'blocked' && styles.availDayBlocked,
                  status === 'busy' && styles.availDayBusy,
                ]}
              >
                <Text style={[styles.availDayLabel, status !== 'available' && styles.availDayLabelDark]}>
                  {day.dayLabel}
                </Text>
                <Text style={[styles.availDayNum, status !== 'available' && styles.availDayNumDark]}>
                  {day.dayNum}
                </Text>
                <Text style={[styles.availMonthLabel]}>
                  {day.monthLabel}
                </Text>
                {status === 'blocked' && <Text style={styles.availStatus}>Off</Text>}
                {status === 'busy' && <Text style={styles.availStatusBusy}>Busy</Text>}
              </View>
            );
          })}
        </ScrollView>
        {(availability?.recurringSlots?.length ?? 0) > 0 && (
          <View style={styles.recurringInfo}>
            <Text style={styles.recurringInfoText}>
              🔁 Recurring slots taken: {availability!.recurringSlots.map(
                (s) => `${s.weekdays.map((w) => WEEKDAY_NAMES[w]).join('/')} ${s.startTime}–${s.endTime}`
              ).join(', ')}
            </Text>
          </View>
        )}

        {/* Reviews */}
        <Text style={styles.sectionTitle}>Reviews</Text>
        {loadingReviews ? (
          <ActivityIndicator color="#2563EB" />
        ) : reviews?.length === 0 ? (
          <Text style={styles.noReviews}>No reviews yet</Text>
        ) : (
          reviews?.map((r) => <ReviewCard key={r.id} review={r} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewStars}>{'⭐'.repeat(review.rating)}</Text>
        <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
      </View>
      {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#9CA3AF', fontSize: 15 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 34, fontWeight: '700', color: '#2563EB' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  catBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 16 },
  catText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  stats: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stat: { alignItems: 'center', paddingHorizontal: 20 },
  statVal: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },
  bio: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginTop: 4 },
  bookBtn: {
    backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 4 },
  noReviews: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewStars: { fontSize: 14 },
  reviewDate: { fontSize: 12, color: '#9CA3AF' },
  reviewComment: { fontSize: 13, color: '#374151', lineHeight: 18 },
  availStrip: { paddingVertical: 8, gap: 6, paddingHorizontal: 0 },
  availDay: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    minWidth: 46,
    gap: 1,
  },
  availDayBlocked: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  availDayBusy: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  availDayLabel: { fontSize: 9, color: '#16A34A', fontWeight: '500' },
  availDayLabelDark: { color: '#374151' },
  availDayNum: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  availDayNumDark: { color: '#111827' },
  availMonthLabel: { fontSize: 8, color: '#9CA3AF' },
  availStatus: { fontSize: 8, color: '#DC2626', fontWeight: '700', marginTop: 1 },
  availStatusBusy: { fontSize: 8, color: '#D97706', fontWeight: '700', marginTop: 1 },
  recurringInfo: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10 },
  recurringInfoText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
});
