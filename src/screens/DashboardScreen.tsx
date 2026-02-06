import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, TransactionItem, AccountCard } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useBills } from '../hooks/useBills';
import { COLORS } from '../types';
import { formatCurrency } from '../utils/formatters';
import { wp, hp, fs, spacing, borderRadius, iconSize, widthPercent } from '../utils/responsive';

export function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { accounts, fetchAccounts, getTotalBalance } = useAccounts();
  const {
    transactions,
    fetchTransactions,
    getMonthSummary,
  } = useTransactions();
  const { categories, fetchCategories } = useCategories();
  const { getUpcomingBills, getTotalPending } = useBills();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);

  const monthSummary = getMonthSummary();
  const upcomingBills = getUpcomingBills(7);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAccounts(), fetchTransactions(), fetchCategories()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: hp(20) + insets.bottom }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, {user?.user_metadata?.name || 'Usuário'}!</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      {/* Saldo Total */}
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo Total</Text>
        <Text style={styles.balanceValue} adjustsFontSizeToFit numberOfLines={1}>
          {formatCurrency(getTotalBalance())}
        </Text>
        <View style={styles.balanceDetails}>
          <View style={styles.balanceItem}>
            <View style={[styles.indicator, { backgroundColor: COLORS.income }]} />
            <Text style={styles.balanceItemLabel}>Receitas do mês</Text>
            <Text style={[styles.balanceItemValue, { color: COLORS.income }]}>
              {formatCurrency(monthSummary.income)}
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <View style={[styles.indicator, { backgroundColor: COLORS.expense }]} />
            <Text style={styles.balanceItemLabel}>Despesas do mês</Text>
            <Text style={[styles.balanceItemValue, { color: COLORS.expense }]}>
              {formatCurrency(monthSummary.expense)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Contas */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Minhas Contas</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
            <Text style={styles.seeAll}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onPress={() => navigation.navigate('AccountDetail', { account })}
            />
          ))}
          <TouchableOpacity
            style={styles.addAccountCard}
            onPress={() => navigation.navigate('AddAccount')}
          >
            <MaterialCommunityIcons name="plus" size={iconSize.lg} color={COLORS.primary} />
            <Text style={styles.addText}>Nova Conta</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Contas a Pagar */}
      {upcomingBills.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contas a Pagar</Text>
            <Text style={styles.pendingAmount}>
              {formatCurrency(getTotalPending())} pendente
            </Text>
          </View>
          {upcomingBills.slice(0, 3).map(bill => (
            <TouchableOpacity
              key={bill.id}
              style={styles.billItem}
              onPress={() => navigation.navigate('Bills')}
            >
              <Text style={styles.billName} numberOfLines={1}>{bill.name}</Text>
              <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Últimas Transações */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Últimas Transações</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.seeAll}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        {transactions.slice(0, 5).map(transaction => {
          const category = categories.find(c => c.id === transaction.category_id);
          const account = accounts.find(a => a.id === transaction.account_id);
          return (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              category={category}
              account={account}
              onPress={() => navigation.navigate('TransactionDetail', { transaction })}
            />
          );
        })}
        {transactions.length === 0 && (
          <Card>
            <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: fs(24),
    fontWeight: '700',
    color: COLORS.text,
  },
  date: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginTop: hp(4),
    textTransform: 'capitalize',
  },
  balanceCard: {
    marginBottom: spacing.xl,
  },
  balanceLabel: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginBottom: hp(4),
  },
  balanceValue: {
    fontSize: fs(32),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: spacing.lg,
  },
  balanceDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: spacing.lg,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  indicator: {
    width: wp(8),
    height: wp(8),
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  balanceItemLabel: {
    flex: 1,
    fontSize: fs(14),
    color: COLORS.textSecondary,
  },
  balanceItemValue: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fs(18),
    fontWeight: '600',
    color: COLORS.text,
  },
  seeAll: {
    fontSize: fs(14),
    color: COLORS.primary,
    fontWeight: '500',
  },
  addAccountCard: {
    width: widthPercent(32),
    minWidth: wp(120),
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addText: {
    fontSize: fs(14),
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: hp(14),
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  billName: {
    flex: 1,
    fontSize: fs(15),
    color: COLORS.text,
    fontWeight: '500',
    marginRight: spacing.sm,
  },
  billAmount: {
    fontSize: fs(15),
    color: COLORS.expense,
    fontWeight: '600',
  },
  pendingAmount: {
    fontSize: fs(13),
    color: COLORS.expense,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    paddingVertical: spacing.xl,
    fontSize: fs(14),
  },
});
