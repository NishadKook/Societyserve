import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { complaintsService } from '@/services/complaints.service';
import { bookingsService } from '@/services/bookings.service';
import { CATEGORY_LABELS, formatDate } from '@/utils/format';
import type { Booking } from '@/types';

export default function NewComplaintScreen() {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [description, setDescription] = useState('');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => bookingsService.list().then((r) => r.data),
  });

  // Only bookings that are completed (against a provider)
  const eligible = bookings?.filter(
    (b) => b.status === 'COMPLETED' || b.status === 'ACCEPTED'
  ) ?? [];

  const mutation = useMutation({
    mutationFn: () => complaintsService.create({
      bookingId: selectedBooking!.id,
      type: 'SAFETY',
      description: description.trim(),
    }),
    onSuccess: () => {
      Alert.alert('Complaint Filed', 'Your complaint has been submitted to the society admin.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Error', msg ?? 'Failed to file complaint');
    },
  });

  const handleSubmit = () => {
    if (!selectedBooking) { Alert.alert('Required', 'Select the booking this complaint is about'); return; }
    if (!description.trim()) { Alert.alert('Required', 'Describe the issue'); return; }
    mutation.mutate();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🚨 Safety complaints are reviewed by your society admin. Use this for serious safety or behaviour issues with service providers.
          </Text>
        </View>

        <Text style={styles.label}>Related Booking</Text>
        {isLoading ? (
          <ActivityIndicator color="#2563EB" />
        ) : eligible.length === 0 ? (
          <Text style={styles.noBookings}>No eligible bookings found</Text>
        ) : (
          <View style={styles.bookingList}>
            {eligible.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.bookingItem, selectedBooking?.id === b.id && styles.bookingItemSelected]}
                onPress={() => setSelectedBooking(b)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingProvider}>{b.provider.fullName}</Text>
                  <Text style={styles.bookingMeta}>
                    {CATEGORY_LABELS[b.provider.serviceCategory]} · {formatDate(b.scheduledAt)}
                  </Text>
                </View>
                {selectedBooking?.id === b.id && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Describe the Issue</Text>
        <TextInput
          style={styles.textarea}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what happened in detail..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Complaint</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 4 },
  infoBox: {
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FCD34D', marginBottom: 8,
  },
  infoText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
  noBookings: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  bookingList: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  bookingItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  bookingItemSelected: { backgroundColor: '#EFF6FF' },
  bookingProvider: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  bookingMeta: { fontSize: 12, color: '#9CA3AF' },
  checkMark: { fontSize: 18, color: '#2563EB', fontWeight: '700' },
  textarea: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, fontSize: 14, color: '#111827', minHeight: 120,
  },
  submitBtn: {
    backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
