import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { earningsService, type Transaction } from '@/services/earnings.service';
import { formatDate } from '@/utils/format';

function formatCurrency(amount: number): string {
  return '\u20B9' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function EarningsScreen() {
  const { data: summary, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['providerEarnings'],
    queryFn: () => earningsService.getSummary().then((r) => r.data),
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={summary?.recentTransactions ?? []}
        keyExtractor={(item) => item.bookingId}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Earnings</Text>
            </View>

            {/* Today's earnings hero */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Today's Earnings</Text>
              <Text style={styles.heroAmount}>{formatCurrency(summary?.todayEarnings ?? 0)}</Text>
              <Text style={styles.heroJobs}>{summary?.todayJobs ?? 0} job{(summary?.todayJobs ?? 0) !== 1 ? 's' : ''} completed</Text>
            </View>

            {/* Week / Month row */}
            <View style={styles.periodRow}>
              <View style={styles.periodCard}>
                <Text style={styles.periodLabel}>This Week</Text>
                <Text style={styles.periodAmount}>{formatCurrency(summary?.weekEarnings ?? 0)}</Text>
                <Text style={styles.periodJobs}>{summary?.weekJobs ?? 0} jobs</Text>
              </View>
              <View style={styles.periodCard}>
                <Text style={styles.periodLabel}>This Month</Text>
                <Text style={styles.periodAmount}>{formatCurrency(summary?.monthEarnings ?? 0)}</Text>
                <Text style={styles.periodJobs}>{summary?.monthJobs ?? 0} jobs</Text>
              </View>
            </View>

            {/* Total earnings */}
            <View style={styles.totalCard}>
              <View style={styles.totalLeft}>
                <Text style={styles.totalLabel}>Total Earnings</Text>
                <Text style={styles.totalJobs}>{summary?.totalJobs ?? 0} jobs completed</Text>
              </View>
              <Text style={styles.totalAmount}>{formatCurrency(summary?.totalEarnings ?? 0)}</Text>
            </View>

            {/* Transactions header */}
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </>
        }
        renderItem={({ item }) => <TransactionCard transaction={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyText}>No completed jobs yet</Text>
            <Text style={styles.emptySubtext}>Your earnings will appear here</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

function TransactionCard({ transaction }: { transaction: Transaction }) {
  return (
    <View style={styles.txCard}>
      <View style={styles.txLeft}>
        <Text style={styles.txService}>{transaction.serviceName}</Text>
        <Text style={styles.txTenant}>{transaction.tenantName}</Text>
        <Text style={styles.txDate}>{formatDate(transaction.date)}</Text>
      </View>
      <Text style={styles.txAmount}>+{formatCurrency(transaction.amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },

  // Hero card
  heroCard: {
    backgroundColor: '#16A34A',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  heroLabel: { fontSize: 14, color: '#BBF7D0', fontWeight: '500', marginBottom: 4 },
  heroAmount: { fontSize: 40, fontWeight: '800', color: '#fff' },
  heroJobs: { fontSize: 13, color: '#BBF7D0', marginTop: 4 },

  // Period cards
  periodRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 16 },
  periodCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  periodLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  periodAmount: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  periodJobs: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // Total card
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  totalLeft: {},
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#166534' },
  totalJobs: { fontSize: 12, color: '#16A34A', marginTop: 2 },
  totalAmount: { fontSize: 24, fontWeight: '800', color: '#166534' },

  // Section title
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },

  // Transaction card
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  txLeft: { flex: 1, marginRight: 12 },
  txService: { fontSize: 14, fontWeight: '600', color: '#111827' },
  txTenant: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  txDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '700', color: '#16A34A' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  listContent: { paddingBottom: 30 },
});
