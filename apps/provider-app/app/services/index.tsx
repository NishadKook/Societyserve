import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesService } from '@/services/services.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Service, ServiceCategory } from '@/types';
import { CATEGORY_LABELS } from '@/utils/format';

const DURATION_OPTIONS = [30, 45, 60, 90, 120, 180, 240];

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function MyServicesScreen() {
  const queryClient = useQueryClient();
  const providerProfile = useAuthStore((s) => s.providerProfile);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
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
      price: parseFloat(price),
      durationMinutes: DURATION_OPTIONS[durationIdx],
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
      price: parseFloat(price),
      durationMinutes: DURATION_OPTIONS[durationIdx],
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
    setDurationIdx(2);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (service: Service) => {
    setTitle(service.title);
    setDescription(service.description ?? '');
    setPrice(String(parseFloat(service.price)));
    const dIdx = DURATION_OPTIONS.indexOf(service.durationMinutes);
    setDurationIdx(dIdx >= 0 ? dIdx : 2);
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!title.trim()) { Alert.alert('Required', 'Enter a service title'); return; }
    const p = parseFloat(price);
    if (!price || isNaN(p) || p < 0) { Alert.alert('Required', 'Enter a valid price'); return; }

    if (editingId) {
      updateMutation.mutate(editingId);
    } else {
      createMutation.mutate();
    }
  };

  const handleToggle = (service: Service) => {
    const action = service.isActive ? 'deactivate' : 'activate';
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
              placeholder="e.g. Daily House Cleaning"
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

            <Text style={styles.fieldLabel}>Price (₹) *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="e.g. 299"
              placeholderTextColor="#9CA3AF"
            />

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
  service, onEdit, onToggle,
}: {
  service: Service;
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
        <Text style={styles.metaText}>₹{parseFloat(service.price).toFixed(0)}</Text>
        <View style={styles.dot} />
        <Text style={styles.metaText}>{formatDuration(service.durationMinutes)}</Text>
      </View>

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
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  metaText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9CA3AF' },
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
  formContent: { padding: 20, gap: 4 },
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
});
