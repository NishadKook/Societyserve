import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function PendingScreen() {
  const { providerProfile, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>⏳</Text>
        <Text style={styles.title}>Application Under Review</Text>
        <Text style={styles.body}>
          Your provider profile has been submitted. A society admin will review and approve your account.
          {'\n\n'}
          Once approved, you can start accepting bookings from residents.
        </Text>

        {providerProfile && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Name</Text>
            <Text style={styles.cardValue}>{providerProfile.fullName}</Text>
            <Text style={styles.cardLabel}>Category</Text>
            <Text style={styles.cardValue}>{providerProfile.serviceCategory}</Text>
            <Text style={styles.cardLabel}>Experience</Text>
            <Text style={styles.cardValue}>{providerProfile.experienceYears} years</Text>
          </View>
        )}

        <TouchableOpacity style={styles.joinBtn} onPress={() => router.push('/join-society')}>
          <Text style={styles.joinBtnText}>Request to Join a Society</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => void logout()}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0FDF4' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 56, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', marginTop: 8 },
  cardValue: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 2 },
  joinBtn: {
    width: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  joinBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  logoutBtn: { paddingVertical: 10 },
  logoutText: { color: '#9CA3AF', fontSize: 14 },
});
