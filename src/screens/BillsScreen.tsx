import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BillItem, Card, TutorialTooltip, SCREEN_TUTORIALS } from '../components';
import { useBills } from '../hooks/useBills';
import { useCategories } from '../hooks/useCategories';
import { Bill, COLORS } from '../types';
import { formatCurrency } from '../utils/formatters';

export function BillsScreen({ navigation }: any) {
  const {
    bills,
    loading,
    fetchBills,
    deleteBill,
    markAsPaid,
    markAsUnpaid,
    getUpcomingBills,
    getOverdueBills,
    getTotalPending,
  } = useBills();
  const { categories } = useCategories();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('pending');

  const overdueBills = getOverdueBills();
  const upcomingBills = getUpcomingBills(30);
  const totalPending = getTotalPending();

  const filteredBills = bills.filter(bill => {
    if (filter === 'pending') return !bill.is_paid;
    if (filter === 'paid') return bill.is_paid;
    return true;
  }).sort((a, b) => a.due_date.localeCompare(b.due_date));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  const handleTogglePaid = async (bill: Bill) => {
    if (bill.is_paid) {
      await markAsUnpaid(bill.id);
    } else {
      await markAsPaid(bill.id);
    }
  };

  const handleDelete = (bill: Bill) => {
    Alert.alert(
      'Excluir Conta',
      `Tem certeza que deseja excluir "${bill.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteBill(bill.id);
            if (error) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Sem categoria';
  };

  const renderBill = ({ item }: { item: Bill }) => (
    <BillItem
      bill={item}
      categoryName={getCategoryName(item.category_id)}
      onPress={() => navigation.navigate('AddBill', { bill: item })}
      onTogglePaid={() => handleTogglePaid(item)}
    />
  );

  return (
    <View style={styles.container}>
      <TutorialTooltip tutorialKey="bills" steps={SCREEN_TUTORIALS.bills} />
      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Pendente</Text>
            <Text style={[styles.summaryValue, { color: COLORS.expense }]}>
              {formatCurrency(totalPending)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Atrasadas</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: overdueBills.length > 0 ? COLORS.danger : COLORS.success },
              ]}
            >
              {overdueBills.length}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Próximas</Text>
            <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
              {upcomingBills.length}
            </Text>
          </View>
        </View>
      </Card>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['pending', 'paid', 'all'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'pending' ? 'Pendentes' : f === 'paid' ? 'Pagas' : 'Todas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overdue Alert */}
      {filter === 'pending' && overdueBills.length > 0 && (
        <View style={styles.alertCard}>
          <View style={styles.alertContent}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.danger} />
            <Text style={styles.alertText}>
              Você tem {overdueBills.length} conta(s) atrasada(s)
            </Text>
          </View>
        </View>
      )}

      {/* Bills List */}
      <FlatList
        data={filteredBills}
        keyExtractor={item => item.id}
        renderItem={renderBill}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyText}>
              {filter === 'pending'
                ? 'Nenhuma conta pendente'
                : filter === 'paid'
                ? 'Nenhuma conta paga este mês'
                : 'Nenhuma conta cadastrada'}
            </Text>
          </Card>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddBill')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  summaryCard: {
    margin: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  alertCard: {
    backgroundColor: `${COLORS.danger}15`,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    lineHeight: 34,
  },
});
