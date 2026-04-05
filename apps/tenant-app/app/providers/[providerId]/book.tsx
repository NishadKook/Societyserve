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
import { isRecurringCategory } from '@/utils/categories';
import type { BookingType, ProviderService } from '@/types';

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

// For on-demand booking type selector (not shown for recurring categories)
const ON_DEMAND_BOOKING_TYPES: { value: BookingType; label: string; desc: string }[] = [
  { value: 'ONE_TIME', label: 'One Time', desc: 'Single visit' },
  { value: 'RECURRING', label: 'Recurring', desc: 'Regular schedule' },
];

export default function BookScreen() {
  const { providerId, bookingType: routeBookingType } = useLocalSearchParams<{
    providerId: string;
    bookingType?: string;
  }>();
  const societyId = useAuthStore((s) => s.tenantProfile?.societyId ?? '');
  const queryClient = useQueryClient();

  const { data: services } = useQuery({
    queryKey: ['providerServices', providerId],
    queryFn: () => providersService.getServices(providerId).then((r) => r.data),
    enabled: !!providerId,
  });

  const service: ProviderService | undefined = services?.[0];
  const serviceId = service?.id;
  const recurring = service ? isRecurringCategory(service.category) : false;

  // Determine initial booking type from route params or default
  const initialBookingType: BookingType = (routeBookingType as BookingType) ?? (recurring ? 'RECURRING' : 'ONE_TIME');
  const [bookingType, setBookingType] = useState<BookingType>(initialBookingType);

  // ONE_TIME state
  const [selectedDate, setSelectedDate] = useState(DAYS_30[1]?.iso ?? DAYS_30[0].iso);
  const [startSlot, setStartSlot] = useState('09:00');
  const [endSlot, setEndSlot] = useState('10:00');

  // RECURRING (monthly subscription) state
  const defaultWeekdays = (() => {
    if (service?.schedule) {
      // Pre-fill from service schedule: pick first N weekdays (Mon-Sat preference)
      const n = service.schedule.daysPerWeek;
      const preferred = [1, 2, 3, 4, 5, 6]; // Mon-Sat
      return preferred.slice(0, Math.min(n, preferred.length));
    }
    return [1, 2, 3, 4, 5, 6];
  })();
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(defaultWeekdays);

  // Parse time slot from service schedule for recurring
  const defaultRecurStart = service?.schedule?.timeSlot?.split('-')[0] ?? '07:00';
  const defaultRecurEnd = service?.schedule?.timeSlot?.split('-')[1] ?? '08:00';
  const [recurStartSlot, setRecurStartSlot] = useState(defaultRecurStart);
  const [recurEndSlot, setRecurEndSlot] = useState(defaultRecurEnd);

  // TRIAL state
  const [trialDate, setTrialDate] = useState(DAYS_30[1]?.iso ?? DAYS_30[0].iso);
  const [trialTimeSlot, setTrialTimeSlot] = useState(defaultRecurStart);

  // Recurring subscription start date
  const [recurStartDate, setRecurStartDate] = useState(DAYS_30[1]?.iso ?? DAYS_30[0].iso);

  const [notes, setNotes] = useState('');

  const { data: availability } = useQuery({
    queryKey: ['providerAvail', providerId],
    queryFn: () => providersService.getAvailability(providerId).then((r) => r.data),
    enabled: !!providerId,
  });

  const isDateBlocked = (date: string) => (availability?.blockedDates ?? []).includes(date);
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
      } else if (bookingType === 'TRIAL') {
        const [th, tm] = trialTimeSlot.split(':').map(Number);
        const scheduled = new Date(`${trialDate}T${String(th).padStart(2, '0')}:${String(tm).padStart(2, '0')}:00`);
        return bookingsService.create({
          providerId,
          serviceId: serviceId!,
          societyId,
          bookingType: 'TRIAL' as string as 'ONE_TIME', // backend will handle TRIAL type
          scheduledAt: scheduled.toISOString(),
          notes: notes.trim() || undefined,
        });
      } else {
        // RECURRING
        const [rh, rm] = recurStartSlot.split(':').map(Number);
        const startDate = new Date(`${recurStartDate}T${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}:00`);

        return bookingsService.create({
          providerId,
          serviceId: serviceId!,
          societyId,
          bookingType: 'RECURRING',
          scheduledAt: startDate.toISOString(),
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
      const msg = bookingType === 'TRIAL'
        ? 'Your trial booking has been sent to the provider.'
        : bookingType === 'RECURRING'
          ? 'Your monthly subscription request has been sent.'
          : 'Your booking request has been sent to the provider.';
      Alert.alert('Booked!', msg, [
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
      if (isDateBlocked(selectedDate)) {
        Alert.alert('Provider Unavailable', 'This provider has marked this day as unavailable.');
        return;
      }
      if (startSlot >= endSlot) {
        Alert.alert('Invalid Time', 'End time must be after start time.');
        return;
      }
    } else if (bookingType === 'TRIAL') {
      if (isDateBlocked(trialDate)) {
        Alert.alert('Provider Unavailable', 'This provider has marked this day as unavailable.');
        return;
      }
    } else {
      // RECURRING
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
  const trialDayLabel = DAYS_30.find((d) => d.iso === trialDate)?.label ?? trialDate;
  const recurStartDayLabel = DAYS_30.find((d) => d.iso === recurStartDate)?.label ?? recurStartDate;

  const monthlyPriceDisplay = service?.monthlyPrice ? `₹${parseFloat(service.monthlyPrice).toFixed(0)}` : '';
  const trialPriceDisplay = service?.trialPrice ? `₹${parseFloat(service.trialPrice).toFixed(0)}` : '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Booking type selector: only for on-demand categories */}
        {!recurring && (
          <>
            <Text style={styles.label}>Booking Type</Text>
            <View style={styles.typeRow}>
              {ON_DEMAND_BOOKING_TYPES.map((t) => (
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
          </>
        )}

        {/* For recurring categories, show the plan info header */}
        {recurring && bookingType === 'RECURRING' && (
          <View style={styles.planInfoCard}>
            <Text style={styles.planInfoTitle}>Monthly Subscription</Text>
            {monthlyPriceDisplay ? (
              <Text style={styles.planInfoPrice}>{monthlyPriceDisplay}/month</Text>
            ) : null}
            {service?.schedule && (
              <Text style={styles.planInfoSchedule}>
                Default: {service.schedule.daysPerWeek} days/week
              </Text>
            )}
          </View>
        )}

        {recurring && bookingType === 'TRIAL' && (
          <View style={styles.planInfoCard}>
            <Text style={styles.planInfoTitle}>1-Day Trial</Text>
            {trialPriceDisplay ? (
              <Text style={styles.planInfoPrice}>{trialPriceDisplay}</Text>
            ) : null}
            <Text style={styles.planInfoSchedule}>Try the service for one day before subscribing</Text>
          </View>
        )}

        {/* === ONE_TIME FLOW === */}
        {bookingType === 'ONE_TIME' && (
          <>
            {/* Date stepper */}
            <Text style={styles.label}>Date</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepDay(selectedDate, -1, setSelectedDate)}>
                <Text style={styles.stepBtnText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.stepCenter}>
                <Text style={styles.stepValue}>📅 {currentDayLabel}</Text>
                {isDateBlocked(selectedDate) && <Text style={styles.blockedLabel}>Provider unavailable</Text>}
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
        )}

        {/* === TRIAL FLOW (recurring categories only) === */}
        {bookingType === 'TRIAL' && (
          <>
            <Text style={styles.label}>Pick a Date</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepDay(trialDate, -1, setTrialDate)}>
                <Text style={styles.stepBtnText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.stepCenter}>
                <Text style={styles.stepValue}>📅 {trialDayLabel}</Text>
                {isDateBlocked(trialDate) && <Text style={styles.blockedLabel}>Provider unavailable</Text>}
              </View>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepDay(trialDate, 1, setTrialDate)}>
                <Text style={styles.stepBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Time</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepSlot(trialTimeSlot, -1, setTrialTimeSlot)}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>🕐 {formatTime(trialTimeSlot)}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepSlot(trialTimeSlot, 1, setTrialTimeSlot)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* === RECURRING FLOW === */}
        {bookingType === 'RECURRING' && (
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

            {/* Time slot */}
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

            {/* Start date for subscription */}
            <Text style={styles.label}>Start Date</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepDay(recurStartDate, -1, setRecurStartDate)}>
                <Text style={styles.stepBtnText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.stepCenter}>
                <Text style={styles.stepValue}>📅 {recurStartDayLabel}</Text>
              </View>
              <TouchableOpacity style={styles.stepBtn} onPress={() => stepDay(recurStartDate, 1, setRecurStartDate)}>
                <Text style={styles.stepBtnText}>›</Text>
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

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.bookBtn, (mutation.isPending || !serviceId) && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={mutation.isPending || !serviceId}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookBtnText}>
              {bookingType === 'TRIAL'
                ? `Book Trial${trialPriceDisplay ? ` - ${trialPriceDisplay}` : ''}`
                : bookingType === 'RECURRING' && recurring
                  ? 'Subscribe Monthly'
                  : 'Confirm Booking'}
            </Text>
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
  // Plan info card for recurring categories
  planInfoCard: {
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 16, marginTop: 8,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  planInfoTitle: { fontSize: 15, fontWeight: '700', color: '#1D4ED8', marginBottom: 4 },
  planInfoPrice: { fontSize: 22, fontWeight: '700', color: '#2563EB', marginBottom: 4 },
  planInfoSchedule: { fontSize: 13, color: '#6B7280' },
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
