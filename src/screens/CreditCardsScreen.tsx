import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCreditCards } from '../hooks/useCreditCards';
import { useAccounts } from '../hooks/useAccounts';
import { Card, Button } from '../components';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CreditCardsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const {
    creditCards,
    bills,
    loading,
    fetchCreditCards,
    fetchBills,
    getCurrentBill
  } = useCreditCards();
  const { accounts } = useAccounts();
  const [refreshing, setRefreshing] = useState(false);

  // Filtrar cartões de crédito das contas
  const allCreditCards = accounts.filter((acc) => acc.type === 'credit_card');

  useEffect(() => {
    fetchBills();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCreditCards();
    await fetchBills();
    setRefreshing(false);
  };

  const getTotalLimit = () => {
    return allCreditCards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
  };

  const getTotalUsed = () => {
    return allCreditCards.reduce((sum, card) => {
      const currentBill = getCurrentBill(card.id);
      return sum + (currentBill?.total_amount || Math.abs(card.balance) || 0);
    }, 0);
  };

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>
          Resumo dos Cartões
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Limite Total
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              R$ {getTotalLimit().toFixed(2).replace('.', ',')}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Utilizado
            </Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              R$ {getTotalUsed().toFixed(2).replace('.', ',')}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Disponível
            </Text>
            <Text style={[styles.summaryValue, { color: colors.income }]}>
              R$ {(getTotalLimit() - getTotalUsed()).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </View>
        {/* Usage Bar */}
        {getTotalLimit() > 0 && (
          <>
            <View style={styles.usageBarContainer}>
              <View
                style={[
                  styles.usageBar,
                  {
                    backgroundColor: getTotalUsed() / getTotalLimit() > 0.8 ? colors.expense : colors.primary,
                    width: `${Math.min(100, (getTotalUsed() / getTotalLimit()) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.usageText, { color: colors.textSecondary }]}>
              {((getTotalUsed() / getTotalLimit()) * 100).toFixed(1)}% do limite utilizado
            </Text>
          </>
        )}
      </Card>

      {/* Credit Cards List */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Meus Cartões</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddAccount', { type: 'credit_card' })}
        >
          <MaterialCommunityIcons name="plus-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {allCreditCards.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="credit-card-off" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum cartão cadastrado
          </Text>
          <Button
            title="Adicionar Cartão"
            onPress={() => navigation.navigate('AddAccount', { type: 'credit_card' })}
            style={styles.emptyButton}
          />
        </Card>
      ) : (
        allCreditCards.map((card) => {
          const currentBill = getCurrentBill(card.id);
          const usedAmount = currentBill?.total_amount || Math.abs(card.balance) || 0;
          const availableLimit = (card.credit_limit || 0) - usedAmount;
          const usagePercent = card.credit_limit ? (usedAmount / card.credit_limit) * 100 : 0;

          return (
            <TouchableOpacity
              key={card.id}
              onPress={() => navigation.navigate('CreditCardDetail', { account: card })}
            >
              <Card style={styles.cardItem}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <View style={[styles.cardIcon, { backgroundColor: card.color || colors.primary }]}>
                      <MaterialCommunityIcons name="credit-card" size={24} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text style={[styles.cardName, { color: colors.text }]}>{card.name}</Text>
                      <Text style={[styles.cardBank, { color: colors.textSecondary }]}>
                        {card.institution || 'Cartão de Crédito'}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
                </View>

                {/* Card Limits */}
                <View style={styles.limitsContainer}>
                  <View style={styles.limitItem}>
                    <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Limite</Text>
                    <Text style={[styles.limitValue, { color: colors.text }]}>
                      R$ {(card.credit_limit || 0).toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                  <View style={styles.limitItem}>
                    <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Fatura Atual</Text>
                    <Text style={[styles.limitValue, { color: colors.expense }]}>
                      R$ {usedAmount.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                  <View style={styles.limitItem}>
                    <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Disponível</Text>
                    <Text style={[styles.limitValue, { color: colors.income }]}>
                      R$ {availableLimit.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                </View>

                {/* Usage Progress */}
                {card.credit_limit && card.credit_limit > 0 && (
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: usagePercent > 80 ? colors.expense : colors.primary,
                            width: `${Math.min(100, usagePercent)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                      {usagePercent.toFixed(0)}%
                    </Text>
                  </View>
                )}

                {/* Bill Info */}
                <View style={[styles.billInfo, { backgroundColor: colors.background }]}>
                  <View style={styles.billRow}>
                    <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
                    <Text style={[styles.billText, { color: colors.textSecondary }]}>
                      Vencimento: {card.due_day ? `dia ${card.due_day}` : 'Não definido'}
                    </Text>
                  </View>
                  {card.closing_day && (
                    <View style={styles.billRow}>
                      <MaterialCommunityIcons name="calendar-check" size={16} color={colors.textSecondary} />
                      <Text style={[styles.billText, { color: colors.textSecondary }]}>
                        Fechamento: dia {card.closing_day}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })
      )}

      {/* Recent Bills */}
      {bills.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
            Faturas Recentes
          </Text>
          {bills.slice(0, 5).map((bill) => {
            const card = allCreditCards.find((c) => c.id === bill.account_id);
            const billStatus = bill.is_paid ? 'paid' : new Date(bill.due_date) < new Date() ? 'overdue' : 'open';

            return (
              <Card key={bill.id} style={styles.billCard}>
                <View style={styles.billCardHeader}>
                  <View>
                    <Text style={[styles.billCardTitle, { color: colors.text }]}>
                      {card?.name || 'Cartão'}
                    </Text>
                    <Text style={[styles.billCardDate, { color: colors.textSecondary }]}>
                      {format(new Date(bill.due_date), "MMMM 'de' yyyy", { locale: ptBR })}
                    </Text>
                  </View>
                  <View style={styles.billCardRight}>
                    <Text style={[styles.billCardAmount, { color: colors.expense }]}>
                      R$ {bill.total_amount.toFixed(2).replace('.', ',')}
                    </Text>
                    <View
                      style={[
                        styles.billStatus,
                        {
                          backgroundColor:
                            billStatus === 'paid'
                              ? colors.income + '20'
                              : billStatus === 'overdue'
                              ? colors.expense + '20'
                              : colors.warning + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.billStatusText,
                          {
                            color:
                              billStatus === 'paid'
                                ? colors.income
                                : billStatus === 'overdue'
                                ? colors.expense
                                : colors.warning,
                          },
                        ]}
                      >
                        {billStatus === 'paid' ? 'Paga' : billStatus === 'overdue' ? 'Atrasada' : 'Aberta'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      )}
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
    summaryCard: {
      padding: 16,
      marginBottom: 20,
    },
    summaryTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryItem: {
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 4,
    },
    usageBarContainer: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      marginTop: 16,
      overflow: 'hidden',
    },
    usageBar: {
      height: '100%',
      borderRadius: 3,
    },
    usageText: {
      fontSize: 12,
      marginTop: 8,
      textAlign: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    emptyCard: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      marginTop: 12,
      marginBottom: 16,
    },
    emptyButton: {
      paddingHorizontal: 24,
    },
    cardItem: {
      marginBottom: 12,
      padding: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardName: {
      fontSize: 16,
      fontWeight: '600',
    },
    cardBank: {
      fontSize: 13,
      marginTop: 2,
    },
    limitsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    limitItem: {
      alignItems: 'center',
    },
    limitLabel: {
      fontSize: 11,
      fontWeight: '500',
    },
    limitValue: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: 4,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },
    progressBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
    progressText: {
      fontSize: 12,
      fontWeight: '500',
      width: 36,
      textAlign: 'right',
    },
    billInfo: {
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
      gap: 6,
    },
    billRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    billText: {
      fontSize: 13,
    },
    billCard: {
      marginTop: 8,
      padding: 16,
    },
    billCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    billCardTitle: {
      fontSize: 15,
      fontWeight: '600',
    },
    billCardDate: {
      fontSize: 13,
      marginTop: 2,
    },
    billCardRight: {
      alignItems: 'flex-end',
    },
    billCardAmount: {
      fontSize: 16,
      fontWeight: '700',
    },
    billStatus: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      marginTop: 4,
    },
    billStatusText: {
      fontSize: 11,
      fontWeight: '600',
    },
  });
