import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { bookingsService } from '@/services/bookings.service';
import type { ServiceCategory } from '@/types';

const CATEGORIES: { key: ServiceCategory; label: string; emoji: string; color: string }[] = [
  { key: 'MAID', label: 'Maid', emoji: '🧹', color: '#EFF6FF' },
  { key: 'COOK', label: 'Cook', emoji: '👨‍🍳', color: '#FFF7ED' },
  { key: 'CLEANER', label: 'Cleaner', emoji: '🪣', color: '#F0FDF4' },
  { key: 'ELECTRICIAN', label: 'Electrician', emoji: '⚡', color: '#FFFBEB' },
  { key: 'CARPENTER', label: 'Carpenter', emoji: '🪚', color: '#FDF2F8' },
  { key: 'PLUMBER', label: 'Plumber', emoji: '🔧', color: '#F0F9FF' },
];

export default function HomeScreen() {
  const tenantProfile = useAuthStore((s) => s.tenantProfile);

  const { data: bookings } = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => bookingsService.list().then((r) => r.data),
    enabled: !!tenantProfile,
  });

  const upcoming = bookings?.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED') ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {tenantProfile?.fullName?.split(' ')[0] ?? 'there'} 👋</Text>
            <Text style={styles.societyName}>Flat {tenantProfile?.flatNumber}</Text>
          </View>
        </View>

        {/* Upcoming booking banner */}
        {upcoming.length > 0 && (
          <TouchableOpacity
            style={styles.upcomingBanner}
            onPress={() => router.push('/(tabs)/bookings')}
          >
            <Text style={styles.upcomingEmoji}>📋</Text>
            <View>
              <Text style={styles.upcomingTitle}>{upcoming.length} upcoming booking{upcoming.length > 1 ? 's' : ''}</Text>
              <Text style={styles.upcomingSub}>Tap to view</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Categories */}
        <Text style={styles.sectionTitle}>Book a Service</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryCard, { backgroundColor: cat.color }]}
              onPress={() => router.push({ pathname: '/providers/category/[category]', params: { category: cat.key } })}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  societyName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  upcomingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  upcomingEmoji: { fontSize: 24 },
  upcomingTitle: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
  upcomingSub: { fontSize: 12, color: '#93C5FD', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', paddingHorizontal: 20, marginBottom: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 0,
  },
  categoryCard: {
    width: '30%',
    margin: '1.5%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryEmoji: { fontSize: 32, marginBottom: 8 },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
});
