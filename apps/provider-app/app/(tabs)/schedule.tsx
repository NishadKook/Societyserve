import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert, ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings.service';
import { userService } from '@/services/user.service';
import { formatTime, STATUS_LABELS, STATUS_COLORS } from '@/utils/format';
import type { Booking } from '@/types';

// Generate next 60 days
function getDays(): { dateStr: string; dayLabel: string; dayNum: string; monthLabel: string }[] {
  const days = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      dateStr,
      dayLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dayNum: String(d.getDate()),
      monthLabel: d.toLocaleDateString('en-IN', { month: 'short' }),
    });
  }
  return days;
}

const DAYS = getDays();

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(DAYS[0].dateStr);
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['providerBookings'] });
      void queryClient.invalidateQueries({ queryKey: ['blockedDates'] });
    }, [queryClient])
  );

  const { data: bookings, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['providerBookings'],
    queryFn: () => bookingsService.list().then((r) => r.data),
  });

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blockedDates'],
    queryFn: () => userService.getBlockedDates().then((r) => r.data),
  });

  const blockedSet = new Set(blockedDates.map((b) => b.date));

  const bookingsForDay = (dateStr: string) =>
    (bookings ?? []).filter((b) => b.scheduledAt.slice(0, 10) === dateStr);

  const isBlocked = blockedSet.has(selectedDate);

  const handleToggleBlock = () => {
    if (isBlocked) {
      Alert.alert('Unblock Day', `Mark ${selectedDate} as available again?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await userService.unblockDate(selectedDate);
              void queryClient.invalidateQueries({ queryKey: ['blockedDates'] });
            } catch {
              Alert.alert('Error', 'Failed to unblock day');
            }
          },
        },
      ]);
    } else {
      Alert.alert('Block Day', `Mark ${selectedDate} as your day off? Tenants won't be able to see you as available.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block Day',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.blockDate(selectedDate);
              void queryClient.invalidateQueries({ queryKey: ['blockedDates'] });
            } catch {
              Alert.alert('Error', 'Failed to block day');
            }
          },
        },
      ]);
    }
  };

  const dayBookings = bookingsForDay(selectedDate);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Schedule</Text>
      </View>

      {/* Horizontal date strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
      >
        {DAYS.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          const isDayBlocked = blockedSet.has(day.dateStr);
          const hasBkgs = (bookings ?? []).some((b) => b.scheduledAt.slice(0, 10) === day.dateStr);
          return (
            <TouchableOpacity
              key={day.dateStr}
              style={[
                styles.dayChip,
                isSelected && styles.dayChipSelected,
                isDayBlocked && styles.dayChipBlocked,
                isSelected && isDayBlocked && styles.dayChipBlockedSelected,
              ]}
              onPress={() => setSelectedDate(day.dateStr)}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected, isDayBlocked && styles.dayLabelBlocked]}>
                {day.dayLabel}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.dayNumSelected, isDayBlocked && styles.dayNumBlocked]}>
                {day.dayNum}
              </Text>
              <Text style={[styles.monthLabel, isSelected && styles.monthLabelSelected]}>
                {day.monthLabel}
              </Text>
              {hasBkgs && !isDayBlocked && (
                <View style={[styles.dot, isSelected && styles.dotSelected]} />
              )}
              {isDayBlocked && (
                <Text style={styles.blockIcon}>✕</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected day panel */}
      <View style={styles.dayPanel}>
        <View style={styles.dayPanelHeader}>
          <Text style={styles.dayPanelDate}>{selectedDate}</Text>
          <TouchableOpacity
            style={[styles.blockBtn, isBlocked && styles.unblockBtn]}
            onPress={handleToggleBlock}
          >
            <Text style={[styles.blockBtnText, isBlocked && styles.unblockBtnText]}>
              {isBlocked ? 'Unblock Day' : 'Block Day'}
            </Text>
          </TouchableOpacity>
        </View>
        {isBlocked && (
          <View style={styles.blockedBanner}>
            <Text style={styles.blockedBannerText}>🚫 You are off on this day. Tenants cannot book you.</Text>
          </View>
        )}
      </View>

      {/* Bookings for selected day */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></View>
      ) : (
        <FlatList
          data={dayBookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyText}>{isBlocked ? 'Day off' : 'No bookings on this day'}</Text>
            </View>
          }
          renderItem={({ item }) => <ScheduleCard booking={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function ScheduleCard({ booking }: { booking: Booking }) {
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
        <Text style={styles.time}>{formatTime(booking.scheduledAt)}</Text>
      </View>
      <Text style={styles.tenantName}>{booking.tenant.fullName}</Text>
      <Text style={styles.tenantFlat}>Flat {booking.tenant.flatNumber}</Text>
      {booking.review && (
        <View style={styles.reviewRow}>
          <Text style={styles.reviewStars}>{'⭐'.repeat(booking.review.rating)}</Text>
          {booking.review.comment ? (
            <Text style={styles.reviewComment} numberOfLines={1}>"{booking.review.comment}"</Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  dateStrip: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  dayChip: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 52,
    gap: 2,
  },
  dayChipSelected: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  dayChipBlocked: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  dayChipBlockedSelected: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  dayLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  dayLabelSelected: { color: '#fff' },
  dayLabelBlocked: { color: '#DC2626' },
  dayNum: { fontSize: 16, fontWeight: '700', color: '#111827' },
  dayNumSelected: { color: '#fff' },
  dayNumBlocked: { color: '#DC2626' },
  monthLabel: { fontSize: 9, color: '#9CA3AF' },
  monthLabelSelected: { color: '#bbf7d0' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16A34A', marginTop: 2 },
  dotSelected: { backgroundColor: '#fff' },
  blockIcon: { fontSize: 10, color: '#DC2626', fontWeight: '700', marginTop: 2 },
  dayPanel: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayPanelDate: { fontSize: 14, fontWeight: '600', color: '#374151' },
  blockBtn: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  unblockBtn: { backgroundColor: '#DCFCE7' },
  blockBtnText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  unblockBtnText: { color: '#16A34A' },
  blockedBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  blockedBannerText: { fontSize: 12, color: '#DC2626', fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
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
  time: { fontSize: 12, color: '#9CA3AF' },
  tenantName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  tenantFlat: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  reviewStars: { fontSize: 13 },
  reviewComment: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', flex: 1 },
});
