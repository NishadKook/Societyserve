import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/user.service';
import { bookingsService } from '@/services/bookings.service';
import { CATEGORY_LABELS } from '@/utils/format';

export default function ProfileScreen() {
  const { providerProfile, phone, logout } = useAuthStore();
  const queryClient = useQueryClient();

  // Refetch memberships every time this tab is focused so admin approval reflects immediately
  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['providerMe'] });
    }, [queryClient])
  );

  const { data: me } = useQuery({
    queryKey: ['providerMe'],
    queryFn: () => userService.getMe().then((r) => r.data),
    refetchInterval: 15000, // also poll every 15s while screen is open
  });

  const { data: bookings } = useQuery({
    queryKey: ['providerBookings'],
    queryFn: () => bookingsService.list().then((r) => r.data),
  });

  const completed = bookings?.filter((b) => b.status === 'COMPLETED') ?? [];
  const memberships = me?.providerProfile?.societyMemberships ?? [];

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {providerProfile?.fullName?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.name}>{providerProfile?.fullName ?? '—'}</Text>
          <Text style={styles.category}>{CATEGORY_LABELS[providerProfile?.serviceCategory ?? ''] ?? ''}</Text>
          <Text style={styles.phone}>{phone}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>⭐ {providerProfile?.avgRating != null ? Number(providerProfile.avgRating).toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{providerProfile?.totalReviews ?? 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{completed.length}</Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        {providerProfile?.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{providerProfile.bio}</Text>
          </View>
        ) : null}

        {/* Experience */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <Text style={styles.detailText}>{providerProfile?.experienceYears ?? 0} years as a {CATEGORY_LABELS[providerProfile?.serviceCategory ?? ''] ?? 'service provider'}</Text>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Services</Text>
            <TouchableOpacity onPress={() => router.push('/services')}>
              <Text style={styles.addLink}>Manage</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.detailText}>
            Add services so tenants can book you
          </Text>
        </View>

        {/* Societies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Societies</Text>
            <TouchableOpacity onPress={() => router.push('/join-society')}>
              <Text style={styles.addLink}>+ Join New</Text>
            </TouchableOpacity>
          </View>
          {memberships.length === 0 ? (
            <Text style={styles.emptyText}>No societies joined yet</Text>
          ) : (
            memberships.map((m) => (
              <View key={m.id} style={styles.societyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.societyName}>{m.society.name}</Text>
                  <Text style={styles.societyCity}>{m.society.city}</Text>
                </View>
                <View style={[
                  styles.approvalBadge,
                  m.approvalStatus === 'APPROVED' && styles.approvedBadge,
                  m.approvalStatus === 'REJECTED' && styles.rejectedBadge,
                ]}>
                  <Text style={[
                    styles.approvalText,
                    m.approvalStatus === 'APPROVED' && styles.approvedText,
                    m.approvalStatus === 'REJECTED' && styles.rejectedText,
                  ]}>
                    {m.approvalStatus}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  profileHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#16A34A' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  category: { fontSize: 14, color: '#16A34A', fontWeight: '600', marginTop: 2 },
  phone: { fontSize: 13, color: '#9CA3AF', marginTop: 4, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stat: { alignItems: 'center', paddingHorizontal: 20 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },
  section: { backgroundColor: '#fff', padding: 20, marginTop: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  addLink: { fontSize: 14, color: '#16A34A', fontWeight: '600' },
  bio: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  detailText: { fontSize: 14, color: '#4B5563' },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  societyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  societyName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  societyCity: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  approvalBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  approvedBadge: { backgroundColor: '#DCFCE7' },
  rejectedBadge: { backgroundColor: '#FEE2E2' },
  approvalText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  approvedText: { color: '#16A34A' },
  rejectedText: { color: '#DC2626' },
  logoutBtn: {
    margin: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
});
