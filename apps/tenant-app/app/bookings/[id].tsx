import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings.service';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, formatDate, formatTime } from '@/utils/format';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsService.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['booking', id] });
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      Alert.alert('Cancelled', 'Your booking has been cancelled.');
    },
    onError: () => Alert.alert('Error', 'Could not cancel booking'),
  });

  const completeMutation = useMutation({
    mutationFn: () => bookingsService.markComplete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['booking', id] });
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      Alert.alert('Done!', 'Booking marked as complete.');
    },
    onError: () => Alert.alert('Error', 'Could not mark as complete'),
  });

  const reviewMutation = useMutation({
    mutationFn: () => bookingsService.submitReview(id, rating, comment),
    onSuccess: () => {
      setShowReview(false);
      void queryClient.invalidateQueries({ queryKey: ['booking', id] });
      Alert.alert('Thanks!', 'Your review has been submitted.');
    },
    onError: () => Alert.alert('Error', 'Could not submit review'),
  });

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (!booking) {
    return <View style={styles.center}><Text style={styles.errorText}>Booking not found</Text></View>;
  }

  const colors = STATUS_COLORS[booking.status] ?? { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: colors.bg }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            {STATUS_LABELS[booking.status]}
          </Text>
        </View>

        {/* Provider info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Provider</Text>
          <View style={styles.providerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{booking.provider.fullName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.providerName}>{booking.provider.fullName}</Text>
              <Text style={styles.providerCat}>{CATEGORY_LABELS[booking.provider.serviceCategory]}</Text>
            </View>
          </View>
        </View>

        {/* Booking details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          <Row label="Date" value={formatDate(booking.scheduledAt)} />
          <Row label="Time" value={new Date(booking.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} />
          <Row label="Type" value={booking.bookingType === 'ONE_TIME' ? 'One Time' : 'Recurring'} />
          {booking.notes && <Row label="Notes" value={booking.notes} />}
        </View>

        {/* Existing review */}
        {booking.review && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Review</Text>
            <Text style={styles.reviewStars}>{'⭐'.repeat(booking.review.rating)}</Text>
            {booking.review.comment && <Text style={styles.reviewComment}>{booking.review.comment}</Text>}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {booking.status === 'PENDING' && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Text style={styles.cancelBtnText}>Cancel Booking</Text>
              )}
            </TouchableOpacity>
          )}

          {booking.status === 'CONFIRMED' && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.completeBtnText}>Mark as Complete</Text>
              )}
            </TouchableOpacity>
          )}

          {booking.status === 'COMPLETED' && booking.payment?.status === 'INITIATED' && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => router.push({ pathname: '/payments/checkout' as any, params: { bookingId: booking.id } })}
            >
              <Text style={styles.payBtnText}>Pay Now</Text>
            </TouchableOpacity>
          )}

          {booking.status === 'COMPLETED' && !booking.review && (
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => setShowReview(true)}
            >
              <Text style={styles.reviewBtnText}>⭐ Leave a Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReview} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate {booking.provider.fullName}</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Text style={[styles.starBtn, s <= rating && styles.starBtnActive]}>⭐</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Add a comment (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, reviewMutation.isPending && { opacity: 0.6 }]}
              onPress={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelModal} onPress={() => setShowReview(false)}>
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#9CA3AF', fontSize: 15 },
  statusBanner: { borderRadius: 12, padding: 14, alignItems: 'center' },
  statusText: { fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#2563EB' },
  providerName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  providerCat: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  rowLabel: { fontSize: 13, color: '#9CA3AF' },
  rowValue: { fontSize: 13, fontWeight: '500', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  reviewStars: { fontSize: 20, marginBottom: 8 },
  reviewComment: { fontSize: 13, color: '#374151', lineHeight: 18 },
  actions: { gap: 10, marginTop: 4 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFF5F5',
  },
  cancelBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 15 },
  completeBtn: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  payBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  reviewBtn: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FCD34D' },
  reviewBtnText: { color: '#D97706', fontWeight: '700', fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  starBtn: { fontSize: 36, opacity: 0.3 },
  starBtnActive: { opacity: 1 },
  reviewInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#111827', minHeight: 80, marginBottom: 16,
  },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelModal: { alignItems: 'center', paddingVertical: 10 },
  cancelModalText: { color: '#9CA3AF', fontSize: 14 },
});
