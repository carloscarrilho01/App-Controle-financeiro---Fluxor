import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useRecurringTransactions } from '../hooks/useRecurringTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { Card, Button, Input } from '../components';
import { RecurringTransaction, FREQUENCIES } from '../types';
import { format } from 'date-fns';
import { toBrazilianDate, parseBrazilianDate } from '../utils/formatters';
import { spacing } from '../utils/responsive';

export function AddRecurringTransactionScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { createRecurringTransaction, updateRecurringTransaction } = useRecurringTransactions();
  const { categories, incomeCategories, expenseCategories } = useCategories();
  const { accounts } = useAccounts();

  const editingTransaction: RecurringTransaction | undefined = route.params?.transaction;

  const [type, setType] = useState<'income' | 'expense'>(editingTransaction?.type || 'expense');
  const [description, setDescription] = useState(editingTransaction?.description || '');
  const [amount, setAmount] = useState(editingTransaction?.amount?.toString() || '');
  const [categoryId, setCategoryId] = useState(editingTransaction?.category_id || '');
  const [accountId, setAccountId] = useState(editingTransaction?.account_id || '');
  const [frequency, setFrequency] = useState<keyof typeof FREQUENCIES>(
    editingTransaction?.frequency || 'monthly'
  );
  const [startDate, setStartDate] = useState(
    toBrazilianDate(editingTransaction?.start_date || format(new Date(), 'yyyy-MM-dd'))
  );
  const [endDate, setEndDate] = useState(
    editingTransaction?.end_date ? toBrazilianDate(editingTransaction.end_date) : ''
  );
  const [autoCreate, setAutoCreate] = useState(editingTransaction?.auto_create ?? true);
  const [loading, setLoading] = useState(false);

  const availableCategories = type === 'income' ? incomeCategories : expenseCategories;

  useEffect(() => {
    // Reset category when type changes
    if (!editingTransaction) {
      setCategoryId('');
    }
  }, [type]);

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Erro', 'Informe uma descrição');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }
    if (!categoryId) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }
    if (!accountId) {
      Alert.alert('Erro', 'Selecione uma conta');
      return;
    }

    setLoading(true);

    try {
      const data = {
        type,
        description: description.trim(),
        amount: parseFloat(amount),
        category_id: categoryId,
        account_id: accountId,
        frequency,
        start_date: parseBrazilianDate(startDate),
        end_date: endDate ? parseBrazilianDate(endDate) : undefined,
        is_active: true,
        auto_create: autoCreate,
      };

      if (editingTransaction) {
        const { error } = await updateRecurringTransaction(editingTransaction.id, data);
        if (error) throw new Error(error);
      } else {
        const { error } = await createRecurringTransaction(data);
        if (error) throw new Error(error);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Type Selector */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'expense' && { backgroundColor: colors.expense },
          ]}
          onPress={() => setType('expense')}
        >
          <MaterialCommunityIcons
            name="arrow-down-circle"
            size={20}
            color={type === 'expense' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.typeButtonText,
              { color: type === 'expense' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Despesa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'income' && { backgroundColor: colors.income },
          ]}
          onPress={() => setType('income')}
        >
          <MaterialCommunityIcons
            name="arrow-up-circle"
            size={20}
            color={type === 'income' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.typeButtonText,
              { color: type === 'income' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Receita
          </Text>
        </TouchableOpacity>
      </View>

      {/* Description */}
      <Input
        label="Descrição"
        value={description}
        onChangeText={setDescription}
        placeholder="Ex: Salário, Aluguel, Netflix..."
      />

      {/* Amount */}
      <Input
        label="Valor"
        value={amount}
        onChangeText={setAmount}
        placeholder="0,00"
        keyboardType="decimal-pad"
        leftIcon={
          <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>R$</Text>
        }
      />

      {/* Frequency */}
      <Text style={[styles.label, { color: colors.text }]}>Frequência</Text>
      <View style={styles.frequencyContainer}>
        {(Object.keys(FREQUENCIES) as Array<keyof typeof FREQUENCIES>).map((freq) => (
          <TouchableOpacity
            key={freq}
            style={[
              styles.frequencyButton,
              { backgroundColor: colors.card },
              frequency === freq && { backgroundColor: colors.primary },
            ]}
            onPress={() => setFrequency(freq)}
          >
            <Text
              style={[
                styles.frequencyText,
                { color: frequency === freq ? '#FFFFFF' : colors.text },
              ]}
            >
              {FREQUENCIES[freq].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category */}
      <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {availableCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              { backgroundColor: colors.card },
              categoryId === category.id && { backgroundColor: category.color },
            ]}
            onPress={() => setCategoryId(category.id)}
          >
            <MaterialCommunityIcons
              name={category.icon as any}
              size={18}
              color={categoryId === category.id ? '#FFFFFF' : category.color}
            />
            <Text
              style={[
                styles.categoryChipText,
                { color: categoryId === category.id ? '#FFFFFF' : colors.text },
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Account */}
      <Text style={[styles.label, { color: colors.text }]}>Conta</Text>
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
        {accounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.accountChip,
              { backgroundColor: colors.card },
              accountId === account.id && { backgroundColor: colors.primary },
            ]}
            onPress={() => setAccountId(account.id)}
          >
            <Text
              style={[
                styles.accountChipText,
                { color: accountId === account.id ? '#FFFFFF' : colors.text },
              ]}
            >
              {account.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dates */}
      <Input
        label="Data de Início"
        value={startDate}
        onChangeText={setStartDate}
        placeholder="DD/MM/AAAA"
      />

      <Input
        label="Data de Término (opcional)"
        value={endDate}
        onChangeText={setEndDate}
        placeholder="DD/MM/AAAA ou deixe vazio"
      />

      {/* Auto Create Toggle */}
      <Card style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>
              Criar Automaticamente
            </Text>
            <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
              Lançar transação automaticamente na data
            </Text>
          </View>
          <Switch
            value={autoCreate}
            onValueChange={setAutoCreate}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={autoCreate ? colors.primary : colors.textSecondary}
          />
        </View>
      </Card>

      {/* Save Button */}
      <Button
        title={editingTransaction ? 'Salvar Alterações' : 'Criar Transação Recorrente'}
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
    typeSelector: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    typeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    typeButtonText: {
      fontSize: 16,
      fontWeight: '600',
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
    frequencyContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    frequencyButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
    },
    frequencyText: {
      fontSize: 14,
      fontWeight: '500',
    },
    categoryScroll: {
      marginBottom: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 20,
      marginRight: 8,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: '500',
    },
    accountScroll: {
      marginBottom: 8,
    },
    accountChip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginRight: 8,
    },
    accountChipText: {
      fontSize: 14,
      fontWeight: '500',
    },
    toggleCard: {
      marginTop: 20,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleInfo: {
      flex: 1,
    },
    toggleTitle: {
      fontSize: 16,
      fontWeight: '500',
    },
    toggleDescription: {
      fontSize: 13,
      marginTop: 2,
    },
    saveButton: {
      marginTop: 24,
    },
  });
