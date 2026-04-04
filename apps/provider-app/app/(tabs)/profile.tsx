import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Image, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { userService } from '@/services/user.service';
import { bookingsService } from '@/services/bookings.service';
import { uploadService, pickImage } from '@/services/upload.service';
import { CATEGORY_LABELS } from '@/utils/format';

export default function ProfileScreen() {
  const { providerProfile, phone, logout, setProviderProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleChangePhoto = async () => {
    try {
      const uri = await pickImage();
      if (!uri) return;

      setUploading(true);

      const ext = uri.split('.').pop() ?? 'jpg';
      const fileName = `profile.${ext}`;

      const { data } = await uploadService.getSignedUrl('profiles', fileName);
      await uploadService.uploadFile(data.signedUrl, uri);

      await userService.updateProviderProfile({ profilePhotoUrl: data.publicUrl });

      if (providerProfile) {
        setProviderProfile({ ...providerProfile, profilePhotoUrl: data.publicUrl });
      }

      Alert.alert('Success', 'Profile photo updated');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadIdProof = async () => {
    try {
      const uri = await pickImage();
      if (!uri) return;

      setUploadingId(true);
      const ext = uri.split('.').pop() ?? 'jpg';
      const fileName = `id-proof.${ext}`;

      const { data } = await uploadService.getSignedUrl('id-proofs', fileName);
      await uploadService.uploadFile(data.signedUrl, uri);

      await userService.updateProviderProfile({ idProofUrl: data.publicUrl });

      if (providerProfile) {
        setProviderProfile({ ...providerProfile, idProofUrl: data.publicUrl });
      }

      Alert.alert('Success', 'ID proof uploaded');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to upload ID proof');
    } finally {
      setUploadingId(false);
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleChangePhoto} disabled={uploading} activeOpacity={0.7}>
            <View style={styles.avatarWrapper}>
              {providerProfile?.profilePhotoUrl ? (
                <Image source={{ uri: providerProfile.profilePhotoUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {providerProfile?.fullName?.charAt(0).toUpperCase() ?? '?'}
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

        {/* ID Proof */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ID Proof</Text>
          {providerProfile?.idProofUrl ? (
            <View style={styles.idProofStatus}>
              <Text style={styles.idProofUploaded}>Uploaded</Text>
              <TouchableOpacity onPress={handleUploadIdProof} disabled={uploadingId}>
                <Text style={styles.addLink}>{uploadingId ? 'Uploading...' : 'Re-upload'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.idProofBtn}
              onPress={handleUploadIdProof}
              disabled={uploadingId}
            >
              {uploadingId ? (
                <ActivityIndicator color="#16A34A" size="small" />
              ) : (
                <Text style={styles.idProofBtnText}>Upload Aadhaar / PAN</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Delete Account */}
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
  profileHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarWrapper: {
    width: 80, height: 80, marginBottom: 12, position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80, height: 80, borderRadius: 40,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#16A34A' },
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
    backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F9FAFB',
  },
  cameraBadgeText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 18 },
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
  idProofStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idProofUploaded: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
  },
  idProofBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  idProofBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
  deleteBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 40,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
  },
  deleteText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});
