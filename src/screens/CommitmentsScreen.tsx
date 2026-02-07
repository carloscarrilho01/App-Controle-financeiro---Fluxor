import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, TutorialTooltip, SCREEN_TUTORIALS } from '../components';
import { useBills } from '../hooks/useBills';
import { useDebts } from '../hooks/useDebts';
import { useRecurringTransactions } from '../hooks/useRecurringTransactions';
import { useCategories } from '../hooks/useCategories';
import { Bill, Debt, RecurringTransaction, COLORS, DEBT_TYPES, FREQUENCIES } from '../types';
import { formatCurrency } from '../utils/formatters';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { wp, hp, fs, spacing, borderRadius, iconSize } from '../utils/responsive';

type CommitmentTab = 'bills' | 'recurring' | 'debts';

interface UnifiedCommitment {
  id: string;
  type: 'bill' | 'recurring' | 'debt';
  name: string;
  amount: number;
  dueDate: string | null;
  dueDay: number | null;
  isPaid?: boolean;
  isActive?: boolean;
  category?: string;
  icon: string;
  color: string;
  originalData: Bill | Debt | RecurringTransaction;
  frequency?: string;
  progress?: number;
  remainingAmount?: number;
}

export function CommitmentsScreen({ navigation }: any) {
  const { bills, loading: billsLoading, fetchBills, deleteBill, markAsPaid, markAsUnpaid, getTotalPending, getOverdueBills } = useBills();
  const { debts, loading: debtsLoading, fetchDebts, deleteDebt, getSummary } = useDebts();
  const { recurringTransactions, loading: recurringLoading, fetchRecurringTransactions, deleteRecurringTransaction, getMonthlyTotal } = useRecurringTransactions();
  const { categories } = useCategories();

  const [activeTab, setActiveTab] = useState<CommitmentTab>('bills');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loading = billsLoading || debtsLoading || recurringLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBills(), fetchDebts(), fetchRecurringTransactions()]);
    setRefreshing(false);
  };

  // Estatísticas do resumo
  const totalPendingBills = getTotalPending();
  const overdueBills = getOverdueBills();
  const debtSummary = getSummary();
  const monthlyRecurringExpense = getMonthlyTotal('expense');
  const monthlyRecurringIncome = getMonthlyTotal('income');

  const totalMonthlyCommitments = totalPendingBills + debtSummary.monthlyPayments + monthlyRecurringExpense;

  // Converter dados para formato unificado
  const getUnifiedBills = (): UnifiedCommitment[] => {
    return bills.map(bill => {
      const category = categories.find(c => c.id === bill.category_id);
      const isOverdue = !bill.is_paid && isBefore(parseISO(bill.due_date), new Date());

      return {
        id: bill.id,
        type: 'bill' as const,
        name: bill.name,
        amount: bill.amount,
        dueDate: bill.due_date,
        dueDay: null,
        isPaid: bill.is_paid,
        isActive: !bill.is_paid,
        category: category?.name,
        icon: isOverdue ? 'alert-circle' : (bill.is_paid ? 'check-circle' : 'file-document-outline'),
        color: isOverdue ? COLORS.danger : (bill.is_paid ? COLORS.success : COLORS.expense),
        originalData: bill,
        frequency: bill.is_recurring ? bill.frequency : undefined,
      };
    });
  };

  const getUnifiedRecurring = (): UnifiedCommitment[] => {
    return recurringTransactions.map(recurring => {
      const category = categories.find(c => c.id === recurring.category_id);
      const frequencyInfo = FREQUENCIES[recurring.frequency];

      return {
        id: recurring.id,
        type: 'recurring' as const,
        name: recurring.description,
        amount: recurring.amount,
        dueDate: recurring.next_date,
        dueDay: null,
        isActive: recurring.is_active,
        category: category?.name,
        icon: recurring.type === 'income' ? 'cash-plus' : 'repeat',
        color: recurring.type === 'income' ? COLORS.income : COLORS.primary,
        originalData: recurring,
        frequency: frequencyInfo?.label,
      };
    });
  };

  const getUnifiedDebts = (): UnifiedCommitment[] => {
    return debts.map(debt => {
      const debtType = DEBT_TYPES[debt.type];
      const progress = debt.original_amount > 0
        ? ((debt.original_amount - debt.current_balance) / debt.original_amount) * 100
        : 0;

      return {
        id: debt.id,
        type: 'debt' as const,
        name: debt.name,
        amount: debt.monthly_payment,
        dueDate: null,
        dueDay: debt.due_day || null,
        isActive: debt.is_active,
        category: debtType?.label,
        icon: debtType?.icon || 'cash',
        color: debt.is_active ? COLORS.warning : COLORS.success,
        originalData: debt,
        progress,
        remainingAmount: debt.current_balance,
      };
    });
  };

  const getCurrentData = (): UnifiedCommitment[] => {
    switch (activeTab) {
      case 'bills':
        return getUnifiedBills();
      case 'recurring':
        return getUnifiedRecurring();
      case 'debts':
        return getUnifiedDebts();
      default:
        return [];
    }
  };

  const handleDelete = (item: UnifiedCommitment) => {
    const typeLabels = {
      bill: 'conta',
      recurring: 'despesa fixa',
      debt: 'dívida',
    };

    Alert.alert(
      `Excluir ${typeLabels[item.type]}`,
      `Tem certeza que deseja excluir "${item.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            let result;
            switch (item.type) {
              case 'bill':
                result = await deleteBill(item.id);
                break;
              case 'recurring':
                result = await deleteRecurringTransaction(item.id);
                break;
              case 'debt':
                result = await deleteDebt(item.id);
                break;
            }
            if (result?.error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          },
        },
      ]
    );
  };

  const handleTogglePaid = async (item: UnifiedCommitment) => {
    if (item.type === 'bill') {
      const bill = item.originalData as Bill;
      if (bill.is_paid) {
        await markAsUnpaid(item.id);
      } else {
        await markAsPaid(item.id);
      }
    }
  };

  const handleItemPress = (item: UnifiedCommitment) => {
    switch (item.type) {
      case 'bill':
        navigation.navigate('AddBill', { bill: item.originalData });
        break;
      case 'recurring':
        navigation.navigate('AddRecurringTransaction', { transaction: item.originalData });
        break;
      case 'debt':
        navigation.navigate('DebtDetail', { debt: item.originalData });
        break;
    }
  };

  const handleAddNew = (type: CommitmentTab) => {
    setShowAddModal(false);
    switch (type) {
      case 'bills':
        navigation.navigate('AddBill');
        break;
      case 'recurring':
        navigation.navigate('AddRecurringTransaction');
        break;
      case 'debts':
        navigation.navigate('AddDebt');
        break;
    }
  };

  const formatDueDate = (item: UnifiedCommitment) => {
    if (item.dueDate) {
      return format(parseISO(item.dueDate), "dd 'de' MMM", { locale: ptBR });
    }
    if (item.dueDay) {
      return `Dia ${item.dueDay}`;
    }
    return '';
  };

  const renderItem = ({ item }: { item: UnifiedCommitment }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => handleItemPress(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.itemIconContainer, { backgroundColor: `${item.color}15` }]}>
        <MaterialCommunityIcons name={item.icon as any} size={iconSize.md} color={item.color} />
      </View>

      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {item.frequency && (
            <View style={styles.frequencyBadge}>
              <Text style={styles.frequencyText}>{item.frequency}</Text>
            </View>
          )}
        </View>

        <View style={styles.itemDetails}>
          {item.category && (
            <Text style={styles.itemCategory}>{item.category}</Text>
          )}
          {formatDueDate(item) && (
            <Text style={[
              styles.itemDueDate,
              item.type === 'bill' && !item.isPaid && isBefore(parseISO(item.dueDate!), new Date()) && styles.overdueText
            ]}>
              {formatDueDate(item)}
            </Text>
          )}
        </View>

        {/* Barra de progresso para dívidas */}
        {item.type === 'debt' && item.progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{item.progress.toFixed(0)}%</Text>
          </View>
        )}
      </View>

      <View style={styles.itemRight}>
        <Text style={[styles.itemAmount, { color: item.color }]}>
          {formatCurrency(item.amount)}
        </Text>
        {item.type === 'debt' && item.remainingAmount !== undefined && (
          <Text style={styles.remainingText}>
            Resta: {formatCurrency(item.remainingAmount)}
          </Text>
        )}
        {item.type === 'bill' && (
          <TouchableOpacity
            style={[styles.checkButton, item.isPaid && styles.checkButtonActive]}
            onPress={() => handleTogglePaid(item)}
          >
            <MaterialCommunityIcons
              name={item.isPaid ? 'check-circle' : 'circle-outline'}
              size={iconSize.md}
              color={item.isPaid ? COLORS.success : COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    const emptyMessages = {
      bills: { title: 'Nenhuma conta cadastrada', subtitle: 'Adicione suas contas a pagar' },
      recurring: { title: 'Nenhuma despesa fixa', subtitle: 'Cadastre suas despesas mensais' },
      debts: { title: 'Nenhuma dívida cadastrada', subtitle: 'Gerencie seus financiamentos' },
    };
    const msg = emptyMessages[activeTab];

    return (
      <Card style={styles.emptyCard}>
        <MaterialCommunityIcons
          name={activeTab === 'bills' ? 'file-document-outline' : activeTab === 'recurring' ? 'repeat' : 'credit-card-off'}
          size={iconSize.xxl}
          color={COLORS.textSecondary}
        />
        <Text style={styles.emptyTitle}>{msg.title}</Text>
        <Text style={styles.emptySubtitle}>{msg.subtitle}</Text>
      </Card>
    );
  };

  const tabs: { key: CommitmentTab; label: string; icon: string }[] = [
    { key: 'bills', label: 'Vencimentos', icon: 'file-document' },
    { key: 'recurring', label: 'Fixas', icon: 'repeat' },
    { key: 'debts', label: 'Financiamentos', icon: 'credit-card' },
  ];

  return (
    <View style={styles.container}>
      <TutorialTooltip tutorialKey="commitments" steps={SCREEN_TUTORIALS.bills} />

      {/* Resumo */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Mensal</Text>
            <Text style={[styles.summaryValue, { color: COLORS.expense }]}>
              {formatCurrency(totalMonthlyCommitments)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pendente</Text>
            <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
              {formatCurrency(totalPendingBills)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Atrasadas</Text>
            <Text style={[styles.summaryValue, { color: overdueBills.length > 0 ? COLORS.danger : COLORS.success }]}>
              {overdueBills.length}
            </Text>
          </View>
        </View>
      </Card>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={iconSize.sm}
              color={activeTab === tab.key ? '#FFF' : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={getCurrentData()}
        keyExtractor={item => `${item.type}-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState()}
        ListFooterComponent={
          <Text style={styles.hint}>
            Pressione e segure para excluir
          </Text>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <MaterialCommunityIcons name="plus" size={iconSize.lg} color="#FFF" />
      </TouchableOpacity>

      {/* Modal de Adicionar */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Compromisso</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleAddNew('bills')}
            >
              <View style={[styles.modalIconContainer, { backgroundColor: `${COLORS.expense}15` }]}>
                <MaterialCommunityIcons name="file-document" size={iconSize.md} color={COLORS.expense} />
              </View>
              <View style={styles.modalOptionInfo}>
                <Text style={styles.modalOptionTitle}>Conta a Pagar</Text>
                <Text style={styles.modalOptionDescription}>Boletos, faturas pontuais</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleAddNew('recurring')}
            >
              <View style={[styles.modalIconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
                <MaterialCommunityIcons name="repeat" size={iconSize.md} color={COLORS.primary} />
              </View>
              <View style={styles.modalOptionInfo}>
                <Text style={styles.modalOptionTitle}>Despesa Fixa</Text>
                <Text style={styles.modalOptionDescription}>Aluguel, assinaturas, mensalidades</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleAddNew('debts')}
            >
              <View style={[styles.modalIconContainer, { backgroundColor: `${COLORS.warning}15` }]}>
                <MaterialCommunityIcons name="credit-card" size={iconSize.md} color={COLORS.warning} />
              </View>
              <View style={styles.modalOptionInfo}>
                <Text style={styles.modalOptionTitle}>Financiamento/Dívida</Text>
                <Text style={styles.modalOptionDescription}>Empréstimos, parcelamentos</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  summaryCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
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
    height: hp(40),
    backgroundColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: fs(11),
    color: COLORS.textSecondary,
    marginBottom: hp(2),
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(10),
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: fs(12),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: hp(100),
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  itemIconContainer: {
    width: wp(44),
    height: wp(44),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemName: {
    fontSize: fs(15),
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  frequencyBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: hp(2),
    borderRadius: borderRadius.sm,
  },
  frequencyText: {
    fontSize: fs(10),
    color: COLORS.primary,
    fontWeight: '500',
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2),
    gap: spacing.sm,
  },
  itemCategory: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
  },
  itemDueDate: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
  },
  overdueText: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(6),
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: hp(4),
    backgroundColor: COLORS.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fs(10),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  itemRight: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  itemAmount: {
    fontSize: fs(15),
    fontWeight: '700',
  },
  remainingText: {
    fontSize: fs(10),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  checkButton: {
    marginTop: hp(4),
    padding: spacing.xs,
  },
  checkButtonActive: {
    opacity: 1,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: hp(40),
  },
  emptyTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginTop: spacing.xs,
  },
  hint: {
    textAlign: 'center',
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  fab: {
    position: 'absolute',
    right: wp(20),
    bottom: hp(20),
    width: wp(56),
    height: wp(56),
    borderRadius: wp(28),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: hp(40),
  },
  modalTitle: {
    fontSize: fs(18),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: COLORS.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  modalIconContainer: {
    width: wp(48),
    height: wp(48),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  modalOptionInfo: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    color: COLORS.text,
  },
  modalOptionDescription: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancelText: {
    fontSize: fs(15),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
