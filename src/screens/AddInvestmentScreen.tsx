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
import { useInvestments } from '../hooks/useInvestments';
import { useAccounts } from '../hooks/useAccounts';
import { Card, Button, Input } from '../components';
import { Investment, INVESTMENT_TYPES } from '../types';
import { format } from 'date-fns';
import { toBrazilianDate, parseBrazilianDate } from '../utils/formatters';

export function AddInvestmentScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { createInvestment, updateInvestment } = useInvestments();
  const { accounts } = useAccounts();

  const editingInvestment: Investment | undefined = route.params?.investment;

  const [name, setName] = useState(editingInvestment?.name || '');
  const [type, setType] = useState<keyof typeof INVESTMENT_TYPES>(
    editingInvestment?.type || 'stocks'
  );
  const [ticker, setTicker] = useState(editingInvestment?.ticker || '');
  const [quantity, setQuantity] = useState(editingInvestment?.quantity?.toString() || '');
  const [averagePrice, setAveragePrice] = useState(editingInvestment?.average_price?.toString() || '');
  const [currentPrice, setCurrentPrice] = useState(editingInvestment?.current_price?.toString() || '');
  const [accountId, setAccountId] = useState(editingInvestment?.account_id || '');
  const [purchaseDate, setPurchaseDate] = useState(
    toBrazilianDate(editingInvestment?.purchase_date || format(new Date(), 'yyyy-MM-dd'))
  );
  const [notes, setNotes] = useState(editingInvestment?.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome do investimento');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Erro', 'Informe uma quantidade válida');
      return;
    }
    if (!averagePrice || parseFloat(averagePrice) <= 0) {
      Alert.alert('Erro', 'Informe o preço médio');
      return;
    }

    setLoading(true);

    try {
      const data = {
        name: name.trim(),
        type,
        ticker: ticker.trim().toUpperCase() || undefined,
        quantity: parseFloat(quantity),
        average_price: parseFloat(averagePrice),
        current_price: currentPrice ? parseFloat(currentPrice) : parseFloat(averagePrice),
        account_id: accountId || undefined,
        purchase_date: parseBrazilianDate(purchaseDate),
        notes: notes.trim() || undefined,
        is_active: true,
      };

      if (editingInvestment) {
        const { error } = await updateInvestment(editingInvestment.id, data);
        if (error) throw new Error(error);
      } else {
        const { error } = await createInvestment(data);
        if (error) throw new Error(error);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar');
    } finally {
      setLoading(false);
    }
  };

  const investmentAccounts = accounts.filter(
    (acc) => acc.type === 'investment' || acc.type === 'brokerage'
  );

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Name */}
      <Input
        label="Nome do Investimento"
        value={name}
        onChangeText={setName}
        placeholder="Ex: Ações PETR4, Tesouro Selic..."
      />

      {/* Type */}
      <Text style={[styles.label, { color: colors.text }]}>Tipo de Investimento</Text>
      <View style={styles.typeContainer}>
        {(Object.keys(INVESTMENT_TYPES) as Array<keyof typeof INVESTMENT_TYPES>).map((investType) => (
          <TouchableOpacity
            key={investType}
            style={[
              styles.typeButton,
              { backgroundColor: colors.card },
              type === investType && { backgroundColor: colors.primary },
            ]}
            onPress={() => setType(investType)}
          >
            <MaterialCommunityIcons
              name={INVESTMENT_TYPES[investType].icon as any}
              size={20}
              color={type === investType ? '#FFFFFF' : colors.text}
            />
            <Text
              style={[
                styles.typeText,
                { color: type === investType ? '#FFFFFF' : colors.text },
              ]}
            >
              {INVESTMENT_TYPES[investType].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ticker (optional) */}
      {(type === 'stocks' || type === 'etfs' || type === 'reits') && (
        <Input
          label="Ticker/Código"
          value={ticker}
          onChangeText={setTicker}
          placeholder="Ex: PETR4, ITUB4..."
          autoCapitalize="characters"
        />
      )}

      {/* Quantity */}
      <Input
        label="Quantidade"
        value={quantity}
        onChangeText={setQuantity}
        placeholder="0"
        keyboardType="decimal-pad"
      />

      {/* Average Price */}
      <Input
        label="Preço Médio"
        value={averagePrice}
        onChangeText={setAveragePrice}
        placeholder="0,00"
        keyboardType="decimal-pad"
        leftIcon={
          <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>R$</Text>
        }
      />

      {/* Current Price */}
      <Input
        label="Preço Atual (opcional)"
        value={currentPrice}
        onChangeText={setCurrentPrice}
        placeholder="0,00"
        keyboardType="decimal-pad"
        leftIcon={
          <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>R$</Text>
        }
      />

      {/* Total Investment Card */}
      {quantity && averagePrice && (
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>
            Valor Total Investido
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            R$ {(parseFloat(quantity) * parseFloat(averagePrice)).toFixed(2).replace('.', ',')}
          </Text>
          {currentPrice && parseFloat(currentPrice) > 0 && (
            <>
              <Text style={[styles.summaryTitle, { color: colors.textSecondary, marginTop: 12 }]}>
                Valor Atual
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                R$ {(parseFloat(quantity) * parseFloat(currentPrice)).toFixed(2).replace('.', ',')}
              </Text>
              <View style={styles.profitRow}>
                <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>
                  Lucro/Prejuízo
                </Text>
                <Text
                  style={[
                    styles.profitValue,
                    {
                      color:
                        parseFloat(currentPrice) >= parseFloat(averagePrice)
                          ? colors.income
                          : colors.expense,
                    },
                  ]}
                >
                  {parseFloat(currentPrice) >= parseFloat(averagePrice) ? '+' : ''}
                  R$ {((parseFloat(currentPrice) - parseFloat(averagePrice)) * parseFloat(quantity)).toFixed(2).replace('.', ',')}
                  ({(((parseFloat(currentPrice) - parseFloat(averagePrice)) / parseFloat(averagePrice)) * 100).toFixed(2)}%)
                </Text>
              </View>
            </>
          )}
        </Card>
      )}

      {/* Account */}
      {investmentAccounts.length > 0 && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>Conta/Corretora</Text>
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
            <TouchableOpacity
              style={[
                styles.accountChip,
                { backgroundColor: colors.card },
                !accountId && { backgroundColor: colors.primary },
              ]}
              onPress={() => setAccountId('')}
            >
              <Text
                style={[
                  styles.accountChipText,
                  { color: !accountId ? '#FFFFFF' : colors.text },
                ]}
              >
                Nenhuma
              </Text>
            </TouchableOpacity>
            {investmentAccounts.map((account) => (
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
        </>
      )}

      {/* Purchase Date */}
      <Input
        label="Data da Compra"
        value={purchaseDate}
        onChangeText={setPurchaseDate}
        placeholder="DD/MM/AAAA"
      />

      {/* Notes */}
      <Input
        label="Observações (opcional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Anotações sobre o investimento..."
        multiline={true}
        numberOfLines={3}
      />

      {/* Save Button */}
      <Button
        title={editingInvestment ? 'Salvar Alterações' : 'Adicionar Investimento'}
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
      paddingBottom: 40,
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
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 20,
    },
    typeText: {
      fontSize: 13,
      fontWeight: '500',
    },
    summaryCard: {
      marginTop: 16,
      padding: 16,
    },
    summaryTitle: {
      fontSize: 13,
      fontWeight: '500',
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: 4,
    },
    profitRow: {
      marginTop: 12,
    },
    profitValue: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 4,
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
    saveButton: {
      marginTop: 24,
    },
  });
