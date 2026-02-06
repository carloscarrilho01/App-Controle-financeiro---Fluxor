import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useDebts } from '../hooks/useDebts';
import { Card, Button } from '../components';
import { Debt, DEBT_TYPES } from '../types';
import { formatCurrency, formatPercent, formatDate } from '../utils/formatters';

export function DebtsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const {
    debts,
    loading,
    fetchDebts,
    deleteDebt,
    getSummary,
    getSnowballStrategy,
    getAvalancheStrategy,
  } = useDebts();

  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'snowball' | 'avalanche'>('list');

  const summary = getSummary();
  const activeDebts = debts.filter((d) => d.is_active);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDebts();
    setRefreshing(false);
  };

  const handleDelete = (debt: Debt) => {
    Alert.alert(
      'Excluir Dívida',
      `Deseja excluir "${debt.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteDebt(debt.id);
          },
        },
      ]
    );
  };

  const getDisplayDebts = () => {
    switch (viewMode) {
      case 'snowball':
        return getSnowballStrategy();
      case 'avalanche':
        return getAvalancheStrategy();
      default:
        return activeDebts;
    }
  };

  const styles = createStyles(colors);

  const renderDebtCard = ({ item, index }: { item: Debt; index: number }) => {
    const typeInfo = DEBT_TYPES[item.type];
    const progress = item.original_amount > 0
      ? ((item.original_amount - item.current_balance) / item.original_amount) * 100
      : 0;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('DebtDetail', { debt: item })}
      >
        <Card style={styles.debtCard}>
          {viewMode !== 'list' && (
            <View style={[styles.priorityBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.priorityText}>#{index + 1}</Text>
            </View>
          )}

          <View style={styles.debtHeader}>
            <View style={styles.debtIconContainer}>
              <View style={[styles.debtIcon, { backgroundColor: colors.dangerDark + '20' }]}>
                <MaterialCommunityIcons
                  name={typeInfo.icon as any}
                  size={24}
                  color={colors.danger}
                />
              </View>
            </View>

            <View style={styles.debtInfo}>
              <Text style={[styles.debtName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.debtCreditor, { color: colors.textSecondary }]}>
                {item.creditor} • {typeInfo.label}
              </Text>
            </View>

            <View style={styles.debtValues}>
              <Text style={[styles.debtBalance, { color: colors.danger }]}>
                {formatCurrency(item.current_balance)}
              </Text>
              <Text style={[styles.debtRate, { color: colors.textSecondary }]}>
                {item.interest_rate}% a.m.
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Progresso do pagamento
              </Text>
              <Text style={[styles.progressValue, { color: colors.text }]}>
                {progress.toFixed(0)}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: colors.success },
                ]}
              />
            </View>
          </View>

          <View style={[styles.debtDetails, { borderTopColor: colors.border }]}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Valor Original
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatCurrency(item.original_amount)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Parcela Mensal
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatCurrency(item.monthly_payment)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Parcelas
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {item.paid_installments}/{item.total_installments || '∞'}
              </Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddDebtPayment', { debt: item })}
            >
              <MaterialCommunityIcons name="cash-plus" size={20} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Pagar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddDebt', { debt: item })}
            >
              <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item)}
            >
              <MaterialCommunityIcons name="delete" size={20} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <MaterialCommunityIcons name="alert-circle" size={24} color={colors.danger} />
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Resumo das Dívidas
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Total em Dívidas
            </Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>
              {formatCurrency(summary.totalRemaining)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Já Pago
            </Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(summary.totalPaid)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Parcelas/Mês
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(summary.monthlyPayments)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Juros Médio
            </Text>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {summary.averageInterestRate.toFixed(1)}% a.m.
            </Text>
          </View>
        </View>

        {summary.projectedPayoffDate && (
          <View style={[styles.projectionContainer, { backgroundColor: colors.background }]}>
            <MaterialCommunityIcons name="calendar-check" size={20} color={colors.primary} />
            <Text style={[styles.projectionText, { color: colors.textSecondary }]}>
              Previsão de quitação:{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                {formatDate(summary.projectedPayoffDate)}
              </Text>
            </Text>
          </View>
        )}
      </Card>

      {/* Strategy Selector */}
      <View style={styles.strategyContainer}>
        <Text style={[styles.strategyTitle, { color: colors.text }]}>
          Estratégia de Pagamento
        </Text>
        <View style={styles.strategyButtons}>
          <TouchableOpacity
            style={[
              styles.strategyButton,
              viewMode === 'list' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text
              style={[
                styles.strategyButtonText,
                { color: viewMode === 'list' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Lista
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.strategyButton,
              viewMode === 'snowball' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setViewMode('snowball')}
          >
            <MaterialCommunityIcons
              name="snowflake"
              size={16}
              color={viewMode === 'snowball' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.strategyButtonText,
                { color: viewMode === 'snowball' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Bola de Neve
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.strategyButton,
              viewMode === 'avalanche' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setViewMode('avalanche')}
          >
            <MaterialCommunityIcons
              name="landslide"
              size={16}
              color={viewMode === 'avalanche' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.strategyButtonText,
                { color: viewMode === 'avalanche' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Avalanche
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode !== 'list' && (
          <View style={[styles.strategyInfo, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.strategyInfoText, { color: colors.textSecondary }]}>
              {viewMode === 'snowball'
                ? 'Pague primeiro as dívidas menores para ganhar motivação.'
                : 'Pague primeiro as dívidas com maiores juros para economizar.'}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Dívidas Ativas ({activeDebts.length})
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={getDisplayDebts()}
        keyExtractor={(item) => item.id}
        renderItem={renderDebtCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="check-circle"
              size={64}
              color={colors.success}
            />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Parabéns!
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Você não tem dívidas cadastradas
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddDebt')}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      padding: 16,
      paddingBottom: 100,
    },
    summaryCard: {
      marginBottom: 16,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    summaryItem: {
      width: '50%',
      marginBottom: 16,
    },
    summaryLabel: {
      fontSize: 12,
      marginBottom: 2,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    projectionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 8,
    },
    projectionText: {
      fontSize: 14,
    },
    strategyContainer: {
      marginBottom: 16,
    },
    strategyTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    strategyButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    strategyButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    strategyButtonText: {
      fontSize: 13,
      fontWeight: '500',
    },
    strategyInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
    },
    strategyInfoText: {
      flex: 1,
      fontSize: 13,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    debtCard: {
      marginBottom: 12,
      padding: 0,
      overflow: 'hidden',
    },
    priorityBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    priorityText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    debtHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    debtIconContainer: {
      marginRight: 12,
    },
    debtIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    debtInfo: {
      flex: 1,
    },
    debtName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    debtCreditor: {
      fontSize: 13,
    },
    debtValues: {
      alignItems: 'flex-end',
    },
    debtBalance: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 2,
    },
    debtRate: {
      fontSize: 12,
    },
    progressSection: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    progressLabel: {
      fontSize: 12,
    },
    progressValue: {
      fontSize: 12,
      fontWeight: '600',
    },
    progressBar: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    debtDetails: {
      flexDirection: 'row',
      borderTopWidth: 1,
      padding: 12,
    },
    detailItem: {
      flex: 1,
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 11,
      marginBottom: 2,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    cardActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      gap: 6,
    },
    actionText: {
      fontSize: 13,
      fontWeight: '500',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      marginTop: 4,
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
  });
