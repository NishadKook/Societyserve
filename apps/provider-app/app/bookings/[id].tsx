import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings.service';
import { formatDate, formatTime, STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS } from '@/utils/format';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsService.getById(id).then((r) => r.data),
  });

  const acceptMutation = useMutation({
    mutationFn: () => bookingsService.accept(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['providerBookings'] });
      void queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
    onError: () => Alert.alert('Error', 'Failed to accept booking'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => bookingsService.reject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['providerBookings'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Failed to reject booking'),
  });

  const arrivedMutation = useMutation({
    mutationFn: () => bookingsService.markArrived(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['providerBookings'] });
      void queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
    onError: () => Alert.alert('Error', 'Failed to mark as arrived'),
  });

  const handleAccept = () => {
    Alert.alert('Accept Booking', 'Confirm you will take this job?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => acceptMutation.mutate() },
    ]);
  };

  const handleReject = () => {
    Alert.alert('Decline Booking', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => rejectMutation.mutate() },
    ]);
  };

  const handleArrived = () => {
    Alert.alert("I've Arrived", 'Confirm you have arrived at the location?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => arrivedMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></View>;
  }

  if (!booking) {
    return <View style={styles.center}><Text style={styles.errorText}>Booking not found</Text></View>;
  }

  const colors = STATUS_COLORS[booking.status] ?? { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status */}
      <View style={[styles.statusBanner, { backgroundColor: colors.bg }]}>
        <Text style={[styles.statusText, { color: colors.text }]}>{STATUS_LABELS[booking.status]}</Text>
      </View>

      {/* Tenant info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resident</Text>
        <Text style={styles.mainText}>{booking.tenant.fullName}</Text>
        <Text style={styles.subText}>Flat {booking.tenant.flatNumber}</Text>
      </View>

      {/* Booking details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Job Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{formatDate(booking.scheduledAt)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time</Text>
          <Text style={styles.detailValue}>{formatTime(booking.scheduledAt)} </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>{booking.bookingType === 'RECURRING' ? 'Recurring' : 'One-time'}</Text>
        </View>
        {booking.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.detailLabel}>Notes from resident</Text>
            <Text style={styles.notesText}>"{booking.notes}"</Text>
          </View>
        ) : null}
      </View>

      {/* Review (if completed) */}
      {booking.review && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Review Received</Text>
          <Text style={styles.reviewStars}>{'⭐'.repeat(booking.review.rating)} {booking.review.rating}/5</Text>
          {booking.review.comment ? (
            <Text style={styles.reviewComment}>"{booking.review.comment}"</Text>
          ) : null}
        </View>
      )}

      {/* Actions for PENDING */}
      {booking.status === 'PENDING' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.rejectBtn, rejectMutation.isPending && styles.btnDisabled]}
            onPress={handleReject}
            disabled={rejectMutation.isPending || acceptMutation.isPending}
          >
            {rejectMutation.isPending
              ? <ActivityIndicator size="small" color="#DC2626" />
              : <Text style={styles.rejectText}>Decline</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, acceptMutation.isPending && styles.btnDisabled]}
            onPress={handleAccept}
            disabled={acceptMutation.isPending || rejectMutation.isPending}
          >
            {acceptMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.acceptText}>Accept Job</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Actions for CONFIRMED — mark arrived */}
      {booking.status === 'CONFIRMED' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.arrivedBtn, arrivedMutation.isPending && styles.btnDisabled]}
            onPress={handleArrived}
            disabled={arrivedMutation.isPending}
          >
            {arrivedMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.arrivedText}>I've Arrived</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* In Progress indicator */}
      {booking.status === 'IN_PROGRESS' && (
        <View style={styles.inProgressCard}>
          <Text style={styles.inProgressText}>Work in progress — waiting for tenant to confirm completion</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#9CA3AF', fontSize: 15 },
  statusBanner: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statusText: { fontSize: 15, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  mainText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  detailLabel: { fontSize: 13, color: '#9CA3AF' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  notesBox: { marginTop: 10 },
  notesText: { fontSize: 14, color: '#4B5563', fontStyle: 'italic', marginTop: 4, lineHeight: 20 },
  reviewStars: { fontSize: 18, marginBottom: 6 },
  reviewComment: { fontSize: 14, color: '#4B5563', fontStyle: 'italic', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  rejectText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  acceptText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  arrivedBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  arrivedText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  inProgressCard: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  inProgressText: { color: '#2563EB', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
