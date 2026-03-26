import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { userService } from '@/services/user.service';
import { societyService } from '@/services/society.service';
import type { Society } from '@/types';

export default function SetupScreen() {
  const [fullName, setFullName] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [societyQuery, setSocietyQuery] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);
  const [selectedSociety, setSelectedSociety] = useState<Society | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async () => {
    if (!societyQuery.trim()) return;
    setSearching(true);
    try {
      const res = await societyService.search(societyQuery);
      setSocieties(res.data);
    } catch {
      Alert.alert('Error', 'Failed to search societies');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) { Alert.alert('Required', 'Enter your full name'); return; }
    if (!flatNumber.trim()) { Alert.alert('Required', 'Enter your flat number'); return; }
    if (!selectedSociety) { Alert.alert('Required', 'Select your society'); return; }

    setSubmitting(true);
    try {
      await userService.createTenantProfile({
        fullName: fullName.trim(),
        flatNumber: flatNumber.trim(),
        societyId: selectedSociety.id,
      });
      router.replace('/(auth)/pending');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Error', msg ?? 'Failed to submit profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>This helps your society admin verify you</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Your full name"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>Flat / Unit Number</Text>
      <TextInput
        style={styles.input}
        value={flatNumber}
        onChangeText={setFlatNumber}
        placeholder="e.g. A-204"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>Society</Text>
      {selectedSociety ? (
        <View style={styles.selectedSociety}>
          <View style={{ flex: 1 }}>
            <Text style={styles.societyName}>{selectedSociety.name}</Text>
            <Text style={styles.societyAddr}>{selectedSociety.city}</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedSociety(null)}>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={societyQuery}
              onChangeText={setSocietyQuery}
              placeholder="Search society name..."
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
              {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>Search</Text>}
            </TouchableOpacity>
          </View>

          {societies.length > 0 && (
            <FlatList
              data={societies}
              keyExtractor={(s) => s.id}
              style={styles.societyList}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.societyItem} onPress={() => { setSelectedSociety(item); setSocieties([]); }}>
                  <Text style={styles.societyName}>{item.name}</Text>
                  <Text style={styles.societyAddr}>{item.address}, {item.city}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit for Approval</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  societyList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  societyItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  selectedSociety: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  societyName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  societyAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  changeLink: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
