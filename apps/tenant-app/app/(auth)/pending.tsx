import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/user.service';

export default function PendingScreen() {
  const { logout, setTenantProfile } = useAuthStore();
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await userService.getMe();
      const profile = res.data.tenantProfile;
      if (profile?.approvalStatus === 'APPROVED') {
        setTenantProfile(profile);
        router.replace('/(tabs)');
      } else if (profile?.approvalStatus === 'REJECTED') {
        Alert.alert('Rejected', 'Your application was rejected. Contact your society admin.');
      } else {
        Alert.alert('Still Pending', 'Your application is still under review. Check back soon.');
      }
    } catch {
      Alert.alert('Error', 'Failed to check status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>⏳</Text>
      </View>
      <Text style={styles.title}>Application Submitted</Text>
      <Text style={styles.body}>
        Your request to join the society is pending review by the society admin. You'll get access once approved.
      </Text>

      <TouchableOpacity
        style={[styles.button, checking && styles.buttonDisabled]}
        onPress={checkStatus}
        disabled={checking}
      >
        {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Check Status</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => logout()}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  iconText: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  button: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  logoutBtn: { paddingVertical: 12 },
  logoutText: { color: '#9CA3AF', fontSize: 14 },
});
