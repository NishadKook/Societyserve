import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function ProfileScreen() {
  const { tenantProfile, phone, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {tenantProfile?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.name}>{tenantProfile?.fullName ?? 'Tenant'}</Text>
          <Text style={styles.flat}>Flat {tenantProfile?.flatNumber}</Text>
          <Text style={styles.phone}>{phone}</Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/complaints/new')}
          >
            <Text style={styles.menuEmoji}>🚨</Text>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>File a Complaint</Text>
              <Text style={styles.menuSub}>Report a safety or service issue</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/bookings')}
          >
            <Text style={styles.menuEmoji}>📋</Text>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>My Bookings</Text>
              <Text style={styles.menuSub}>View and manage your bookings</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, padding: 20 },
  header: { alignItems: 'center', paddingVertical: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  flat: { fontSize: 14, color: '#6B7280', marginBottom: 2 },
  phone: { fontSize: 13, color: '#9CA3AF' },
  section: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6',
    overflow: 'hidden', marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  menuEmoji: { fontSize: 22, marginRight: 12 },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  menuSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  menuArrow: { fontSize: 20, color: '#D1D5DB' },
  logoutBtn: {
    borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFF5F5',
  },
  logoutText: { color: '#DC2626', fontWeight: '600', fontSize: 15 },
});
