import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/user.service';
import { uploadService, pickImage } from '@/services/upload.service';

export default function ProfileScreen() {
  const { tenantProfile, phone, logout, setTenantProfile } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const handleChangePhoto = async () => {
    try {
      const uri = await pickImage();
      if (!uri) return;

      setUploading(true);

      const ext = uri.split('.').pop() ?? 'jpg';
      const fileName = `profile.${ext}`;

      const { data } = await uploadService.getSignedUrl('profiles', fileName);
      await uploadService.uploadFile(data.signedUrl, uri);

      await userService.updateTenantProfile({ profilePhotoUrl: data.publicUrl });

      if (tenantProfile) {
        setTenantProfile({ ...tenantProfile, profilePhotoUrl: data.publicUrl });
      }

      Alert.alert('Success', 'Profile photo updated');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently deactivate your account. You will not be able to log in again. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await userService.deleteAccount();
              await logout();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to delete account');
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleChangePhoto} disabled={uploading} activeOpacity={0.7}>
            <View style={styles.avatarWrapper}>
              {tenantProfile?.profilePhotoUrl ? (
                <Image source={{ uri: tenantProfile.profilePhotoUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {tenantProfile?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              {uploading ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraBadgeText}>+</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
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

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#DC2626" size="small" />
          ) : (
            <Text style={styles.deleteText}>Delete Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, padding: 20 },
  header: { alignItems: 'center', paddingVertical: 32 },
  avatarWrapper: {
    width: 80, height: 80, marginBottom: 12, position: 'relative',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: {
    width: 80, height: 80, borderRadius: 40,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F9FAFB',
  },
  cameraBadgeText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 18 },
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
  deleteBtn: {
    marginTop: 12,
    marginBottom: 40,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
  },
  deleteText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});
