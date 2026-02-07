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
import { useTheme } from '../contexts/ThemeContext';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useCreditCards } from '../hooks/useCreditCards';
import { Card, Button, Input } from '../components';
import { formatCurrency, toBrazilianDate, parseBrazilianDate, getIconName } from '../utils/formatters';
import { format } from 'date-fns';
import { Account } from '../types';

export function AddCreditCardPurchaseScreen({ navigation, route }: any) {
  const { account } = route.params as { account: Account };
  const { colors } = useTheme();
  const { expenseCategories, getFlatCategories } = useCategories();
  const { createTransaction } = useTransactions();
  const { createInstallment } = useCreditCards();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toBrazilianDate(format(new Date(), 'yyyy-MM-dd')));
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('2');
  const [loading, setLoading] = useState(false);

  const allExpenseCategories = getFlatCategories('expense');

  const totalAmount = parseFloat(amount.replace(',', '.')) || 0;
  const installments = parseInt(installmentCount) || 1;
  const installmentAmount = isInstallment && installments > 1 ? totalAmount / installments : totalAmount;

  const handleSave = async () => {
    if (!amount || totalAmount <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Erro', 'Informe uma descrição');
      return;
    }

    setLoading(true);

    try {
      if (isInstallment && installments > 1) {
        // Criar parcelamento
        const result = await createInstallment({
          account_id: account.id,
          category_id: selectedCategory,
          description: description.trim(),
          total_amount: totalAmount,
          installment_amount: installmentAmount,
          total_installments: installments,
          paid_installments: 0,
          start_date: parseBrazilianDate(date),
        });

        if (result.error) {
          Alert.alert('Erro', result.error);
          return;
        }
      } else {
        // Criar transação única
        const result = await createTransaction({
          type: 'expense',
          amount: totalAmount,
          description: description.trim(),
          category_id: selectedCategory,
          account_id: account.id,
          date: parseBrazilianDate(date),
        });

        if (result.error) {
          Alert.alert('Erro', result.error.message);
          return;
        }
      }

      Alert.alert('Sucesso', 'Compra registrada!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Card Info */}
        <Card style={[styles.cardInfo, { backgroundColor: account.color || colors.primary }]}>
          <MaterialCommunityIcons name="credit-card" size={32} color="#FFFFFF" />
          <View style={styles.cardInfoText}>
            <Text style={styles.cardName}>{account.name}</Text>
            <Text style={styles.cardLimit}>
              Limite disponível: {formatCurrency((account.credit_limit || 0) - Math.abs(account.balance))}
            </Text>
          </View>
        </Card>

        {/* Amount */}
        <Card style={styles.amountCard}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
            Valor da Compra
          </Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencySymbol, { color: colors.text }]}>R$</Text>
            <Input
              value={amount}
              onChangeText={(text) => setAmount(text.replace(',', '.'))}
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
          placeholder="Ex: Compra na loja X"
        />

        {/* Date */}
        <Input
          label="Data da Compra"
          value={date}
          onChangeText={setDate}
          placeholder="DD/MM/AAAA"
        />

        {/* Installment Toggle */}
        <View style={styles.installmentToggle}>
          <View style={styles.installmentInfo}>
            <MaterialCommunityIcons
              name="chart-timeline-variant"
              size={24}
              color={colors.primary}
            />
            <View>
              <Text style={[styles.installmentTitle, { color: colors.text }]}>
                Parcelar compra
              </Text>
              <Text style={[styles.installmentDesc, { color: colors.textSecondary }]}>
                Divida em até 12x
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: isInstallment ? colors.primary : colors.border },
            ]}
            onPress={() => setIsInstallment(!isInstallment)}
          >
            <View
              style={[
                styles.toggleDot,
                {
                  backgroundColor: '#FFFFFF',
                  alignSelf: isInstallment ? 'flex-end' : 'flex-start',
                },
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Installment Options */}
        {isInstallment && (
          <Card style={styles.installmentOptions}>
            <Text style={[styles.installmentLabel, { color: colors.text }]}>
              Número de Parcelas
            </Text>
            <View style={styles.installmentGrid}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.installmentOption,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    parseInt(installmentCount) === num && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '10',
                    },
                  ]}
                  onPress={() => setInstallmentCount(num.toString())}
                >
                  <Text
                    style={[
                      styles.installmentOptionText,
                      { color: parseInt(installmentCount) === num ? colors.primary : colors.text },
                    ]}
                  >
                    {num}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Installment Summary */}
            {totalAmount > 0 && (
              <View style={[styles.installmentSummary, { backgroundColor: colors.background }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Valor da parcela
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {installments}x de {formatCurrency(installmentAmount)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Total
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.expense }]}>
                    {formatCurrency(totalAmount)}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Category Selection */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Categoria</Text>
        <View style={styles.categoriesGrid}>
          {allExpenseCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                { backgroundColor: colors.card },
                category.isSubcategory && styles.subcategoryItem,
                selectedCategory === category.id && { backgroundColor: category.color },
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              {category.isSubcategory && (
                <MaterialCommunityIcons
                  name="subdirectory-arrow-right"
                  size={12}
                  color={selectedCategory === category.id ? '#FFFFFF' : colors.textSecondary}
                  style={styles.subcatIcon}
                />
              )}
              <MaterialCommunityIcons
                name={getIconName(category.icon) as any}
                size={category.isSubcategory ? 20 : 24}
                color={selectedCategory === category.id ? '#FFFFFF' : category.color}
              />
              <Text
                style={[
                  styles.categoryText,
                  { color: selectedCategory === category.id ? '#FFFFFF' : colors.text },
                  category.isSubcategory && styles.subcategoryText,
                ]}
                numberOfLines={1}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save Button */}
        <Button
          title={isInstallment ? `Parcelar em ${installments}x` : 'Registrar Compra'}
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    cardInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: 16,
      marginBottom: 20,
    },
    cardInfoText: {
      flex: 1,
    },
    cardName: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    cardLimit: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    amountCard: {
      alignItems: 'center',
      marginBottom: 20,
    },
    amountLabel: {
      fontSize: 14,
      marginBottom: 8,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    currencySymbol: {
      fontSize: 24,
      fontWeight: '600',
      marginRight: 8,
    },
    amountInput: {
      flex: 0,
      marginBottom: 0,
      fontSize: 32,
      fontWeight: '700',
    },
    installmentToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    installmentInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    installmentTitle: {
      fontSize: 15,
      fontWeight: '600',
    },
    installmentDesc: {
      fontSize: 12,
      marginTop: 2,
    },
    toggleButton: {
      width: 52,
      height: 28,
      borderRadius: 14,
      padding: 3,
      justifyContent: 'center',
    },
    toggleDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    installmentOptions: {
      marginBottom: 20,
    },
    installmentLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 12,
    },
    installmentGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    installmentOption: {
      width: 48,
      height: 40,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
    },
    installmentOptionText: {
      fontSize: 14,
      fontWeight: '600',
    },
    installmentSummary: {
      marginTop: 16,
      padding: 12,
      borderRadius: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    summaryLabel: {
      fontSize: 13,
    },
    summaryValue: {
      fontSize: 13,
      fontWeight: '600',
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 12,
    },
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24,
    },
    categoryItem: {
      width: '31%',
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    subcategoryItem: {
      paddingLeft: 8,
    },
    categoryText: {
      fontSize: 11,
      textAlign: 'center',
      marginTop: 4,
    },
    subcategoryText: {
      fontSize: 10,
    },
    subcatIcon: {
      position: 'absolute',
      top: 4,
      left: 4,
    },
    saveButton: {
      marginTop: 8,
    },
  });
