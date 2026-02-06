import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useRecurringTransactions } from '../hooks/useRecurringTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { Card, Button } from '../components';
import { RecurringTransaction, FREQUENCIES } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export function RecurringTransactionsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const {
    recurringTransactions,
    loading,
    fetchRecurringTransactions,
    toggleActive,
    deleteRecurringTransaction,
    getMonthlyTotal,
  } = useRecurringTransactions();
  const { categories } = useCategories();
  const { accounts } = useAccounts();

  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredTransactions = recurringTransactions.filter(
    (t) => filter === 'all' || t.type === filter
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecurringTransactions();
    setRefreshing(false);
  };

  const handleToggle = async (id: string) => {
    await toggleActive(id);
  };

  const handleDelete = (transaction: RecurringTransaction) => {
    Alert.alert(
      'Excluir Transação Recorrente',
      `Deseja excluir "${transaction.description}"? Isso não afetará transações já criadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteRecurringTransaction(transaction.id);
          },
        },
      ]
    );
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Sem categoria';
  };

  const getCategoryIcon = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.icon || 'help-circle';
  };

  const getAccountName = (accountId: string) => {
    return accounts.find((a) => a.id === accountId)?.name || 'Sem conta';
  };

  const monthlyIncome = getMonthlyTotal('income');
  const monthlyExpense = getMonthlyTotal('expense');

  const styles = createStyles(colors);

  const renderItem = ({ item }: { item: RecurringTransaction }) => (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => navigation.navigate('AddRecurringTransaction', { transaction: item })}
      >
        <View style={styles.iconContainer}>
          <View
            style={[
              styles.iconBackground,
              { backgroundColor: item.type === 'income' ? colors.income : colors.expense },
            ]}
          >
            <MaterialCommunityIcons
              name={getCategoryIcon(item.category_id) as any}
              size={24}
              color="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.info}>
          <Text style={[styles.description, { color: colors.text }]}>
            {item.description}
          </Text>
          <Text style={[styles.details, { color: colors.textSecondary }]}>
            {getCategoryName(item.category_id)} • {getAccountName(item.account_id)}
          </Text>
          <View style={styles.frequencyContainer}>
            <MaterialCommunityIcons
              name="repeat"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={[styles.frequency, { color: colors.textSecondary }]}>
              {FREQUENCIES[item.frequency].label}
            </Text>
            <Text style={[styles.nextDate, { color: colors.primary }]}>
              Próximo: {formatDate(item.next_date)}
            </Text>
          </View>
        </View>

        <View style={styles.rightContainer}>
          <Text
            style={[
              styles.amount,
              { color: item.type === 'income' ? colors.income : colors.expense },
            ]}
          >
            {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
          </Text>
          <View style={styles.switchContainer}>
            <Switch
              value={item.is_active}
              onValueChange={() => handleToggle(item.id)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={item.is_active ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddRecurringTransaction', { transaction: item })}
        >
          <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <MaterialCommunityIcons name="delete" size={20} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Receitas Mensais
          </Text>
          <Text style={[styles.summaryValue, { color: colors.income }]}>
            {formatCurrency(monthlyIncome)}
          </Text>
        </Card>

        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Despesas Mensais
          </Text>
          <Text style={[styles.summaryValue, { color: colors.expense }]}>
            {formatCurrency(monthlyExpense)}
          </Text>
        </Card>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        {(['all', 'income', 'expense'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              filter === type && { backgroundColor: colors.primary },
            ]}
            onPress={() => setFilter(type)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === type ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {type === 'all' ? 'Todas' : type === 'income' ? 'Receitas' : 'Despesas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="repeat"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma transação recorrente
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Adicione suas receitas e despesas fixas
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddRecurringTransaction')}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    summaryContainer: {
      flexDirection: 'row',
      padding: 16,
      paddingBottom: 0,
      gap: 12,
    },
    summaryCard: {
      flex: 1,
      alignItems: 'center',
      padding: 16,
    },
    summaryLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    filterContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 8,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: 'center',
    },
    filterText: {
      fontSize: 14,
      fontWeight: '500',
    },
    listContent: {
      padding: 16,
      paddingTop: 0,
      paddingBottom: 100,
    },
    card: {
      marginBottom: 12,
      padding: 0,
      overflow: 'hidden',
    },
    cardContent: {
      flexDirection: 'row',
      padding: 16,
      alignItems: 'center',
    },
    iconContainer: {
      marginRight: 12,
    },
    iconBackground: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: {
      flex: 1,
    },
    description: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    details: {
      fontSize: 13,
      marginBottom: 4,
    },
    frequencyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    frequency: {
      fontSize: 12,
    },
    nextDate: {
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 8,
    },
    rightContainer: {
      alignItems: 'flex-end',
    },
    amount: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
    },
    switchContainer: {
      transform: [{ scale: 0.8 }],
    },
    cardActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      gap: 6,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '500',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      marginTop: 4,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
  });
