import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings.service';
import { providersService } from '@/services/providers.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatTime } from '@/utils/format';
import type { BookingType } from '@/types';

const BOOKING_TYPES: { value: BookingType; label: string; desc: string }[] = [
  { value: 'ONE_TIME', label: 'One Time', desc: 'Single visit' },
  { value: 'RECURRING', label: 'Recurring', desc: 'Regular schedule' },
];

const WEEKDAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

// Build next 30 days for date picker
function buildDays() {
  const days: { label: string; iso: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    days.push({ label, iso });
  }
  return days;
}
const DAYS_30 = buildDays();

// 30-min time slots from 5:00 to 22:30
const TIME_SLOTS: string[] = [];
for (let h = 5; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

function stepSlot(current: string, dir: 1 | -1, setter: (v: string) => void) {
  const idx = TIME_SLOTS.indexOf(current);
  const next = idx + dir;
  if (next >= 0 && next < TIME_SLOTS.length) setter(TIME_SLOTS[next]);
}

function stepDay(current: string, dir: 1 | -1, setter: (v: string) => void) {
  const idx = DAYS_30.findIndex((d) => d.iso === current);
  const next = idx + dir;
  if (next >= 0 && next < DAYS_30.length) setter(DAYS_30[next].iso);
}

export default function BookScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const societyId = useAuthStore((s) => s.tenantProfile?.societyId ?? '');
  const queryClient = useQueryClient();

  const [bookingType, setBookingType] = useState<BookingType>('ONE_TIME');

  // ONE_TIME state (pure-JS)
  const [selectedDate, setSelectedDate] = useState(DAYS_30[1]?.iso ?? DAYS_30[0].iso); // tomorrow
  const [startSlot, setStartSlot] = useState('09:00');
  const [endSlot, setEndSlot] = useState('10:00');

  // RECURRING state (pure-JS)
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [recurStartSlot, setRecurStartSlot] = useState('07:00');
  const [recurEndSlot, setRecurEndSlot] = useState('08:00');

  const [notes, setNotes] = useState('');

  const { data: availability } = useQuery({
    queryKey: ['providerAvail', providerId],
    queryFn: () => providersService.getAvailability(providerId).then((r) => r.data),
    enabled: !!providerId,
  });

  const { data: services } = useQuery({
    queryKey: ['providerServices', providerId],
    queryFn: () => providersService.getServices(providerId).then((r) => r.data),
    enabled: !!providerId,
  });
  const serviceId = services?.[0]?.id;

  const isDateBlocked = (availability?.blockedDates ?? []).includes(selectedDate);
  const isWeekdayBlocked = (weekday: number) =>
    (availability?.recurringSlots ?? []).some((s) => s.weekdays.includes(weekday));

  const toggleWeekday = (val: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (bookingType === 'ONE_TIME') {
        const [sh, sm] = startSlot.split(':').map(Number);
        const scheduled = new Date(`${selectedDate}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`);
        return bookingsService.create({
          providerId,
          serviceId: serviceId!,
          societyId,
          bookingType: 'ONE_TIME',
          scheduledAt: scheduled.toISOString(),
          notes: notes.trim() || undefined,
        });
      } else {
        const [rh, rm] = recurStartSlot.split(':').map(Number);
        const today = new Date();
        const sortedDays = [...selectedWeekdays].sort();
        const todayDay = today.getDay();
        const nextDay = sortedDays.find((d) => d >= todayDay) ?? sortedDays[0];
        const daysToAdd = (nextDay - todayDay + 7) % 7 || 7;
        const firstDate = new Date(today);
        firstDate.setDate(today.getDate() + daysToAdd);
        firstDate.setHours(rh, rm, 0, 0);

        return bookingsService.create({
          providerId,
          serviceId: serviceId!,
          societyId,
          bookingType: 'RECURRING',
          scheduledAt: firstDate.toISOString(),
          recurrenceRule: {
            weekdays: selectedWeekdays,
            startTime: recurStartSlot,
            endTime: recurEndSlot,
          },
          notes: notes.trim() || undefined,
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      Alert.alert('Booked!', 'Your booking request has been sent to the provider.', [
        { text: 'View Bookings', onPress: () => router.replace('/(tabs)/bookings') },
      ]);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Booking Failed', msg ?? 'Could not create booking. Please try again.');
    },
  });

  const handleBook = () => {
    if (!serviceId) {
      Alert.alert('Not Available', 'This provider has no active services yet.');
      return;
    }
    if (bookingType === 'ONE_TIME') {
      if (isDateBlocked) {
        Alert.alert('Provider Unavailable', 'This provider has marked this day as unavailable.');
        return;
      }
      if (startSlot >= endSlot) {
        Alert.alert('Invalid Time', 'End time must be after start time.');
        return;
      }
    } else {
      if (selectedWeekdays.length === 0) {
        Alert.alert('Select Days', 'Please select at least one day for the recurring schedule.');
        return;
      }
      if (recurStartSlot >= recurEndSlot) {
        Alert.alert('Invalid Time', 'End time must be after start time.');
        return;
      }
    }
    mutation.mutate();
  };

  const currentDayLabel = DAYS_30.find((d) => d.iso === selectedDate)?.label ?? selectedDate;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Booking type */}
        <Text style={styles.label}>Booking Type</Text>
        <View style={styles.typeRow}>
          {BOOKING_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeCard, bookingType === t.value && styles.typeCardActive]}
              onPress={() => setBookingType(t.value)}
            >
              <Text style={[styles.typeLabel, bookingType === t.value && styles.typeLabelActive]}>{t.label}</Text>
              <Text style={[styles.typeDesc, bookingType === t.value && styles.typeDescActive]}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {bookingType === 'ONE_TIME' ? (
          <>
            {/* Date stepper */}
            <Text style={styles.label}>Date</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepDay(selectedDate, -1, setSelectedDate)}>
                <Text style={styles.stepBtnText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.stepCenter}>
                <Text style={styles.stepValue}>📅 {currentDayLabel}</Text>
                {isDateBlocked && <Text style={styles.blockedLabel}>Provider unavailable</Text>}
              </View>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepDay(selectedDate, 1, setSelectedDate)}>
                <Text style={styles.stepBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Start time */}
            <Text style={styles.label}>Start Time</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepSlot(startSlot, -1, setStartSlot)}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>🕐 {formatTime(startSlot)}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepSlot(startSlot, 1, setStartSlot)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* End time */}
            <Text style={styles.label}>End Time</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepSlot(endSlot, -1, setEndSlot)}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>🕐 {formatTime(endSlot)}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepSlot(endSlot, 1, setEndSlot)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Weekday selector */}
            <Text style={styles.label}>Days of the Week</Text>
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((wd) => {
                const taken = isWeekdayBlocked(wd.value);
                const selected = selectedWeekdays.includes(wd.value);
                return (
                  <TouchableOpacity
                    key={String(wd.value)}
                    style={[
                      styles.weekdayChip,
                      selected ? styles.weekdayChipSelected : null,
                      taken ? styles.weekdayChipTaken : null,
                    ]}
                    onPress={() => { if (!taken) toggleWeekday(wd.value); }}
                  >
                    <Text style={[
                      styles.weekdayChipText,
                      selected ? styles.weekdayChipTextSelected : null,
                      taken ? styles.weekdayChipTextTaken : null,
                    ]}>
                      {wd.label}
                    </Text>
                    {taken ? <Text style={styles.takenLabel}>Taken</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hint}>Grey days already booked by another resident</Text>

            {/* Recurring start time */}
            <Text style={styles.label}>Start Time</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepSlot(recurStartSlot, -1, setRecurStartSlot)}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{formatTime(recurStartSlot)}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepSlot(recurStartSlot, 1, setRecurStartSlot)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Recurring end time */}
            <Text style={styles.label}>End Time</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepSlot(recurEndSlot, -1, setRecurEndSlot)}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{formatTime(recurEndSlot)}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepSlot(recurEndSlot, 1, setRecurEndSlot)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recurringNote}>
              <Text style={styles.recurringNoteText}>
                🔁 {selectedWeekdays.map((d) => WEEKDAYS.find((w) => w.value === d)?.label).join(', ')} · {formatTime(recurStartSlot)}–{formatTime(recurEndSlot)} every week
              </Text>
            </View>
          </>
        )}

        {/* Notes */}
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={styles.textarea}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special instructions..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.bookBtn, (mutation.isPending || isDateBlocked || !serviceId) && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={mutation.isPending || (bookingType === 'ONE_TIME' && isDateBlocked) || !serviceId}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookBtnText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeCard: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#fff',
  },
  typeCardActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  typeLabel: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 2 },
  typeLabelActive: { color: '#2563EB' },
  typeDesc: { fontSize: 11, color: '#9CA3AF' },
  typeDescActive: { color: '#93C5FD' },
  stepper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  stepBtn: {
    width: 52, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  stepBtnText: { fontSize: 22, color: '#2563EB', fontWeight: '600' },
  stepCenter: { flex: 1, alignItems: 'center' },
  stepValue: { fontSize: 15, fontWeight: '600', color: '#111827', textAlign: 'center' },
  blockedLabel: { fontSize: 11, color: '#DC2626', marginTop: 2 },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekdayChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#fff',
    alignItems: 'center', minWidth: 50,
  },
  weekdayChipSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  weekdayChipTaken: { borderColor: '#E5E7EB', backgroundColor: '#F3F4F6', opacity: 0.6 },
  weekdayChipText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  weekdayChipTextSelected: { color: '#2563EB' },
  weekdayChipTextTaken: { color: '#9CA3AF' },
  takenLabel: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  hint: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  recurringNote: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginTop: 8 },
  recurringNoteText: { fontSize: 12, color: '#1D4ED8', lineHeight: 18 },
  textarea: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, fontSize: 14, color: '#111827', minHeight: 80,
  },
  bookBtn: {
    backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
