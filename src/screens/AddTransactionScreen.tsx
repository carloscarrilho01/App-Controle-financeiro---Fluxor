import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Input, Card } from '../components';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { COLORS } from '../types';
import { format } from 'date-fns';
import { getIconName, toBrazilianDate, parseBrazilianDate } from '../utils/formatters';
import { wp, hp, fs, spacing, borderRadius, iconSize, widthPercent, screen } from '../utils/responsive';

export function AddTransactionScreen({ navigation, route }: any) {
  const editingTransaction = route.params?.transaction;
  const { createTransaction, updateTransaction } = useTransactions();
  const { getFlatCategories } = useCategories();
  const { accounts } = useAccounts();

  const [type, setType] = useState<'income' | 'expense' | 'transfer'>(
    editingTransaction?.type || 'expense'
  );
  const [amount, setAmount] = useState(
    editingTransaction?.amount?.toString() || ''
  );
  const [description, setDescription] = useState(
    editingTransaction?.description || ''
  );
  const [selectedCategory, setSelectedCategory] = useState(
    editingTransaction?.category_id || ''
  );
  const [selectedAccount, setSelectedAccount] = useState(
    editingTransaction?.account_id || (accounts[0]?.id || '')
  );
  const [selectedToAccount, setSelectedToAccount] = useState(
    editingTransaction?.to_account_id || ''
  );
  const [date, setDate] = useState(
    toBrazilianDate(editingTransaction?.date || format(new Date(), 'yyyy-MM-dd'))
  );
  const [loading, setLoading] = useState(false);

  // Categorias organizadas com subcategorias
  const availableCategories = getFlatCategories(type === 'income' ? 'income' : 'expense');

  // Calcula numero de colunas baseado na largura da tela
  const categoryColumns = screen.isSmall ? 3 : screen.isLarge ? 4 : 3;
  const categoryWidth = `${Math.floor(100 / categoryColumns) - 2}%` as any;

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }
    if (!selectedAccount) {
      Alert.alert('Erro', 'Selecione uma conta');
      return;
    }
    if (type !== 'transfer' && !selectedCategory) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }
    if (type === 'transfer' && !selectedToAccount) {
      Alert.alert('Erro', 'Selecione a conta de destino');
      return;
    }
    if (type === 'transfer' && selectedAccount === selectedToAccount) {
      Alert.alert('Erro', 'As contas de origem e destino devem ser diferentes');
      return;
    }

    setLoading(true);

    const transactionData = {
      type,
      amount: parseFloat(amount),
      description,
      category_id: selectedCategory,
      account_id: selectedAccount,
      to_account_id: type === 'transfer' ? selectedToAccount : undefined,
      date: parseBrazilianDate(date),
    };

    let result;
    if (editingTransaction) {
      result = await updateTransaction(editingTransaction.id, transactionData);
    } else {
      result = await createTransaction(transactionData);
    }

    setLoading(false);

    if (result.error) {
      Alert.alert('Erro', result.error.message);
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Type Selector */}
        <View style={styles.typeContainer}>
          {(['expense', 'income', 'transfer'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeButton,
                type === t && {
                  backgroundColor:
                    t === 'income' ? COLORS.income :
                    t === 'expense' ? COLORS.expense :
                    COLORS.primary,
                },
              ]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                {t === 'income' ? 'Receita' : t === 'expense' ? 'Despesa' : 'Transferência'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Valor</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>R$</Text>
            <Input
              value={amount}
              onChangeText={text => setAmount(text.replace(',', '.'))}
              placeholder="0,00"
              keyboardType="decimal-pad"
              style={styles.amountInput}
            />
          </View>
        </Card>

        {/* Description */}
        <Input
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Almoço no restaurante"
        />

        {/* Date */}
        <Input
          label="Data"
          value={date}
          onChangeText={setDate}
          placeholder="DD/MM/AAAA"
        />

        {/* Account Selection */}
        <Text style={styles.sectionLabel}>
          {type === 'transfer' ? 'Conta de Origem' : 'Conta'}
        </Text>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {accounts.map(account => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.selectItem,
                selectedAccount === account.id && styles.selectItemActive,
              ]}
              onPress={() => setSelectedAccount(account.id)}
            >
              <MaterialCommunityIcons
                name={getIconName(account.icon, 'bank') as any}
                size={iconSize.sm}
                color={selectedAccount === account.id ? COLORS.primary : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.selectText,
                  selectedAccount === account.id && styles.selectTextActive,
                ]}
                numberOfLines={1}
              >
                {account.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* To Account (for transfers) */}
        {type === 'transfer' && (
          <>
            <Text style={styles.sectionLabel}>Conta de Destino</Text>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {accounts
                .filter(a => a.id !== selectedAccount)
                .map(account => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.selectItem,
                      selectedToAccount === account.id && styles.selectItemActive,
                    ]}
                    onPress={() => setSelectedToAccount(account.id)}
                  >
                    <MaterialCommunityIcons
                      name={getIconName(account.icon, 'bank') as any}
                      size={iconSize.sm}
                      color={selectedToAccount === account.id ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.selectText,
                        selectedToAccount === account.id && styles.selectTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {account.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </>
        )}

        {/* Category Selection (not for transfers) */}
        {type !== 'transfer' && (
          <>
            <Text style={styles.sectionLabel}>Categoria</Text>
            <View style={styles.categoriesGrid}>
              {availableCategories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    { width: categoryWidth },
                    category.isSubcategory && styles.subcategoryItem,
                    selectedCategory === category.id && {
                      backgroundColor: category.color,
                    },
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  {category.isSubcategory && (
                    <MaterialCommunityIcons
                      name="subdirectory-arrow-right"
                      size={12}
                      color={selectedCategory === category.id ? '#FFFFFF' : COLORS.textSecondary}
                      style={styles.subcatIcon}
                    />
                  )}
                  <MaterialCommunityIcons
                    name={getIconName(category.icon) as any}
                    size={category.isSubcategory ? iconSize.sm : iconSize.md}
                    color={selectedCategory === category.id ? '#FFFFFF' : category.color}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      category.isSubcategory && styles.subcategoryText,
                      selectedCategory === category.id && styles.categoryTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Save Button */}
        <Button
          title={editingTransaction ? 'Salvar' : 'Adicionar'}
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.bottomSafe,
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  typeButton: {
    flex: 1,
    paddingVertical: hp(12),
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: wp(4),
    borderRadius: borderRadius.md,
  },
  typeText: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  amountCard: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginBottom: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: fs(24),
    fontWeight: '600',
    color: COLORS.text,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 0,
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  horizontalScroll: {
    marginBottom: spacing.lg,
  },
  selectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: hp(12),
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    maxWidth: widthPercent(40),
  },
  selectItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  selectText: {
    fontSize: fs(14),
    color: COLORS.text,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  selectTextActive: {
    color: COLORS.primary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
  },
  categoryItem: {
    backgroundColor: COLORS.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginRight: '2%',
    marginBottom: spacing.sm,
  },
  categoryText: {
    fontSize: fs(12),
    color: COLORS.text,
    textAlign: 'center',
    marginTop: hp(4),
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  subcategoryItem: {
    paddingLeft: spacing.sm,
  },
  subcategoryText: {
    fontSize: fs(11),
  },
  subcatIcon: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
});
