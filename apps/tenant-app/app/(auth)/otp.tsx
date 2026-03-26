import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth, setTenantProfile, logout } = useAuthStore();

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.verifyOtp(phone, otp);
      const { accessToken, refreshToken } = res.data;

      const payload = JSON.parse(atob(accessToken.split('.')[1])) as {
        sub: string; phone: string; role: string;
      };

      if (payload.role !== 'TENANT') {
        Alert.alert('Wrong App', 'This app is for tenants. Use the correct app for your role.');
        return;
      }

      await setAuth(payload.sub, payload.phone, accessToken, refreshToken);

      // Fetch profile to route correctly
      const meRes = await userService.getMe();
      const profile = meRes.data.tenantProfile;

      if (!profile) {
        router.replace('/(auth)/setup');
      } else if (profile.approvalStatus === 'PENDING') {
        setTenantProfile(profile);
        router.replace('/(auth)/pending');
      } else if (profile.approvalStatus === 'APPROVED') {
        setTenantProfile(profile);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Application Rejected', 'Your application was rejected. Contact your society admin.');
        await logout();
      }
    } catch {
      Alert.alert('Invalid OTP', 'The OTP you entered is incorrect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.card}>
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            OTP sent to <Text style={styles.phone}>{phone}</Text>
          </Text>
          <Text style={styles.hint}>Use 123456 for test numbers</Text>

          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="------"
            placeholderTextColor="#D1D5DB"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>Change phone number</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 2 },
  phone: { fontWeight: '600', color: '#111827' },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 24 },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    color: '#111827',
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { alignItems: 'center', paddingVertical: 8 },
  backText: { color: '#6B7280', fontSize: 14 },
});
