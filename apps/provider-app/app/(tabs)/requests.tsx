import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings.service';
import { formatDate, formatTime } from '@/utils/format';
import type { Booking } from '@/types';

export default function RequestsScreen() {
  const queryClient = useQueryClient();

  const { data: bookings, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['providerBookings'],
    queryFn: () => bookingsService.list().then((r) => r.data),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => bookingsService.accept(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['providerBookings'] });
    },
    onError: () => Alert.alert('Error', 'Failed to accept booking'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => bookingsService.reject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['providerBookings'] });
    },
    onError: () => Alert.alert('Error', 'Failed to reject booking'),
  });

  const pending = bookings?.filter((b) => b.status === 'PENDING') ?? [];

  const handleAccept = (id: string) => {
    Alert.alert('Accept Booking', 'Confirm you will take this job?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => acceptMutation.mutate(id) },
    ]);
  };

  const handleReject = (id: string) => {
    Alert.alert('Decline Request', 'Are you sure you want to decline?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => rejectMutation.mutate(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>New Requests</Text>
        {pending.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>No new requests</Text>
              <Text style={styles.emptyText}>New booking requests will appear here</Text>
            </View>
          }
          renderItem={({ item }) => (
            <RequestCard
              booking={item}
              onAccept={() => handleAccept(item.id)}
              onReject={() => handleReject(item.id)}
              accepting={acceptMutation.isPending && acceptMutation.variables === item.id}
              rejecting={rejectMutation.isPending && rejectMutation.variables === item.id}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function RequestCard({
  booking, onAccept, onReject, accepting, rejecting,
}: {
  booking: Booking;
  onAccept: () => void;
  onReject: () => void;
  accepting: boolean;
  rejecting: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: booking.id } })}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.tenantName}>{booking.tenant.fullName}</Text>
          <Text style={styles.tenantFlat}>Flat {booking.tenant.flatNumber}</Text>
        </View>
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>📅  {formatDate(booking.scheduledAt)}</Text>
        <Text style={styles.timeLabel}>🕐  {formatTime(booking.scheduledAt)} </Text>
      </View>

      {booking.notes ? (
        <Text style={styles.notes} numberOfLines={2}>"{booking.notes}"</Text>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.rejectBtn, rejecting && styles.btnDisabled]}
          onPress={onReject}
          disabled={rejecting || accepting}
        >
          {rejecting ? <ActivityIndicator size="small" color="#DC2626" /> : <Text style={styles.rejectText}>Decline</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptBtn, accepting && styles.btnDisabled]}
          onPress={onAccept}
          disabled={accepting || rejecting}
        >
          {accepting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptText}>Accept Job</Text>}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  countBadge: { backgroundColor: '#DC2626', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FCD34D',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  tenantName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tenantFlat: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  newBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  newBadgeText: { fontSize: 10, fontWeight: '800', color: '#D97706' },
  dateRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  dateLabel: { fontSize: 13, color: '#374151' },
  timeLabel: { fontSize: 13, color: '#374151' },
  notes: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  rejectText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  acceptText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
