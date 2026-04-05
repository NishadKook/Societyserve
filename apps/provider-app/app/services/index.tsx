import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesService } from '@/services/services.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Service, ServiceCategory, ServiceSchedule } from '@/types';
import { CATEGORY_LABELS } from '@/utils/format';
import { isRecurringCategory } from '@/utils/categories';

const DURATION_OPTIONS = [30, 45, 60, 90, 120, 180, 240];
const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const TIME_SLOT_OPTIONS = [
  '05:00-07:00', '06:00-08:00', '07:00-09:00', '08:00-10:00',
  '09:00-11:00', '10:00-12:00', '11:00-13:00', '12:00-14:00',
  '14:00-16:00', '16:00-18:00', '17:00-19:00', '18:00-20:00',
  '19:00-21:00', '20:00-22:00',
];

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTimeSlot(slot: string): string {
  const [start, end] = slot.split('-');
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}

export default function MyServicesScreen() {
  const queryClient = useQueryClient();
  const providerProfile = useAuthStore((s) => s.providerProfile);
  const [showForm, setShowForm] = useState(false);

  const category = providerProfile?.serviceCategory ?? '';
  const recurring = isRecurringCategory(category);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [trialPrice, setTrialPrice] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(6);
  const [timeSlot, setTimeSlot] = useState('07:00-09:00');
  const [durationIdx, setDurationIdx] = useState(2); // default 60 min
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['myServices'],
    queryFn: () => servicesService.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => servicesService.create({
      category: providerProfile!.serviceCategory,
      title: title.trim(),
      description: description.trim() || undefined,
      price: parseFloat(price || '0'),
      durationMinutes: DURATION_OPTIONS[durationIdx],
      ...(recurring ? {
        monthlyPrice: parseFloat(monthlyPrice),
        trialPrice: parseFloat(trialPrice),
        schedule: { daysPerWeek, timeSlot } as ServiceSchedule,
      } : {}),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['myServices'] });
      resetForm();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Error', msg ?? 'Failed to create service');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => servicesService.update(id, {
      title: title.trim(),
      description: description.trim() || undefined,
      price: parseFloat(price || '0'),
      durationMinutes: DURATION_OPTIONS[durationIdx],
      ...(recurring ? {
        monthlyPrice: parseFloat(monthlyPrice),
        trialPrice: parseFloat(trialPrice),
        schedule: { daysPerWeek, timeSlot } as ServiceSchedule,
      } : {}),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['myServices'] });
      resetForm();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Error', msg ?? 'Failed to update service');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      servicesService.update(id, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['myServices'] }),
    onError: () => Alert.alert('Error', 'Failed to update service'),
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setMonthlyPrice('');
    setTrialPrice('');
    setDaysPerWeek(6);
    setTimeSlot('07:00-09:00');
    setDurationIdx(2);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (service: Service) => {
    setTitle(service.title);
    setDescription(service.description ?? '');
    setPrice(String(parseFloat(service.price)));
    if (service.monthlyPrice) setMonthlyPrice(String(parseFloat(service.monthlyPrice)));
    if (service.trialPrice) setTrialPrice(String(parseFloat(service.trialPrice)));
    if (service.schedule) {
      setDaysPerWeek(service.schedule.daysPerWeek);
      setTimeSlot(service.schedule.timeSlot);
    }
    const dIdx = DURATION_OPTIONS.indexOf(service.durationMinutes);
    setDurationIdx(dIdx >= 0 ? dIdx : 2);
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!title.trim()) { Alert.alert('Required', 'Enter a service title'); return; }

    if (recurring) {
      const mp = parseFloat(monthlyPrice);
      const tp = parseFloat(trialPrice);
      if (!monthlyPrice || isNaN(mp) || mp < 0) {
        Alert.alert('Required', 'Enter a valid monthly price');
        return;
      }
      if (!trialPrice || isNaN(tp) || tp < 0) {
        Alert.alert('Required', 'Enter a valid trial price');
        return;
      }
    } else {
      const p = parseFloat(price);
      if (!price || isNaN(p) || p < 0) {
        Alert.alert('Required', 'Enter a valid price');
        return;
      }
    }

    if (editingId) {
      updateMutation.mutate(editingId);
    } else {
      createMutation.mutate();
    }
  };

  const handleToggle = (service: Service) => {
    Alert.alert(
      service.isActive ? 'Deactivate Service' : 'Activate Service',
      `${service.isActive ? 'Hide' : 'Show'} this service from tenants?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: service.isActive ? 'Deactivate' : 'Activate', onPress: () => toggleMutation.mutate({ id: service.id, isActive: !service.isActive }) },
      ]
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Services</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowForm(true); }}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🛠️</Text>
              <Text style={styles.emptyTitle}>No services yet</Text>
              <Text style={styles.emptyText}>Add your first service so tenants can book you</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)}>
                <Text style={styles.emptyBtnText}>Add Service</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <ServiceCard
              service={item}
              isRecurring={recurring}
              onEdit={() => openEdit(item)}
              onToggle={() => handleToggle(item)}
            />
          )}
        />
      )}

      {/* Add/Edit form modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetForm}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Service' : 'Add Service'}</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={isPending}>
              {isPending ? <ActivityIndicator size="small" color="#16A34A" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{CATEGORY_LABELS[providerProfile?.serviceCategory ?? ''] ?? ''}</Text>
            </View>

            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={recurring ? 'e.g. Daily House Cleaning' : 'e.g. Electrical Repair'}
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what's included..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />

            {recurring ? (
              <>
                {/* Monthly Price */}
                <Text style={styles.fieldLabel}>Monthly Price (₹) *</Text>
                <TextInput
                  style={styles.input}
                  value={monthlyPrice}
                  onChangeText={setMonthlyPrice}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 3000"
                  placeholderTextColor="#9CA3AF"
                />

                {/* Trial Price */}
                <Text style={styles.fieldLabel}>Trial Price - 1 Day (₹) *</Text>
                <TextInput
                  style={styles.input}
                  value={trialPrice}
                  onChangeText={setTrialPrice}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 199"
                  placeholderTextColor="#9CA3AF"
                />

                {/* Schedule: Days per week */}
                <Text style={styles.fieldLabel}>Days per Week</Text>
                <View style={styles.durationRow}>
                  {DAYS_PER_WEEK_OPTIONS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.durationChip, daysPerWeek === d && styles.durationChipActive]}
                      onPress={() => setDaysPerWeek(d)}
                    >
                      <Text style={[styles.durationChipText, daysPerWeek === d && styles.durationChipTextActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Schedule: Time slot */}
                <Text style={styles.fieldLabel}>Time Slot</Text>
                <View style={styles.durationRow}>
                  {TIME_SLOT_OPTIONS.map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.timeSlotChip, timeSlot === slot && styles.durationChipActive]}
                      onPress={() => setTimeSlot(slot)}
                    >
                      <Text style={[styles.durationChipText, timeSlot === slot && styles.durationChipTextActive]}>
                        {formatTimeSlot(slot)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                {/* On-demand: single price */}
                <Text style={styles.fieldLabel}>Price per Visit (₹) *</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 299"
                  placeholderTextColor="#9CA3AF"
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Duration</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((d, idx) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.durationChip, durationIdx === idx && styles.durationChipActive]}
                  onPress={() => setDurationIdx(idx)}
                >
                  <Text style={[styles.durationChipText, durationIdx === idx && styles.durationChipTextActive]}>
                    {formatDuration(d)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ServiceCard({
  service, isRecurring, onEdit, onToggle,
}: {
  service: Service;
  isRecurring: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.card, !service.isActive && styles.cardInactive]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, !service.isActive && styles.cardTitleInactive]}>
            {service.title}
          </Text>
          {service.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>{service.description}</Text>
          ) : null}
        </View>
        <View style={[styles.activeBadge, !service.isActive && styles.inactiveBadge]}>
          <Text style={[styles.activeBadgeText, !service.isActive && styles.inactiveBadgeText]}>
            {service.isActive ? 'Active' : 'Hidden'}
          </Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        {isRecurring && service.monthlyPrice ? (
          <>
            <Text style={styles.metaText}>₹{parseFloat(service.monthlyPrice).toFixed(0)}/mo</Text>
            <View style={styles.dot} />
            <Text style={styles.metaTextSecondary}>Trial ₹{parseFloat(service.trialPrice ?? '0').toFixed(0)}</Text>
          </>
        ) : (
          <Text style={styles.metaText}>₹{parseFloat(service.price).toFixed(0)}/visit</Text>
        )}
        <View style={styles.dot} />
        <Text style={styles.metaText}>{formatDuration(service.durationMinutes)}</Text>
      </View>

      {isRecurring && service.schedule && (
        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleText}>
            {service.schedule.daysPerWeek} days/week · {formatTimeSlot(service.schedule.timeSlot)}
          </Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, !service.isActive && styles.activateBtn]} onPress={onToggle}>
          <Text style={[styles.toggleBtnText, !service.isActive && styles.activateBtnText]}>
            {service.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#16A34A', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#16A34A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardInactive: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardTitleInactive: { color: '#6B7280' },
  cardDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  activeBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  inactiveBadge: { backgroundColor: '#F3F4F6' },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  inactiveBadgeText: { color: '#9CA3AF' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  metaText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  metaTextSecondary: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9CA3AF' },
  scheduleRow: {
    backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8,
  },
  scheduleText: { fontSize: 12, fontWeight: '500', color: '#16A34A' },
  cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  editBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  toggleBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FEF3C7', alignItems: 'center',
  },
  activateBtn: { backgroundColor: '#DCFCE7' },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: '#D97706' },
  activateBtnText: { color: '#16A34A' },
  // Modal
  modal: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cancelText: { fontSize: 15, color: '#6B7280' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  form: { flex: 1 },
  formContent: { padding: 20, gap: 4, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff',
  },
  textarea: { height: 80 },
  categoryPill: {
    alignSelf: 'flex-start', backgroundColor: '#DCFCE7', paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: 20,
  },
  categoryPillText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff',
  },
  durationChipActive: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  durationChipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  durationChipTextActive: { color: '#16A34A', fontWeight: '700' },
  timeSlotChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff',
  },
});
