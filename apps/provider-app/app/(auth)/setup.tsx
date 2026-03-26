import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { userService } from '@/services/user.service';
import type { ServiceCategory } from '@/types';

const CATEGORIES: { key: ServiceCategory; label: string; emoji: string }[] = [
  { key: 'MAID', label: 'Maid', emoji: '🧹' },
  { key: 'COOK', label: 'Cook', emoji: '👨‍🍳' },
  { key: 'CLEANER', label: 'Cleaner', emoji: '🪣' },
  { key: 'ELECTRICIAN', label: 'Electrician', emoji: '⚡' },
  { key: 'CARPENTER', label: 'Carpenter', emoji: '🪚' },
  { key: 'PLUMBER', label: 'Plumber', emoji: '🔧' },
];

export default function SetupScreen() {
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim()) { Alert.alert('Required', 'Enter your full name'); return; }
    if (!category) { Alert.alert('Required', 'Select your service category'); return; }
    const expYears = parseInt(experience, 10);
    if (!experience || isNaN(expYears) || expYears < 0) {
      Alert.alert('Required', 'Enter valid years of experience');
      return;
    }

    setSubmitting(true);
    try {
      await userService.createProviderProfile({
        fullName: fullName.trim(),
        serviceCategory: category,
        experienceYears: expYears,
        bio: bio.trim(),
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
      <Text style={styles.title}>Set Up Your Profile</Text>
      <Text style={styles.subtitle}>Tell residents a bit about your services</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Your full name"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>Service Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryChip, category === cat.key && styles.categoryChipActive]}
            onPress={() => setCategory(cat.key)}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={[styles.categoryLabel, category === cat.key && styles.categoryLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Years of Experience</Text>
      <TextInput
        style={styles.input}
        value={experience}
        onChangeText={setExperience}
        keyboardType="number-pad"
        placeholder="e.g. 3"
        placeholderTextColor="#9CA3AF"
        maxLength={2}
      />

      <Text style={styles.label}>Short Bio (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell residents about your experience..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={3}
      />

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
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
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
  textArea: { height: 90, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  categoryChipActive: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
  categoryLabelActive: { color: '#15803D', fontWeight: '700' },
  button: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
