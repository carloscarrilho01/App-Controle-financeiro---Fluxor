import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useDebts } from '../hooks/useDebts';
import { Card, Button, Input } from '../components';
import { Debt, DEBT_TYPES } from '../types';
import { format, addMonths, differenceInMonths } from 'date-fns';
import { toBrazilianDate, parseBrazilianDate } from '../utils/formatters';
import { spacing } from '../utils/responsive';

export function AddDebtScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { createDebt, updateDebt } = useDebts();

  const editingDebt: Debt | undefined = route.params?.debt;

  const [name, setName] = useState(editingDebt?.name || '');
  const [type, setType] = useState<keyof typeof DEBT_TYPES>(
    editingDebt?.type || 'personal'
  );
  const [creditor, setCreditor] = useState(editingDebt?.creditor || '');
  const [originalAmount, setOriginalAmount] = useState(editingDebt?.original_amount?.toString() || '');
  const [currentBalance, setCurrentBalance] = useState(editingDebt?.current_balance?.toString() || '');
  const [interestRate, setInterestRate] = useState(editingDebt?.interest_rate?.toString() || '');
  const [minimumPayment, setMinimumPayment] = useState(editingDebt?.monthly_payment?.toString() || '');
  const [dueDay, setDueDay] = useState(editingDebt?.due_day?.toString() || '');
  const [startDate, setStartDate] = useState(
    toBrazilianDate(editingDebt?.start_date || format(new Date(), 'yyyy-MM-dd'))
  );
  const [endDate, setEndDate] = useState(editingDebt?.end_date ? toBrazilianDate(editingDebt.end_date) : '');
  const [notes, setNotes] = useState(editingDebt?.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome da dívida');
      return;
    }
    if (!originalAmount || parseFloat(originalAmount) <= 0) {
      Alert.alert('Erro', 'Informe o valor original');
      return;
    }

    setLoading(true);

    try {
      const balance = currentBalance ? parseFloat(currentBalance) : parseFloat(originalAmount);

      const data = {
        name: name.trim(),
        type,
        creditor: creditor.trim() || '',
        original_amount: parseFloat(originalAmount),
        current_balance: balance,
        interest_rate: interestRate ? parseFloat(interestRate) : 0,
        monthly_payment: minimumPayment ? parseFloat(minimumPayment) : 0,
        due_day: dueDay ? parseInt(dueDay) : undefined,
        start_date: parseBrazilianDate(startDate),
        end_date: endDate ? parseBrazilianDate(endDate) : undefined,
        notes: notes.trim() || undefined,
        is_active: true,
        paid_installments: editingDebt?.paid_installments || 0,
      };

      if (editingDebt) {
        const { error } = await updateDebt(editingDebt.id, data);
        if (error) throw new Error(error);
      } else {
        const { error } = await createDebt(data);
        if (error) throw new Error(error);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar');
    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated payoff
  const calculatePayoff = () => {
    const balance = currentBalance ? parseFloat(currentBalance) : parseFloat(originalAmount);
    const payment = minimumPayment ? parseFloat(minimumPayment) : 0;
    const rate = interestRate ? parseFloat(interestRate) / 100 / 12 : 0;

    if (!balance || !payment || payment <= 0) return null;

    if (rate === 0) {
      const months = Math.ceil(balance / payment);
      return { months, totalPaid: balance };
    }

    // Calculate months to pay off with interest
    let remaining = balance;
    let months = 0;
    let totalPaid = 0;
    const maxMonths = 600; // 50 years max

    while (remaining > 0 && months < maxMonths) {
      const interest = remaining * rate;
      const principal = Math.min(payment - interest, remaining);

      if (principal <= 0) {
        return { months: -1, totalPaid: 0 }; // Payment too low
      }

      remaining -= principal;
      totalPaid += payment;
      months++;
    }

    return { months, totalPaid };
  };

  const payoffEstimate = calculatePayoff();

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Name */}
      <Input
        label="Nome da Dívida"
        value={name}
        onChangeText={setName}
        placeholder="Ex: Financiamento Carro, Empréstimo..."
      />

      {/* Type */}
      <Text style={[styles.label, { color: colors.text }]}>Tipo de Dívida</Text>
      <View style={styles.typeContainer}>
        {(Object.keys(DEBT_TYPES) as Array<keyof typeof DEBT_TYPES>).map((debtType) => (
          <TouchableOpacity
            key={debtType}
            style={[
              styles.typeButton,
              { backgroundColor: colors.card },
              type === debtType && { backgroundColor: colors.expense },
            ]}
            onPress={() => setType(debtType)}
          >
            <MaterialCommunityIcons
              name={DEBT_TYPES[debtType].icon as any}
              size={18}
              color={type === debtType ? '#FFFFFF' : colors.text}
            />
            <Text
              style={[
                styles.typeText,
                { color: type === debtType ? '#FFFFFF' : colors.text },
              ]}
            >
              {DEBT_TYPES[debtType].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Creditor */}
      <Input
        label="Credor (opcional)"
        value={creditor}
        onChangeText={setCreditor}
        placeholder="Ex: Banco X, Financeira Y..."
      />

      {/* Original Amount */}
      <Input
        label="Valor Original"
        value={originalAmount}
        onChangeText={setOriginalAmount}
        placeholder="0,00"
        keyboardType="decimal-pad"
        leftIcon={
          <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>R$</Text>
        }
      />

      {/* Current Balance */}
      <Input
        label="Saldo Atual (deixe vazio se for o valor original)"
        value={currentBalance}
        onChangeText={setCurrentBalance}
        placeholder="0,00"
        keyboardType="decimal-pad"
        leftIcon={
          <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>R$</Text>
        }
      />

      {/* Progress Card */}
      {originalAmount && parseFloat(originalAmount) > 0 && (
        <Card style={styles.progressCard}>
          <Text style={[styles.progressTitle, { color: colors.textSecondary }]}>
            Progresso do Pagamento
          </Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: colors.income,
                  width: `${Math.min(
                    100,
                    ((parseFloat(originalAmount) - (parseFloat(currentBalance) || parseFloat(originalAmount))) /
                      parseFloat(originalAmount)) *
                      100
                  )}%`,
                },
              ]}
            />
          </View>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: colors.income }]}>
              Pago: R$ {(parseFloat(originalAmount) - (parseFloat(currentBalance) || parseFloat(originalAmount))).toFixed(2).replace('.', ',')}
            </Text>
            <Text style={[styles.progressText, { color: colors.expense }]}>
              Restante: R$ {(parseFloat(currentBalance) || parseFloat(originalAmount)).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </Card>
      )}

      {/* Interest Rate */}
      <Input
        label="Taxa de Juros Mensal (%)"
        value={interestRate}
        onChangeText={setInterestRate}
        placeholder="0,00"
        keyboardType="decimal-pad"
        leftIcon={
          <MaterialCommunityIcons name="percent" size={18} color={colors.textSecondary} />
        }
      />

      {/* Minimum Payment */}
      <Input
        label="Pagamento Mínimo/Parcela"
        value={minimumPayment}
        onChangeText={setMinimumPayment}
        placeholder="0,00"
        keyboardType="decimal-pad"
        leftIcon={
          <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>R$</Text>
        }
      />

      {/* Payoff Estimate */}
      {payoffEstimate && (
        <Card style={[styles.estimateCard, { borderColor: payoffEstimate.months === -1 ? colors.expense : colors.primary }]}>
          {payoffEstimate.months === -1 ? (
            <>
              <MaterialCommunityIcons name="alert" size={24} color={colors.expense} />
              <Text style={[styles.estimateWarning, { color: colors.expense }]}>
                Pagamento insuficiente para cobrir os juros!
              </Text>
            </>
          ) : (
            <>
              <View style={styles.estimateRow}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.primary} />
                <View style={styles.estimateInfo}>
                  <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>
                    Tempo para quitar
                  </Text>
                  <Text style={[styles.estimateValue, { color: colors.text }]}>
                    {payoffEstimate.months} {payoffEstimate.months === 1 ? 'mês' : 'meses'}
                    {payoffEstimate.months >= 12 && ` (${Math.floor(payoffEstimate.months / 12)} anos e ${payoffEstimate.months % 12} meses)`}
                  </Text>
                </View>
              </View>
              <View style={[styles.estimateRow, { marginTop: 12 }]}>
                <MaterialCommunityIcons name="cash" size={24} color={colors.primary} />
                <View style={styles.estimateInfo}>
                  <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>
                    Total a pagar
                  </Text>
                  <Text style={[styles.estimateValue, { color: colors.text }]}>
                    R$ {payoffEstimate.totalPaid.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              </View>
              {interestRate && parseFloat(interestRate) > 0 && (
                <View style={[styles.estimateRow, { marginTop: 12 }]}>
                  <MaterialCommunityIcons name="trending-up" size={24} color={colors.expense} />
                  <View style={styles.estimateInfo}>
                    <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>
                      Total em juros
                    </Text>
                    <Text style={[styles.estimateValue, { color: colors.expense }]}>
                      R$ {(payoffEstimate.totalPaid - (parseFloat(currentBalance) || parseFloat(originalAmount))).toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </Card>
      )}

      {/* Due Day */}
      <Input
        label="Dia do Vencimento"
        value={dueDay}
        onChangeText={setDueDay}
        placeholder="Ex: 10"
        keyboardType="number-pad"
      />

      {/* Dates */}
      <Input
        label="Data de Início"
        value={startDate}
        onChangeText={setStartDate}
        placeholder="DD/MM/AAAA"
      />

      <Input
        label="Data de Término Prevista (opcional)"
        value={endDate}
        onChangeText={setEndDate}
        placeholder="DD/MM/AAAA"
      />

      {/* Notes */}
      <Input
        label="Observações (opcional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Anotações sobre a dívida..."
        multiline={true}
        numberOfLines={3}
      />

      {/* Save Button */}
      <Button
        title={editingDebt ? 'Salvar Alterações' : 'Adicionar Dívida'}
        onPress={handleSave}
        loading={loading}
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: spacing.bottomSafe,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
      marginTop: 16,
    },
    currencySymbol: {
      fontSize: 16,
      fontWeight: '500',
    },
    typeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
    },
    typeText: {
      fontSize: 12,
      fontWeight: '500',
    },
    progressCard: {
      marginTop: 16,
      padding: 16,
    },
    progressTitle: {
      fontSize: 13,
      fontWeight: '500',
      marginBottom: 12,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 4,
    },
    progressInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    progressText: {
      fontSize: 13,
      fontWeight: '500',
    },
    estimateCard: {
      marginTop: 16,
      padding: 16,
      borderWidth: 1,
    },
    estimateWarning: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: 8,
      textAlign: 'center',
    },
    estimateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    estimateInfo: {
      flex: 1,
    },
    estimateLabel: {
      fontSize: 13,
      fontWeight: '500',
    },
    estimateValue: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 2,
    },
    saveButton: {
      marginTop: 24,
    },
  });
