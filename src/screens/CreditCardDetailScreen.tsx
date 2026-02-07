import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCreditCards } from '../hooks/useCreditCards';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { Card, Button, Input } from '../components';
import { formatCurrency } from '../utils/formatters';
import { format, parseISO, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Account, CreditCardBill, Transaction } from '../types';

export function CreditCardDetailScreen({ navigation, route }: any) {
  const { account } = route.params as { account: Account };
  const { colors } = useTheme();
  const {
    bills,
    installments,
    fetchBills,
    fetchInstallments,
    getCurrentBill,
    payBill,
    getActiveInstallments,
    getDueDate,
    getClosingDate,
  } = useCreditCards();
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { updateAccount } = useAccounts();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'installments' | 'history'>('transactions');

  useEffect(() => {
    fetchBills(account.id);
    fetchInstallments(account.id);
  }, [account.id]);

  // Fatura do mês selecionado
  const selectedBill = useMemo(() => {
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();
    return bills.find(b =>
      b.account_id === account.id &&
      b.month === month &&
      b.year === year
    );
  }, [bills, selectedMonth, account.id]);

  // Transações do período da fatura
  const billTransactions = useMemo(() => {
    if (!account.closing_day) return [];

    const closingDay = account.closing_day;
    const month = selectedMonth.getMonth();
    const year = selectedMonth.getFullYear();

    // Período da fatura: do dia após fechamento do mês anterior até o fechamento do mês atual
    const prevMonth = subMonths(selectedMonth, 1);
    const startDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), closingDay + 1);
    const endDate = new Date(year, month, closingDay);

    return transactions.filter(t =>
      t.account_id === account.id &&
      t.type === 'expense' &&
      parseISO(t.date) >= startDate &&
      parseISO(t.date) <= endDate
    ).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [transactions, selectedMonth, account]);

  // Parcelamentos ativos deste cartão
  const cardInstallments = useMemo(() => {
    return installments.filter(i =>
      i.account_id === account.id &&
      i.paid_installments < i.total_installments
    );
  }, [installments, account.id]);

  // Cálculos
  const usedLimit = selectedBill?.total_amount || billTransactions.reduce((sum, t) => sum + t.amount, 0);
  const availableLimit = (account.credit_limit || 0) - usedLimit;
  const usagePercent = account.credit_limit ? (usedLimit / account.credit_limit) * 100 : 0;

  // Próximas datas
  const dueDate = getDueDate(
    account.due_day || 10,
    account.closing_day || 1,
    selectedMonth.getMonth() + 1,
    selectedMonth.getFullYear()
  );

  const closingDate = getClosingDate(
    account.closing_day || 1,
    selectedMonth.getMonth() + 1,
    selectedMonth.getFullYear()
  );

  const handlePayBill = async () => {
    if (!selectedBill) {
      Alert.alert('Erro', 'Nenhuma fatura selecionada');
      return;
    }

    const amount = parseFloat(payAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }

    setPaying(true);
    const result = await payBill(selectedBill.id, amount);
    setPaying(false);

    if (result.error) {
      Alert.alert('Erro', result.error);
    } else {
      Alert.alert('Sucesso', 'Pagamento registrado!');
      setShowPayModal(false);
      setPayAmount('');
      fetchBills(account.id);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || colors.textSecondary;
  };

  const styles = createStyles(colors);

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={[styles.transactionItem, { borderLeftColor: getCategoryColor(item.category_id) }]}>
      <View style={styles.transactionInfo}>
        <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
          {format(parseISO(item.date), 'dd/MM')}
        </Text>
        <Text style={[styles.transactionDesc, { color: colors.text }]} numberOfLines={1}>
          {item.description || 'Sem descrição'}
        </Text>
        <Text style={[styles.transactionCategory, { color: colors.textSecondary }]}>
          {getCategoryName(item.category_id)}
          {item.total_installments && item.total_installments > 1 && (
            ` (${item.installment_number}/${item.total_installments})`
          )}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: colors.expense }]}>
        -{formatCurrency(item.amount)}
      </Text>
    </View>
  );

  const renderInstallment = ({ item }: { item: any }) => {
    const remaining = item.total_installments - item.paid_installments;
    const progress = (item.paid_installments / item.total_installments) * 100;

    return (
      <Card style={styles.installmentCard}>
        <View style={styles.installmentHeader}>
          <Text style={[styles.installmentDesc, { color: colors.text }]}>
            {item.description}
          </Text>
          <Text style={[styles.installmentValue, { color: colors.expense }]}>
            {formatCurrency(item.installment_amount)}/mês
          </Text>
        </View>
        <View style={styles.installmentProgress}>
          <View style={[styles.installmentProgressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.installmentProgressFill,
                { backgroundColor: colors.primary, width: `${progress}%` },
              ]}
            />
          </View>
          <Text style={[styles.installmentProgressText, { color: colors.textSecondary }]}>
            {item.paid_installments}/{item.total_installments} pagas
          </Text>
        </View>
        <Text style={[styles.installmentRemaining, { color: colors.textSecondary }]}>
          Faltam {remaining} parcelas • Total restante: {formatCurrency(remaining * item.installment_amount)}
        </Text>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header do Cartão */}
      <View style={[styles.header, { backgroundColor: account.color || colors.primary }]}>
        <View style={styles.cardVisual}>
          <View style={styles.cardChip}>
            <MaterialCommunityIcons name="sim" size={24} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={styles.cardName}>{account.name}</Text>
          <Text style={styles.cardBank}>{account.institution || 'Cartão de Crédito'}</Text>
        </View>

        {/* Limite */}
        <View style={styles.limitInfo}>
          <View style={styles.limitRow}>
            <View>
              <Text style={styles.limitLabel}>Fatura Atual</Text>
              <Text style={styles.limitValue}>{formatCurrency(usedLimit)}</Text>
            </View>
            <View style={styles.limitDivider} />
            <View>
              <Text style={styles.limitLabel}>Disponível</Text>
              <Text style={styles.limitValue}>{formatCurrency(availableLimit)}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, usagePercent)}%`,
                    backgroundColor: usagePercent > 80 ? '#EF4444' : 'rgba(255,255,255,0.9)',
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {usagePercent.toFixed(0)}% do limite de {formatCurrency(account.credit_limit || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Seletor de Mês */}
      <View style={styles.monthSelector}>
        <TouchableOpacity
          onPress={() => setSelectedMonth(subMonths(selectedMonth, 1))}
          style={styles.monthArrow}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.monthInfo}>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </Text>
          <Text style={[styles.dueText, { color: colors.textSecondary }]}>
            Vencimento: {format(dueDate, 'dd/MM')} • Fechamento: {format(closingDate, 'dd/MM')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setSelectedMonth(addMonths(selectedMonth, 1))}
          style={styles.monthArrow}
        >
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Status da Fatura */}
      {selectedBill && (
        <View style={[styles.billStatus, { backgroundColor: colors.card }]}>
          <View style={styles.billStatusInfo}>
            <View
              style={[
                styles.billStatusBadge,
                {
                  backgroundColor: selectedBill.is_paid
                    ? colors.income + '20'
                    : new Date() > parseISO(selectedBill.due_date)
                    ? colors.expense + '20'
                    : colors.warning + '20',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={selectedBill.is_paid ? 'check-circle' : 'clock-outline'}
                size={16}
                color={
                  selectedBill.is_paid
                    ? colors.income
                    : new Date() > parseISO(selectedBill.due_date)
                    ? colors.expense
                    : colors.warning
                }
              />
              <Text
                style={[
                  styles.billStatusText,
                  {
                    color: selectedBill.is_paid
                      ? colors.income
                      : new Date() > parseISO(selectedBill.due_date)
                      ? colors.expense
                      : colors.warning,
                  },
                ]}
              >
                {selectedBill.is_paid
                  ? 'Paga'
                  : new Date() > parseISO(selectedBill.due_date)
                  ? 'Vencida'
                  : 'Em aberto'}
              </Text>
            </View>
            {selectedBill.paid_amount > 0 && !selectedBill.is_paid && (
              <Text style={[styles.partialPaid, { color: colors.textSecondary }]}>
                Pago parcialmente: {formatCurrency(selectedBill.paid_amount)}
              </Text>
            )}
          </View>
          {!selectedBill.is_paid && (
            <Button
              title="Pagar"
              onPress={() => {
                setPayAmount((selectedBill.total_amount - selectedBill.paid_amount).toFixed(2).replace('.', ','));
                setShowPayModal(true);
              }}
              style={styles.payButton}
            />
          )}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'transactions' ? colors.primary : colors.textSecondary },
            ]}
          >
            Lançamentos ({billTransactions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'installments' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('installments')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'installments' ? colors.primary : colors.textSecondary },
            ]}
          >
            Parcelamentos ({cardInstallments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'transactions' ? (
        billTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="credit-card-off" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum lançamento neste período
            </Text>
          </View>
        ) : (
          <FlatList
            data={billTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : (
        cardInstallments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum parcelamento ativo
            </Text>
          </View>
        ) : (
          <FlatList
            data={cardInstallments}
            renderItem={renderInstallment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )
      )}

      {/* FAB para adicionar compra */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddCreditCardPurchase', { account })}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal de Pagamento */}
      <Modal visible={showPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Pagar Fatura
              </Text>
              <TouchableOpacity onPress={() => setShowPayModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Fatura de {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </Text>

            {selectedBill && (
              <View style={[styles.billSummary, { backgroundColor: colors.background }]}>
                <View style={styles.billSummaryRow}>
                  <Text style={[styles.billSummaryLabel, { color: colors.textSecondary }]}>
                    Valor total
                  </Text>
                  <Text style={[styles.billSummaryValue, { color: colors.text }]}>
                    {formatCurrency(selectedBill.total_amount)}
                  </Text>
                </View>
                <View style={styles.billSummaryRow}>
                  <Text style={[styles.billSummaryLabel, { color: colors.textSecondary }]}>
                    Já pago
                  </Text>
                  <Text style={[styles.billSummaryValue, { color: colors.income }]}>
                    {formatCurrency(selectedBill.paid_amount)}
                  </Text>
                </View>
                <View style={[styles.billSummaryRow, styles.billSummaryTotal]}>
                  <Text style={[styles.billSummaryLabel, { color: colors.text, fontWeight: '600' }]}>
                    Restante
                  </Text>
                  <Text style={[styles.billSummaryValue, { color: colors.expense, fontWeight: '700' }]}>
                    {formatCurrency(selectedBill.total_amount - selectedBill.paid_amount)}
                  </Text>
                </View>
              </View>
            )}

            <Input
              label="Valor do Pagamento"
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                onPress={() => setShowPayModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Confirmar"
                onPress={handlePayBill}
                loading={paying}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      padding: 20,
      paddingTop: 24,
    },
    cardVisual: {
      marginBottom: 24,
    },
    cardChip: {
      marginBottom: 24,
    },
    cardName: {
      fontSize: 22,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    cardBank: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
    },
    limitInfo: {
      backgroundColor: 'rgba(0,0,0,0.15)',
      borderRadius: 12,
      padding: 16,
    },
    limitRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    limitLabel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      textAlign: 'center',
    },
    limitValue: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
      textAlign: 'center',
      marginTop: 4,
    },
    limitDivider: {
      width: 1,
      height: 40,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    progressContainer: {
      marginTop: 16,
    },
    progressBar: {
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 8,
      textAlign: 'center',
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    monthArrow: {
      padding: 4,
    },
    monthInfo: {
      alignItems: 'center',
    },
    monthText: {
      fontSize: 16,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    dueText: {
      fontSize: 12,
      marginTop: 4,
    },
    billStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
    },
    billStatusInfo: {},
    billStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    billStatusText: {
      fontSize: 13,
      fontWeight: '600',
    },
    partialPaid: {
      fontSize: 12,
      marginTop: 6,
    },
    payButton: {
      paddingHorizontal: 24,
    },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginTop: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
    },
    listContent: {
      padding: 16,
      paddingBottom: 100,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
      marginBottom: 8,
      borderLeftWidth: 4,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDate: {
      fontSize: 12,
    },
    transactionDesc: {
      fontSize: 14,
      fontWeight: '500',
      marginTop: 2,
    },
    transactionCategory: {
      fontSize: 12,
      marginTop: 2,
    },
    transactionAmount: {
      fontSize: 15,
      fontWeight: '600',
    },
    installmentCard: {
      marginBottom: 12,
      padding: 16,
    },
    installmentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    installmentDesc: {
      fontSize: 15,
      fontWeight: '600',
      flex: 1,
    },
    installmentValue: {
      fontSize: 15,
      fontWeight: '600',
    },
    installmentProgress: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
    },
    installmentProgressBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    installmentProgressFill: {
      height: '100%',
      borderRadius: 2,
    },
    installmentProgressText: {
      fontSize: 12,
      fontWeight: '500',
    },
    installmentRemaining: {
      fontSize: 12,
      marginTop: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 15,
      marginTop: 12,
      textAlign: 'center',
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 32,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
    },
    modalSubtitle: {
      fontSize: 14,
      marginBottom: 16,
      textTransform: 'capitalize',
    },
    billSummary: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    billSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    billSummaryTotal: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
      paddingTop: 16,
    },
    billSummaryLabel: {
      fontSize: 14,
    },
    billSummaryValue: {
      fontSize: 14,
      fontWeight: '500',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    modalButton: {
      flex: 1,
    },
  });
