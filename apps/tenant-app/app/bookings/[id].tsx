import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, Alert, Modal, TextInput,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings.service';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, formatDate, formatTime } from '@/utils/format';
// Using manual date/time selection (no native picker - Expo Go compatible)

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Cancel with reason state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => bookingsService.cancel(id, reason),
    onSuccess: () => {
      setShowCancelModal(false);
      setCancelReason('');
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

  const rescheduleMutation = useMutation({
    mutationFn: () => {
      const d = new Date();
      d.setDate(d.getDate() + selectedDayOffset);
      d.setHours(selectedHour, selectedMinute, 0, 0);
      return bookingsService.reschedule(id, d.toISOString());
    },
    onSuccess: () => {
      setShowReschedule(false);
      void queryClient.invalidateQueries({ queryKey: ['booking', id] });
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      Alert.alert('Rescheduled', 'Your booking has been rescheduled.');
    },
    onError: () => Alert.alert('Error', 'Could not reschedule booking. The provider may have a conflict at that time.'),
  });

  const noShowMutation = useMutation({
    mutationFn: () => bookingsService.reportNoShow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['booking', id] });
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      Alert.alert('Reported', 'No-show has been reported and a complaint has been filed.');
    },
    onError: () => Alert.alert('Error', 'Could not report no-show'),
  });

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    cancelMutation.mutate(cancelReason.trim() || undefined);
  };

  const handleNoShow = () => {
    Alert.alert(
      'Report No-Show',
      'This will cancel the booking and file a complaint against the provider. Continue?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Report No-Show', style: 'destructive', onPress: () => noShowMutation.mutate() },
      ],
    );
  };

  const handleReschedule = () => {
    if (booking) {
      const d = new Date(booking.scheduledAt);
      setSelectedHour(d.getHours());
      setSelectedMinute(d.getMinutes());
      setSelectedDayOffset(0);
    }
    setShowReschedule(true);
  };

  const getRescheduleDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDayOffset);
    d.setHours(selectedHour, selectedMinute, 0, 0);
    return d;
  };

  const getDayLabel = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const timeSlots = Array.from({ length: 28 }, (_, i) => {
    const hour = Math.floor(i / 2) + 6; // 6 AM to 9 PM
    const minute = (i % 2) * 30;
    if (hour > 21) return null;
    return { hour, minute, label: `${hour > 12 ? hour - 12 : hour}:${minute === 0 ? '00' : '30'} ${hour >= 12 ? 'PM' : 'AM'}` };
  }).filter(Boolean) as { hour: number; minute: number; label: string }[];

  const isScheduledTimePassed = booking ? new Date(booking.scheduledAt) <= new Date() : false;

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
            <Text style={styles.reviewStars}>{'*'.repeat(booking.review.rating)}</Text>
            {booking.review.comment && <Text style={styles.reviewComment}>{booking.review.comment}</Text>}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {/* Reschedule for PENDING/CONFIRMED */}
          {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
            <TouchableOpacity
              style={styles.rescheduleBtn}
              onPress={handleReschedule}
              disabled={rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <Text style={styles.rescheduleBtnText}>Reschedule</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Cancel for PENDING/CONFIRMED */}
          {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
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

          {/* Report No-Show for CONFIRMED bookings where time has passed */}
          {booking.status === 'CONFIRMED' && isScheduledTimePassed && (
            <TouchableOpacity
              style={styles.noShowBtn}
              onPress={handleNoShow}
              disabled={noShowMutation.isPending}
            >
              {noShowMutation.isPending ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Text style={styles.noShowBtnText}>Report No-Show</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Mark complete for CONFIRMED or IN_PROGRESS */}
          {(booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS') && (
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
              <Text style={styles.reviewBtnText}>Leave a Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Cancel with Reason Modal */}
      <Modal visible={showCancelModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason (optional)</Text>

            <TextInput
              style={styles.reasonInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="e.g. Change of plans, found another provider..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.confirmCancelBtn, cancelMutation.isPending && { opacity: 0.6 }]}
              onPress={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmCancelBtnText}>Confirm Cancellation</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelModal} onPress={() => setShowCancelModal(false)}>
              <Text style={styles.cancelModalText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={showReschedule} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reschedule Booking</Text>
            <Text style={styles.modalSubtitle}>Pick a new date and time</Text>

            <Text style={styles.pickerLabel}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {Array.from({ length: 14 }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, selectedDayOffset === i && styles.chipActive]}
                  onPress={() => setSelectedDayOffset(i)}
                >
                  <Text style={[styles.chipText, selectedDayOffset === i && styles.chipTextActive]}>
                    {getDayLabel(i)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.pickerLabel}>Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {timeSlots.map((slot) => {
                const isSelected = selectedHour === slot.hour && selectedMinute === slot.minute;
                return (
                  <TouchableOpacity
                    key={`${slot.hour}-${slot.minute}`}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => { setSelectedHour(slot.hour); setSelectedMinute(slot.minute); }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{slot.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, rescheduleMutation.isPending && { opacity: 0.6 }]}
              onPress={() => {
                const dt = getRescheduleDateTime();
                rescheduleMutation.mutate();
                setRescheduleDate(dt);
              }}
              disabled={rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Confirm Reschedule</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelModal} onPress={() => setShowReschedule(false)}>
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={showReview} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate {booking.provider.fullName}</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Text style={[styles.starBtn, s <= rating && styles.starBtnActive]}>*</Text>
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
  rescheduleBtn: {
    borderWidth: 1, borderColor: '#93C5FD', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', backgroundColor: '#EFF6FF',
  },
  rescheduleBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 15 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFF5F5',
  },
  cancelBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 15 },
  noShowBtn: {
    borderWidth: 1, borderColor: '#F87171', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', backgroundColor: '#FEF2F2',
  },
  noShowBtnText: { color: '#B91C1C', fontWeight: '700', fontSize: 15 },
  completeBtn: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  payBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  reviewBtn: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FCD34D' },
  reviewBtnText: { color: '#D97706', fontWeight: '700', fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  starBtn: { fontSize: 36, opacity: 0.3 },
  starBtnActive: { opacity: 1 },
  reasonInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#111827', minHeight: 80, marginBottom: 16,
  },
  reviewInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#111827', minHeight: 80, marginBottom: 16,
  },
  pickerLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8, marginTop: 4 },
  chipScroll: { marginBottom: 16, maxHeight: 44 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#F3F4F6', marginRight: 8,
  },
  chipActive: { backgroundColor: '#2563EB' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  confirmCancelBtn: { backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  confirmCancelBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelModal: { alignItems: 'center', paddingVertical: 10 },
  cancelModalText: { color: '#9CA3AF', fontSize: 14 },
});
