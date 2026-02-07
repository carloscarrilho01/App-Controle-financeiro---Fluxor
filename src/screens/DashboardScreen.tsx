import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, TransactionItem, AccountCard, TutorialTooltip, SCREEN_TUTORIALS, MiniPieChart, MiniBarChart, HealthScore, QuickStat, AnimatedCard, AnimatedCounter } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useBills } from '../hooks/useBills';
import { useDebts } from '../hooks/useDebts';
import { COLORS, DEBT_TYPES } from '../types';
import { formatCurrency } from '../utils/formatters';
import { wp, hp, fs, spacing, borderRadius, iconSize, widthPercent } from '../utils/responsive';
import { subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { accounts, fetchAccounts, getTotalBalance } = useAccounts();
  const {
    transactions,
    fetchTransactions,
    getMonthSummary,
    getCategorySummary,
    getLast6MonthsSummary,
  } = useTransactions();
  const { categories, fetchCategories } = useCategories();
  const { getUpcomingBills, getTotalPending } = useBills();
  const { debts, fetchDebts, getSummary: getDebtSummary, getUpcomingDebts } = useDebts();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);

  const monthSummary = getMonthSummary();
  const upcomingBills = getUpcomingBills(7);
  const debtSummary = getDebtSummary();
  const activeDebts = debts.filter(d => d.is_active);
  const upcomingDebts = getUpcomingDebts(7);

  // Dados para os gráficos
  const expensesByCategory = getCategorySummary(categories, 'expense');
  const pieChartData = expensesByCategory.slice(0, 6).map(item => ({
    name: item.category.name,
    value: item.total,
    color: item.category.color,
  }));

  // Dados dos últimos 6 meses para gráfico de barras
  const last6Months = getLast6MonthsSummary();
  const barChartData = last6Months.map(month => ({
    label: format(new Date(month.month + '-01'), 'MMM', { locale: ptBR }),
    income: month.income,
    expense: month.expense,
  }));

  // Calcular score de saúde financeira
  const calculateHealthScore = () => {
    let score = 50; // Base

    // Fator 1: Receita vs Despesa (até +30 pontos)
    if (monthSummary.income > 0) {
      const savingsRate = (monthSummary.income - monthSummary.expense) / monthSummary.income;
      score += Math.min(30, savingsRate * 60);
    }

    // Fator 2: Saldo positivo (até +10 pontos)
    if (getTotalBalance() > 0) {
      score += 10;
    } else {
      score -= 10;
    }

    // Fator 3: Contas em dia (até +10 pontos)
    const overdueBills = upcomingBills.filter(b => new Date(b.due_date) < new Date());
    if (overdueBills.length === 0) {
      score += 10;
    } else {
      score -= overdueBills.length * 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const healthScore = calculateHealthScore();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAccounts(), fetchTransactions(), fetchCategories(), fetchDebts()]);
    setRefreshing(false);
  };

  return (
    <>
      <TutorialTooltip tutorialKey="dashboard" steps={SCREEN_TUTORIALS.dashboard} />
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
      <AnimatedCard style={styles.balanceCard} animationType="slideUp" delay={100}>
        <Text style={styles.balanceLabel}>Saldo Total</Text>
        <AnimatedCounter
          value={getTotalBalance()}
          duration={1200}
          formatter={(v) => formatCurrency(v)}
          textStyle={styles.balanceValue}
        />
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
          {debtSummary.totalRemaining > 0 && (
            <View style={styles.balanceItem}>
              <View style={[styles.indicator, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.balanceItemLabel}>Parcelas de dívidas</Text>
              <Text style={[styles.balanceItemValue, { color: COLORS.warning }]}>
                {formatCurrency(debtSummary.monthlyPayments)}
              </Text>
            </View>
          )}
        </View>
      </AnimatedCard>

      {/* Score de Saúde Financeira */}
      <HealthScore score={healthScore} />

      {/* Estatísticas Rápidas */}
      <View style={styles.quickStatsRow}>
        <QuickStat
          icon="cash-plus"
          label="Economia"
          value={formatCurrency(Math.max(0, monthSummary.income - monthSummary.expense))}
          change={monthSummary.income > 0 ? Math.round(((monthSummary.income - monthSummary.expense) / monthSummary.income) * 100) : 0}
        />
        <View style={{ width: spacing.sm }} />
        <QuickStat
          icon="chart-bar"
          label="Transações"
          value={transactions.length.toString()}
        />
        <View style={{ width: spacing.sm }} />
        <QuickStat
          icon="target"
          label="Metas"
          value={`${accounts.length}`}
        />
      </View>

      {/* Gráfico de Gastos por Categoria */}
      {pieChartData.length > 0 && (
        <MiniPieChart
          data={pieChartData}
          title="Gastos por Categoria"
          size={wp(100)}
        />
      )}

      {/* Gráfico de Evolução Mensal */}
      {barChartData.some(d => d.income > 0 || d.expense > 0) && (
        <MiniBarChart
          data={barChartData}
          title="Evolução dos Últimos 6 Meses"
        />
      )}

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

      {/* Contas a Pagar + Dívidas vencendo */}
      {(upcomingBills.length > 0 || upcomingDebts.length > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximos Vencimentos</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Commitments')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.pendingAmount}>
            {formatCurrency(getTotalPending() + upcomingDebts.reduce((sum, d) => sum + (d.monthly_payment || 0), 0))} pendente
          </Text>
          {upcomingBills.slice(0, 3).map(bill => (
            <TouchableOpacity
              key={bill.id}
              style={styles.billItem}
              onPress={() => navigation.navigate('Commitments')}
            >
              <MaterialCommunityIcons name="file-document" size={18} color={COLORS.expense} style={{ marginRight: spacing.sm }} />
              <Text style={styles.billName} numberOfLines={1}>{bill.name}</Text>
              <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
            </TouchableOpacity>
          ))}
          {upcomingDebts.slice(0, 3).map(debt => (
            <TouchableOpacity
              key={debt.id}
              style={styles.billItem}
              onPress={() => navigation.navigate('Commitments')}
            >
              <MaterialCommunityIcons
                name={DEBT_TYPES[debt.type]?.icon as any || 'cash'}
                size={18}
                color={COLORS.warning}
                style={{ marginRight: spacing.sm }}
              />
              <Text style={styles.billName} numberOfLines={1}>
                {debt.name} (dia {debt.due_day})
              </Text>
              <Text style={[styles.billAmount, { color: COLORS.warning }]}>
                {formatCurrency(debt.monthly_payment || 0)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Dívidas */}
      {activeDebts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dívidas</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Commitments')}>
              <Text style={styles.seeAll}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          <Card style={styles.debtSummaryCard}>
            <View style={styles.debtSummaryRow}>
              <View style={styles.debtSummaryItem}>
                <Text style={styles.debtSummaryLabel}>Total em dívidas</Text>
                <Text style={[styles.debtSummaryValue, { color: COLORS.expense }]}>
                  {formatCurrency(debtSummary.totalRemaining)}
                </Text>
              </View>
              <View style={styles.debtSummaryItem}>
                <Text style={styles.debtSummaryLabel}>Parcelas/mês</Text>
                <Text style={[styles.debtSummaryValue, { color: COLORS.text }]}>
                  {formatCurrency(debtSummary.monthlyPayments)}
                </Text>
              </View>
            </View>
            {/* Barra de progresso geral */}
            {debtSummary.totalDebt > 0 && (
              <View style={styles.debtProgressContainer}>
                <View style={styles.debtProgressHeader}>
                  <Text style={styles.debtProgressLabel}>Progresso geral</Text>
                  <Text style={styles.debtProgressPercent}>
                    {((debtSummary.totalPaid / debtSummary.totalDebt) * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.debtProgressBar}>
                  <View
                    style={[
                      styles.debtProgressFill,
                      { width: `${Math.min(100, (debtSummary.totalPaid / debtSummary.totalDebt) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </Card>
          {/* Lista resumida das dívidas */}
          {activeDebts.slice(0, 3).map(debt => {
            const typeInfo = DEBT_TYPES[debt.type];
            const progress = debt.original_amount > 0
              ? ((debt.original_amount - debt.current_balance) / debt.original_amount) * 100
              : 0;
            return (
              <TouchableOpacity
                key={debt.id}
                style={styles.debtItem}
                onPress={() => navigation.navigate('DebtDetail', { debt })}
              >
                <MaterialCommunityIcons
                  name={typeInfo?.icon as any || 'cash'}
                  size={20}
                  color={COLORS.expense}
                />
                <View style={styles.debtItemInfo}>
                  <Text style={styles.debtItemName} numberOfLines={1}>{debt.name}</Text>
                  <View style={styles.debtItemProgressBar}>
                    <View style={[styles.debtItemProgressFill, { width: `${progress}%` }]} />
                  </View>
                </View>
                <Text style={styles.debtItemAmount}>{formatCurrency(debt.current_balance)}</Text>
              </TouchableOpacity>
            );
          })}
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
    </>
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
  // Debt styles
  debtSummaryCard: {
    marginBottom: spacing.sm,
  },
  debtSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  debtSummaryItem: {
    flex: 1,
  },
  debtSummaryLabel: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginBottom: hp(2),
  },
  debtSummaryValue: {
    fontSize: fs(18),
    fontWeight: '700',
  },
  debtProgressContainer: {
    marginTop: spacing.md,
  },
  debtProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(4),
  },
  debtProgressLabel: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
  },
  debtProgressPercent: {
    fontSize: fs(12),
    fontWeight: '600',
    color: COLORS.income,
  },
  debtProgressBar: {
    height: hp(6),
    backgroundColor: COLORS.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  debtProgressFill: {
    height: '100%',
    backgroundColor: COLORS.income,
    borderRadius: borderRadius.full,
  },
  debtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: hp(12),
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  debtItemInfo: {
    flex: 1,
  },
  debtItemName: {
    fontSize: fs(14),
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: hp(4),
  },
  debtItemProgressBar: {
    height: hp(4),
    backgroundColor: COLORS.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  debtItemProgressFill: {
    height: '100%',
    backgroundColor: COLORS.income,
    borderRadius: borderRadius.full,
  },
  debtItemAmount: {
    fontSize: fs(14),
    color: COLORS.expense,
    fontWeight: '600',
  },
  quickStatsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
});
