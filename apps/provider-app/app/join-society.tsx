import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { societyService } from '@/services/society.service';
import { userService } from '@/services/user.service';
import type { Society } from '@/types';

export default function JoinSocietyScreen() {
  const [query, setQuery] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);
  const [searching, setSearching] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // Fetch existing memberships to block re-requests
  const { data: me } = useQuery({
    queryKey: ['providerMe'],
    queryFn: () => userService.getMe().then((r) => r.data),
  });

  const memberships = me?.providerProfile?.societyMemberships ?? [];
  const approvedIds = new Set(
    memberships.filter((m) => m.approvalStatus === 'APPROVED').map((m) => m.society.id)
  );
  const pendingServerIds = new Set(
    memberships.filter((m) => m.approvalStatus === 'PENDING').map((m) => m.society.id)
  );

  // Live search with 400ms debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSocieties([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await societyService.search(query);
        setSocieties(res.data);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleJoin = async (society: Society) => {
    Alert.alert(
      'Request to Join',
      `Send a request to join ${society.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            setJoiningId(society.id);
            try {
              await userService.joinSociety(society.id);
              setRequestedIds((prev) => new Set(prev).add(society.id));
              void queryClient.invalidateQueries({ queryKey: ['providerMe'] });
              Alert.alert('Request Sent!', `Your request to join ${society.name} has been sent. The admin will approve it shortly.`);
            } catch (err: unknown) {
              const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
              Alert.alert('Error', msg ?? 'Failed to send join request');
            } finally {
              setJoiningId(null);
            }
          },
        },
      ]
    );
  };

  const getButtonState = (societyId: string): 'request' | 'pending' | 'member' => {
    if (approvedIds.has(societyId)) return 'member';
    if (pendingServerIds.has(societyId)) return 'pending';
    if (requestedIds.has(societyId)) return 'pending';
    return 'request';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>Search for societies in your area and request to join them</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Type society name to search..."
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          autoFocus
        />
        {searching && <ActivityIndicator style={styles.spinner} color="#16A34A" size="small" />}
      </View>

      {societies.length === 0 && !searching && query.trim().length > 0 ? (
        <Text style={styles.noResults}>No societies found. Try a different name.</Text>
      ) : null}

      <FlatList
        data={societies}
        keyExtractor={(s) => s.id}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const state = getButtonState(item.id);
          return (
            <View style={styles.societyCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.societyName}>{item.name}</Text>
                <Text style={styles.societyAddr}>{item.address}</Text>
                <Text style={styles.societyCity}>{item.city} · {item.totalUnits} units</Text>
              </View>
              {state === 'member' ? (
                <View style={styles.memberBadge}>
                  <Text style={styles.memberText}>Joined ✓</Text>
                </View>
              ) : state === 'pending' ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Requested</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.joinBtn, joiningId === item.id && styles.joinBtnDisabled]}
                  onPress={() => void handleJoin(item)}
                  disabled={joiningId !== null}
                >
                  {joiningId === item.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.joinBtnText}>Request</Text>}
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  spinner: { marginLeft: 10 },
  noResults: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
  societyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  societyName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  societyAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  societyCity: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  joinBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.5 },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  pendingText: { color: '#D97706', fontWeight: '700', fontSize: 12 },
  memberBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  memberText: { color: '#16A34A', fontWeight: '700', fontSize: 12 },
});
