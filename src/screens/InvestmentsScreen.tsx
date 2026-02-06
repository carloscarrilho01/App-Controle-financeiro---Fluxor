import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useInvestments } from '../hooks/useInvestments';
import { Card } from '../components';
import { Investment, INVESTMENT_TYPES } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';

const screenWidth = Dimensions.get('window').width;

export function InvestmentsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const {
    investments,
    loading,
    fetchInvestments,
    getSummary,
    getInvestmentProfit,
  } = useInvestments();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const summary = getSummary();

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvestments();
    setRefreshing(false);
  };

  const filteredInvestments = selectedType
    ? investments.filter((i) => i.type === selectedType)
    : investments;

  const pieChartData = summary.byType
    .filter((t) => t.currentValue > 0)
    .map((t, index) => {
      const typeColors = [
        '#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#64748B',
      ];
      return {
        name: INVESTMENT_TYPES[t.type].label,
        amount: t.currentValue,
        color: typeColors[index % typeColors.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 11,
      };
    });

  const styles = createStyles(colors);

  const renderInvestmentCard = ({ item }: { item: Investment }) => {
    const profit = getInvestmentProfit(item);
    const typeInfo = INVESTMENT_TYPES[item.type];

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('InvestmentDetail', { investment: item })}
      >
        <Card style={styles.investmentCard}>
          <View style={styles.investmentHeader}>
            <View style={styles.investmentIconContainer}>
              <View style={[styles.investmentIcon, { backgroundColor: colors.primaryLight }]}>
                <MaterialCommunityIcons
                  name={typeInfo.icon as any}
                  size={24}
                  color={colors.primary}
                />
              </View>
            </View>

            <View style={styles.investmentInfo}>
              <Text style={[styles.investmentName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.investmentType, { color: colors.textSecondary }]}>
                {typeInfo.label}
                {item.ticker && ` • ${item.ticker}`}
              </Text>
            </View>

            <View style={styles.investmentValues}>
              <Text style={[styles.currentValue, { color: colors.text }]}>
                {formatCurrency(profit.current)}
              </Text>
              <View style={styles.profitContainer}>
                <MaterialCommunityIcons
                  name={profit.profit >= 0 ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={profit.profit >= 0 ? colors.profit : colors.loss}
                />
                <Text
                  style={[
                    styles.profitText,
                    { color: profit.profit >= 0 ? colors.profit : colors.loss },
                  ]}
                >
                  {profit.profit >= 0 ? '+' : ''}
                  {formatPercent(profit.percentage)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.investmentDetails, { borderTopColor: colors.border }]}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Investido
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatCurrency(profit.invested)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Quantidade
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {item.quantity.toLocaleString('pt-BR')}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Lucro/Prejuízo
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: profit.profit >= 0 ? colors.profit : colors.loss },
                ]}
              >
                {profit.profit >= 0 ? '+' : ''}
                {formatCurrency(profit.profit)}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.mainSummaryCard}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Patrimônio Total
          </Text>
          <Text style={[styles.summaryMainValue, { color: colors.text }]}>
            {formatCurrency(summary.currentValue)}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryItemLabel, { color: colors.textSecondary }]}>
                Investido
              </Text>
              <Text style={[styles.summaryItemValue, { color: colors.text }]}>
                {formatCurrency(summary.totalInvested)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryItemLabel, { color: colors.textSecondary }]}>
                Rendimento
              </Text>
              <Text
                style={[
                  styles.summaryItemValue,
                  { color: summary.totalProfit >= 0 ? colors.profit : colors.loss },
                ]}
              >
                {summary.totalProfit >= 0 ? '+' : ''}
                {formatCurrency(summary.totalProfit)} ({formatPercent(summary.profitPercentage)})
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Distribution Chart */}
      {pieChartData.length > 0 && (
        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Distribuição por Tipo
          </Text>
          <PieChart
            data={pieChartData}
            width={screenWidth - 64}
            height={180}
            chartConfig={{
              color: () => colors.primary,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute={true}
            hasLegend={true}
          />
        </Card>
      )}

      {/* Type Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            !selectedType && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSelectedType(null)}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: !selectedType ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Todos
          </Text>
        </TouchableOpacity>
        {Object.entries(INVESTMENT_TYPES).map(([type, info]) => {
          const hasInvestments = investments.some((i) => i.type === type);
          if (!hasInvestments) return null;

          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                selectedType === type && { backgroundColor: colors.primary },
              ]}
              onPress={() => setSelectedType(selectedType === type ? null : type)}
            >
              <MaterialCommunityIcons
                name={info.icon as any}
                size={16}
                color={selectedType === type ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedType === type ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {info.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Seus Investimentos ({filteredInvestments.length})
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredInvestments}
        keyExtractor={(item) => item.id}
        renderItem={renderInvestmentCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="chart-line"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum investimento cadastrado
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Comece a acompanhar seus investimentos
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddInvestment')}
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
    summaryContainer: {
      marginBottom: 16,
    },
    mainSummaryCard: {
      padding: 20,
    },
    summaryLabel: {
      fontSize: 14,
      marginBottom: 4,
    },
    summaryMainValue: {
      fontSize: 32,
      fontWeight: '700',
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryItem: {
      flex: 1,
    },
    summaryItemLabel: {
      fontSize: 12,
      marginBottom: 2,
    },
    summaryItemValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    chartCard: {
      marginBottom: 16,
      padding: 16,
      alignItems: 'center',
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      alignSelf: 'flex-start',
    },
    filterContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.card,
      gap: 4,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    investmentCard: {
      marginBottom: 12,
      padding: 0,
      overflow: 'hidden',
    },
    investmentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    investmentIconContainer: {
      marginRight: 12,
    },
    investmentIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    investmentInfo: {
      flex: 1,
    },
    investmentName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    investmentType: {
      fontSize: 13,
    },
    investmentValues: {
      alignItems: 'flex-end',
    },
    currentValue: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 2,
    },
    profitContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    profitText: {
      fontSize: 13,
      fontWeight: '600',
    },
    investmentDetails: {
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
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
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
