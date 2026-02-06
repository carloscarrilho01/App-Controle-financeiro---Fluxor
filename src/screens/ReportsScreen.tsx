import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useReports } from '../hooks/useReports';
import { Card } from '../components';
import { formatCurrency, formatPercent, formatShortMonth } from '../utils/formatters';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const screenWidth = Dimensions.get('window').width;

type ReportTab = 'overview' | 'monthly' | 'yearly' | 'health';

export function ReportsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const {
    loading,
    getMonthlyReport,
    getYearlyReport,
    getExpenseAnalysis,
    getFinancialHealth,
    getCashFlowProjection,
  } = useReports();

  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [yearlyData, setYearlyData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [expenseAnalysis, setExpenseAnalysis] = useState<any>(null);
  const [projections, setProjections] = useState<any[]>([]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [monthly, yearly, health, expense, proj] = await Promise.all([
      getMonthlyReport(currentMonth, currentYear),
      getYearlyReport(currentYear),
      getFinancialHealth(),
      getExpenseAnalysis(3),
      getCashFlowProjection(6),
    ]);

    setMonthlyData(monthly);
    setYearlyData(yearly);
    setHealthData(health);
    setExpenseAnalysis(expense);
    setProjections(proj);
  };

  const styles = createStyles(colors);

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 800) return colors.success;
    if (score >= 600) return colors.primary;
    if (score >= 400) return colors.warning;
    return colors.danger;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 800) return 'Excelente';
    if (score >= 600) return 'Bom';
    if (score >= 400) return 'Regular';
    return 'Precisa Melhorar';
  };

  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Financial Health Score */}
      {healthData && (
        <Card style={styles.healthCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Saúde Financeira
          </Text>
          <View style={styles.scoreContainer}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreValue, { color: getScoreColor(healthData.score) }]}>
                {healthData.score}
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                de 1000
              </Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text
                style={[styles.scoreStatus, { color: getScoreColor(healthData.score) }]}
              >
                {getScoreLabel(healthData.score)}
              </Text>
              <View style={styles.scoreMetrics}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    Taxa de Poupança
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {formatPercent(healthData.savings_rate)}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    Reserva de Emergência
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {healthData.emergency_fund_months.toFixed(1)} meses
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {healthData.recommendations.length > 0 && (
            <View style={styles.recommendations}>
              <Text style={[styles.recommendationsTitle, { color: colors.text }]}>
                Recomendações
              </Text>
              {healthData.recommendations.slice(0, 3).map((rec: string, index: number) => (
                <View key={index} style={styles.recommendationItem}>
                  <MaterialCommunityIcons
                    name="lightbulb-outline"
                    size={16}
                    color={colors.warning}
                  />
                  <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
                    {rec}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Monthly Summary */}
      {monthlyData && (
        <Card style={styles.summaryCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Resumo de {monthlyData.month}
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="arrow-up-circle" size={24} color={colors.income} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Receitas
              </Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>
                {formatCurrency(monthlyData.income)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="arrow-down-circle" size={24} color={colors.expense} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Despesas
              </Text>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>
                {formatCurrency(monthlyData.expense)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons
                name={monthlyData.balance >= 0 ? 'trending-up' : 'trending-down'}
                size={24}
                color={monthlyData.balance >= 0 ? colors.success : colors.danger}
              />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Saldo
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: monthlyData.balance >= 0 ? colors.success : colors.danger },
                ]}
              >
                {formatCurrency(monthlyData.balance)}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Expense Trend */}
      {expenseAnalysis && (
        <Card style={styles.trendCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Tendência de Gastos
          </Text>
          <View style={styles.trendContainer}>
            <View style={styles.trendItem}>
              <MaterialCommunityIcons
                name={
                  expenseAnalysis.trend === 'increasing'
                    ? 'trending-up'
                    : expenseAnalysis.trend === 'decreasing'
                    ? 'trending-down'
                    : 'trending-neutral'
                }
                size={32}
                color={
                  expenseAnalysis.trend === 'increasing'
                    ? colors.danger
                    : expenseAnalysis.trend === 'decreasing'
                    ? colors.success
                    : colors.neutral
                }
              />
              <Text style={[styles.trendLabel, { color: colors.textSecondary }]}>
                {expenseAnalysis.trend === 'increasing'
                  ? 'Aumentando'
                  : expenseAnalysis.trend === 'decreasing'
                  ? 'Diminuindo'
                  : 'Estável'}
              </Text>
              <Text
                style={[
                  styles.trendValue,
                  {
                    color:
                      expenseAnalysis.trendPercentage > 0 ? colors.danger : colors.success,
                  },
                ]}
              >
                {expenseAnalysis.trendPercentage > 0 ? '+' : ''}
                {formatPercent(expenseAnalysis.trendPercentage)}
              </Text>
            </View>
            <View style={styles.trendStats}>
              <View style={styles.trendStatItem}>
                <Text style={[styles.trendStatLabel, { color: colors.textSecondary }]}>
                  Média Diária
                </Text>
                <Text style={[styles.trendStatValue, { color: colors.text }]}>
                  {formatCurrency(expenseAnalysis.dailyAverage)}
                </Text>
              </View>
              <View style={styles.trendStatItem}>
                <Text style={[styles.trendStatLabel, { color: colors.textSecondary }]}>
                  Média Mensal
                </Text>
                <Text style={[styles.trendStatValue, { color: colors.text }]}>
                  {formatCurrency(expenseAnalysis.monthlyAverage)}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      )}

      {/* Cash Flow Projection */}
      {projections.length > 0 && (
        <Card style={styles.chartCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Projeção de Saldo
          </Text>
          <LineChart
            data={{
              labels: projections.map((p) => formatShortMonth(p.date)),
              datasets: [
                {
                  data: projections.map((p) => p.projected_balance),
                  color: () => colors.primary,
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - 64}
            height={180}
            chartConfig={chartConfig}
            bezier={true}
            style={styles.chart}
          />
        </Card>
      )}

      {/* Top Categories */}
      {monthlyData?.topExpenseCategories && monthlyData.topExpenseCategories.length > 0 && (
        <Card style={styles.categoriesCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Maiores Gastos do Mês
          </Text>
          {monthlyData.topExpenseCategories.map((cat: any, index: number) => (
            <View key={cat.category.id} style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: cat.category.color + '20' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={cat.category.icon as any}
                    size={20}
                    color={cat.category.color}
                  />
                </View>
                <View>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {cat.category.name}
                  </Text>
                  <Text style={[styles.categoryTransactions, { color: colors.textSecondary }]}>
                    {cat.transactions_count} transações
                  </Text>
                </View>
              </View>
              <View style={styles.categoryValues}>
                <Text style={[styles.categoryAmount, { color: colors.text }]}>
                  {formatCurrency(cat.total)}
                </Text>
                <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
                  {formatPercent(cat.percentage)}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );

  const renderMonthly = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {yearlyData?.monthlyBreakdown && (
        <Card style={styles.chartCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Receitas vs Despesas ({currentYear})
          </Text>
          <LineChart
            data={{
              labels: yearlyData.monthlyBreakdown
                .slice(-6)
                .map((m: any) => formatShortMonth(m.month + '-01')),
              datasets: [
                {
                  data: yearlyData.monthlyBreakdown.slice(-6).map((m: any) => m.income || 0),
                  color: () => colors.income,
                  strokeWidth: 2,
                },
                {
                  data: yearlyData.monthlyBreakdown.slice(-6).map((m: any) => m.expense || 0),
                  color: () => colors.expense,
                  strokeWidth: 2,
                },
              ],
              legend: ['Receitas', 'Despesas'],
            }}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            bezier={true}
            style={styles.chart}
          />
        </Card>
      )}

      {yearlyData?.monthlyBreakdown && (
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Detalhamento Mensal
          </Text>
          {yearlyData.monthlyBreakdown.map((month: any) => (
            <TouchableOpacity
              key={month.month}
              style={[styles.monthItem, { borderBottomColor: colors.border }]}
              onPress={() =>
                navigation.navigate('MonthDetail', {
                  month: parseInt(month.month.split('-')[1]),
                  year: parseInt(month.month.split('-')[0]),
                })
              }
            >
              <Text style={[styles.monthName, { color: colors.text }]}>
                {format(new Date(month.month + '-01'), 'MMMM', { locale: ptBR })}
              </Text>
              <View style={styles.monthValues}>
                <Text style={[styles.monthIncome, { color: colors.income }]}>
                  +{formatCurrency(month.income)}
                </Text>
                <Text style={[styles.monthExpense, { color: colors.expense }]}>
                  -{formatCurrency(month.expense)}
                </Text>
                <Text
                  style={[
                    styles.monthBalance,
                    { color: month.balance >= 0 ? colors.success : colors.danger },
                  ]}
                >
                  {formatCurrency(month.balance)}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </Card>
      )}
    </ScrollView>
  );

  const renderYearly = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {yearlyData && (
        <>
          <Card style={styles.yearSummary}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Resumo de {currentYear}
            </Text>
            <View style={styles.yearGrid}>
              <View style={styles.yearItem}>
                <Text style={[styles.yearLabel, { color: colors.textSecondary }]}>
                  Total de Receitas
                </Text>
                <Text style={[styles.yearValue, { color: colors.income }]}>
                  {formatCurrency(yearlyData.totalIncome)}
                </Text>
              </View>
              <View style={styles.yearItem}>
                <Text style={[styles.yearLabel, { color: colors.textSecondary }]}>
                  Total de Despesas
                </Text>
                <Text style={[styles.yearValue, { color: colors.expense }]}>
                  {formatCurrency(yearlyData.totalExpense)}
                </Text>
              </View>
              <View style={styles.yearItem}>
                <Text style={[styles.yearLabel, { color: colors.textSecondary }]}>
                  Saldo do Ano
                </Text>
                <Text
                  style={[
                    styles.yearValue,
                    { color: yearlyData.totalBalance >= 0 ? colors.success : colors.danger },
                  ]}
                >
                  {formatCurrency(yearlyData.totalBalance)}
                </Text>
              </View>
              <View style={styles.yearItem}>
                <Text style={[styles.yearLabel, { color: colors.textSecondary }]}>
                  Média Mensal
                </Text>
                <Text style={[styles.yearValue, { color: colors.text }]}>
                  {formatCurrency(yearlyData.averageMonthlyExpense)}
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.bestWorstContainer}>
            <Card style={styles.bestWorstCard}>
              <MaterialCommunityIcons name="trophy" size={24} color={colors.success} />
              <Text style={[styles.bestWorstLabel, { color: colors.textSecondary }]}>
                Melhor Mês
              </Text>
              <Text style={[styles.bestWorstMonth, { color: colors.text }]}>
                {format(new Date(yearlyData.bestMonth.month + '-01'), 'MMMM', { locale: ptBR })}
              </Text>
              <Text style={[styles.bestWorstValue, { color: colors.success }]}>
                {formatCurrency(yearlyData.bestMonth.balance)}
              </Text>
            </Card>

            <Card style={styles.bestWorstCard}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={colors.danger} />
              <Text style={[styles.bestWorstLabel, { color: colors.textSecondary }]}>
                Pior Mês
              </Text>
              <Text style={[styles.bestWorstMonth, { color: colors.text }]}>
                {format(new Date(yearlyData.worstMonth.month + '-01'), 'MMMM', { locale: ptBR })}
              </Text>
              <Text style={[styles.bestWorstValue, { color: colors.danger }]}>
                {formatCurrency(yearlyData.worstMonth.balance)}
              </Text>
            </Card>
          </View>

          {yearlyData.categoryBreakdown && yearlyData.categoryBreakdown.length > 0 && (
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Gastos por Categoria
              </Text>
              <PieChart
                data={yearlyData.categoryBreakdown.slice(0, 5).map((cat: any, index: number) => ({
                  name: cat.category.name,
                  amount: cat.total,
                  color: cat.category.color,
                  legendFontColor: colors.textSecondary,
                  legendFontSize: 11,
                }))}
                width={screenWidth - 64}
                height={200}
                chartConfig={chartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute={true}
                hasLegend={true}
              />
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderHealth = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {healthData && (
        <>
          {/* Score Card */}
          <Card style={styles.bigScoreCard}>
            <View style={styles.bigScoreCircle}>
              <Text style={[styles.bigScoreValue, { color: getScoreColor(healthData.score) }]}>
                {healthData.score}
              </Text>
              <Text style={[styles.bigScoreMax, { color: colors.textSecondary }]}>
                / 1000
              </Text>
            </View>
            <Text style={[styles.bigScoreStatus, { color: getScoreColor(healthData.score) }]}>
              {getScoreLabel(healthData.score)}
            </Text>
          </Card>

          {/* Metrics */}
          <View style={styles.metricsGrid}>
            <Card style={styles.metricCard}>
              <MaterialCommunityIcons name="piggy-bank" size={32} color={colors.primary} />
              <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]}>
                Taxa de Poupança
              </Text>
              <Text style={[styles.metricCardValue, { color: colors.text }]}>
                {formatPercent(healthData.savings_rate)}
              </Text>
              <Text style={[styles.metricCardIdeal, { color: colors.textTertiary }]}>
                Ideal: 20%+
              </Text>
            </Card>

            <Card style={styles.metricCard}>
              <MaterialCommunityIcons name="wallet" size={32} color={colors.warning} />
              <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]}>
                Razão Despesa/Receita
              </Text>
              <Text style={[styles.metricCardValue, { color: colors.text }]}>
                {formatPercent(healthData.expense_ratio)}
              </Text>
              <Text style={[styles.metricCardIdeal, { color: colors.textTertiary }]}>
                Ideal: &lt;80%
              </Text>
            </Card>

            <Card style={styles.metricCard}>
              <MaterialCommunityIcons name="shield-check" size={32} color={colors.success} />
              <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]}>
                Fundo de Emergência
              </Text>
              <Text style={[styles.metricCardValue, { color: colors.text }]}>
                {healthData.emergency_fund_months.toFixed(1)} meses
              </Text>
              <Text style={[styles.metricCardIdeal, { color: colors.textTertiary }]}>
                Ideal: 6+ meses
              </Text>
            </Card>

            <Card style={styles.metricCard}>
              <MaterialCommunityIcons name="credit-card-off" size={32} color={colors.danger} />
              <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]}>
                Índice de Endividamento
              </Text>
              <Text style={[styles.metricCardValue, { color: colors.text }]}>
                {formatPercent(healthData.debt_ratio)}
              </Text>
              <Text style={[styles.metricCardIdeal, { color: colors.textTertiary }]}>
                Ideal: &lt;30%
              </Text>
            </Card>
          </View>

          {/* Recommendations */}
          {healthData.recommendations.length > 0 && (
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Recomendações Personalizadas
              </Text>
              {healthData.recommendations.map((rec: string, index: number) => (
                <View key={index} style={styles.fullRecommendation}>
                  <View
                    style={[styles.recNumber, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.recNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.recText, { color: colors.text }]}>{rec}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card }]}>
        {(['overview', 'monthly', 'yearly', 'health'] as ReportTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.textSecondary },
              ]}
            >
              {tab === 'overview'
                ? 'Geral'
                : tab === 'monthly'
                ? 'Mensal'
                : tab === 'yearly'
                ? 'Anual'
                : 'Saúde'}
            </Text>
            {activeTab === tab && (
              <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando relatórios...
            </Text>
          </View>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'monthly' && renderMonthly()}
            {activeTab === 'yearly' && renderYearly()}
            {activeTab === 'health' && renderHealth()}
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
    },
    activeTab: {},
    tabText: {
      fontSize: 14,
      fontWeight: '600',
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 0,
      width: '60%',
      height: 3,
      borderRadius: 2,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    healthCard: {
      marginBottom: 16,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    scoreCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    scoreValue: {
      fontSize: 32,
      fontWeight: '700',
    },
    scoreLabel: {
      fontSize: 12,
    },
    scoreInfo: {
      flex: 1,
    },
    scoreStatus: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
    },
    scoreMetrics: {},
    metricItem: {
      marginBottom: 4,
    },
    metricLabel: {
      fontSize: 12,
    },
    metricValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    recommendations: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    recommendationsTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    recommendationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
    },
    recommendationText: {
      flex: 1,
      fontSize: 13,
    },
    summaryCard: {
      marginBottom: 16,
    },
    summaryGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryItem: {
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 12,
      marginTop: 4,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 2,
    },
    trendCard: {
      marginBottom: 16,
    },
    trendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    trendItem: {
      alignItems: 'center',
      marginRight: 24,
    },
    trendLabel: {
      fontSize: 12,
      marginTop: 4,
    },
    trendValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    trendStats: {
      flex: 1,
    },
    trendStatItem: {
      marginBottom: 8,
    },
    trendStatLabel: {
      fontSize: 12,
    },
    trendStatValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    chartCard: {
      marginBottom: 16,
      alignItems: 'center',
    },
    chart: {
      borderRadius: 16,
    },
    categoriesCard: {
      marginBottom: 16,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
    },
    categoryTransactions: {
      fontSize: 12,
    },
    categoryValues: {
      alignItems: 'flex-end',
    },
    categoryAmount: {
      fontSize: 14,
      fontWeight: '700',
    },
    categoryPercent: {
      fontSize: 12,
    },
    monthItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    monthName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      textTransform: 'capitalize',
    },
    monthValues: {
      alignItems: 'flex-end',
      marginRight: 8,
    },
    monthIncome: {
      fontSize: 12,
    },
    monthExpense: {
      fontSize: 12,
    },
    monthBalance: {
      fontSize: 14,
      fontWeight: '700',
    },
    yearSummary: {
      marginBottom: 16,
    },
    yearGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    yearItem: {
      width: '50%',
      marginBottom: 16,
    },
    yearLabel: {
      fontSize: 12,
      marginBottom: 2,
    },
    yearValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    bestWorstContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    bestWorstCard: {
      flex: 1,
      alignItems: 'center',
    },
    bestWorstLabel: {
      fontSize: 12,
      marginTop: 8,
    },
    bestWorstMonth: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 4,
      textTransform: 'capitalize',
    },
    bestWorstValue: {
      fontSize: 18,
      fontWeight: '700',
      marginTop: 4,
    },
    bigScoreCard: {
      alignItems: 'center',
      marginBottom: 16,
      padding: 32,
    },
    bigScoreCircle: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    bigScoreValue: {
      fontSize: 64,
      fontWeight: '700',
    },
    bigScoreMax: {
      fontSize: 24,
    },
    bigScoreStatus: {
      fontSize: 24,
      fontWeight: '600',
      marginTop: 8,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    metricCard: {
      width: (screenWidth - 44) / 2,
      alignItems: 'center',
      padding: 16,
    },
    metricCardLabel: {
      fontSize: 12,
      marginTop: 8,
      textAlign: 'center',
    },
    metricCardValue: {
      fontSize: 20,
      fontWeight: '700',
      marginTop: 4,
    },
    metricCardIdeal: {
      fontSize: 11,
      marginTop: 4,
    },
    fullRecommendation: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    recNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    recNumberText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    recText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
    },
  });
