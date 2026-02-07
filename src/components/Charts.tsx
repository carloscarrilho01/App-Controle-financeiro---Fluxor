import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../types';
import { wp, hp, fs, spacing, borderRadius } from '../utils/responsive';
import { formatCurrency } from '../utils/formatters';

const screenWidth = Dimensions.get('window').width;

// Cores para os gráficos
const CHART_COLORS = [
  '#6366F1', // indigo
  '#22C55E', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#84CC16', // lime
];

interface PieChartData {
  name: string;
  value: number;
  color?: string;
  icon?: string;
}

interface BarChartData {
  label: string;
  income: number;
  expense: number;
}

interface MiniPieChartProps {
  data: PieChartData[];
  size?: number;
  showLegend?: boolean;
  title?: string;
}

interface MiniBarChartProps {
  data: BarChartData[];
  title?: string;
}

interface HealthScoreProps {
  score: number; // 0-100
  label?: string;
}

// Gráfico de Pizza Simples (sem dependências externas)
export function MiniPieChart({ data, size = 120, showLegend = true, title }: MiniPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyText}>Sem dados</Text>
      </View>
    );
  }

  // Calcular ângulos para cada segmento
  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const startAngle = currentAngle;
    currentAngle += (item.value / total) * 360;
    return {
      ...item,
      percentage,
      startAngle,
      endAngle: currentAngle,
      color: item.color || CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  // Criar gradiente conic simulado com múltiplos arcos
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(size / 2, size / 2, radius, endAngle);
    const end = polarToCartesian(size / 2, size / 2, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${size / 2} ${size / 2} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  return (
    <View style={styles.chartContainer}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}

      <View style={styles.pieContainer}>
        {/* Gráfico de Pizza usando Views rotacionadas */}
        <View style={[styles.pieChart, { width: size, height: size }]}>
          {segments.map((segment, index) => {
            const rotation = segment.startAngle;
            const sweep = segment.endAngle - segment.startAngle;

            if (sweep <= 0) return null;

            return (
              <View
                key={index}
                style={[
                  styles.pieSegment,
                  {
                    width: size,
                    height: size,
                    transform: [{ rotate: `${rotation}deg` }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.pieSlice,
                    {
                      backgroundColor: segment.color,
                      width: size / 2,
                      height: size,
                      borderTopRightRadius: sweep > 180 ? 0 : size / 2,
                      borderBottomRightRadius: sweep > 180 ? 0 : size / 2,
                      transform: [
                        { translateX: size / 4 },
                        { rotate: `${Math.min(sweep, 180)}deg` },
                        { translateX: -size / 4 },
                      ],
                    },
                  ]}
                />
                {sweep > 180 && (
                  <View
                    style={[
                      styles.pieSlice,
                      {
                        backgroundColor: segment.color,
                        width: size / 2,
                        height: size,
                        position: 'absolute',
                        left: 0,
                        transform: [
                          { translateX: size / 4 },
                          { rotate: `${sweep - 180}deg` },
                          { translateX: -size / 4 },
                        ],
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
          {/* Centro branco para efeito donut */}
          <View style={[styles.pieCenter, { width: size * 0.5, height: size * 0.5 }]}>
            <Text style={styles.pieCenterText}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Legenda */}
        {showLegend && (
          <View style={styles.legendContainer}>
            {segments.slice(0, 5).map((segment, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: segment.color }]} />
                <View style={styles.legendTextContainer}>
                  <Text style={styles.legendName} numberOfLines={1}>{segment.name}</Text>
                  <Text style={styles.legendValue}>{segment.percentage.toFixed(0)}%</Text>
                </View>
              </View>
            ))}
            {data.length > 5 && (
              <Text style={styles.moreItems}>+{data.length - 5} mais</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// Gráfico de Barras Simples
export function MiniBarChart({ data, title }: MiniBarChartProps) {
  const maxValue = Math.max(...data.flatMap(d => [d.income, d.expense]));

  if (maxValue === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyText}>Sem dados</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}

      <View style={styles.barChartContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.barGroup}>
            <View style={styles.barsContainer}>
              {/* Barra de Receita */}
              <View
                style={[
                  styles.bar,
                  styles.incomeBar,
                  { height: (item.income / maxValue) * hp(80) || 2 },
                ]}
              />
              {/* Barra de Despesa */}
              <View
                style={[
                  styles.bar,
                  styles.expenseBar,
                  { height: (item.expense / maxValue) * hp(80) || 2 },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Legenda */}
      <View style={styles.barLegend}>
        <View style={styles.barLegendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.income }]} />
          <Text style={styles.legendName}>Receitas</Text>
        </View>
        <View style={styles.barLegendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.expense }]} />
          <Text style={styles.legendName}>Despesas</Text>
        </View>
      </View>
    </View>
  );
}

// Indicador de Saúde Financeira
export function HealthScore({ score, label = 'Saúde Financeira' }: HealthScoreProps) {
  const getScoreColor = () => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.income;
    if (score >= 40) return COLORS.warning;
    return COLORS.danger;
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Atenção';
  };

  const getScoreIcon = (): string => {
    if (score >= 80) return 'star-circle';
    if (score >= 60) return 'emoticon-happy';
    if (score >= 40) return 'emoticon-neutral';
    return 'emoticon-sad';
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <View style={styles.healthContainer}>
      <Text style={styles.healthTitle}>{label}</Text>

      <View style={styles.healthScoreContainer}>
        {/* Círculo de progresso */}
        <View style={styles.healthCircle}>
          <View style={[styles.healthCircleBg, { borderColor: COLORS.border }]} />
          <View
            style={[
              styles.healthCircleProgress,
              {
                borderColor: getScoreColor(),
                borderRightColor: 'transparent',
                borderBottomColor: score > 50 ? getScoreColor() : 'transparent',
                transform: [{ rotate: `${(score / 100) * 360 - 90}deg` }],
              },
            ]}
          />
          <View style={styles.healthCircleInner}>
            <MaterialCommunityIcons
              name={getScoreIcon() as any}
              size={28}
              color={getScoreColor()}
              style={styles.healthIcon}
            />
            <Text style={[styles.healthScoreValue, { color: getScoreColor() }]}>{score}</Text>
          </View>
        </View>

        <View style={styles.healthInfo}>
          <Text style={[styles.healthStatus, { color: getScoreColor() }]}>
            {getScoreLabel()}
          </Text>
          <Text style={styles.healthDescription}>
            {score >= 80 && 'Suas finanças estão ótimas! Continue assim.'}
            {score >= 60 && score < 80 && 'Você está no caminho certo. Pode melhorar!'}
            {score >= 40 && score < 60 && 'Atenção com os gastos. Revise seu orçamento.'}
            {score < 40 && 'Cuidado! Seus gastos estão altos demais.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Card de Estatística Rápida
interface QuickStatProps {
  icon: string;
  label: string;
  value: string;
  change?: number;
  color?: string;
}

export function QuickStat({ icon, label, value, change, color = COLORS.primary }: QuickStatProps) {
  return (
    <View style={styles.quickStatCard}>
      <View style={[styles.quickStatIcon, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons name={icon as any} size={fs(20)} color={color} />
      </View>
      <Text style={styles.quickStatLabel}>{label}</Text>
      <Text style={styles.quickStatValue}>{value}</Text>
      {change !== undefined && (
        <View style={styles.quickStatChange}>
          <Text style={[
            styles.quickStatChangeText,
            { color: change >= 0 ? COLORS.income : COLORS.expense }
          ]}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.md,
  },
  emptyChart: {
    height: hp(100),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: fs(14),
  },
  // Pie Chart
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pieChart: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 999,
  },
  pieSegment: {
    position: 'absolute',
    overflow: 'hidden',
  },
  pieSlice: {
    position: 'absolute',
    left: 0,
  },
  pieCenter: {
    position: 'absolute',
    backgroundColor: COLORS.card,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieCenterText: {
    fontSize: fs(11),
    fontWeight: '700',
    color: COLORS.text,
  },
  legendContainer: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  legendColor: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    marginRight: spacing.sm,
  },
  legendTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendName: {
    fontSize: fs(12),
    color: COLORS.text,
    flex: 1,
  },
  legendValue: {
    fontSize: fs(12),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  moreItems: {
    fontSize: fs(11),
    color: COLORS.textSecondary,
    marginTop: spacing.xs,
  },
  // Bar Chart
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: hp(100),
    paddingTop: spacing.md,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: wp(4),
  },
  bar: {
    width: wp(16),
    borderRadius: borderRadius.sm,
    minHeight: 2,
  },
  incomeBar: {
    backgroundColor: COLORS.income,
  },
  expenseBar: {
    backgroundColor: COLORS.expense,
  },
  barLabel: {
    fontSize: fs(10),
    color: COLORS.textSecondary,
    marginTop: spacing.xs,
  },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  barLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Health Score
  healthContainer: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  healthTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.md,
  },
  healthScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthCircle: {
    width: wp(90),
    height: wp(90),
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthCircleBg: {
    position: 'absolute',
    width: wp(80),
    height: wp(80),
    borderRadius: wp(40),
    borderWidth: wp(8),
  },
  healthCircleProgress: {
    position: 'absolute',
    width: wp(80),
    height: wp(80),
    borderRadius: wp(40),
    borderWidth: wp(8),
  },
  healthCircleInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthIcon: {
    marginBottom: 2,
  },
  healthScoreValue: {
    fontSize: fs(20),
    fontWeight: '700',
  },
  healthInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  healthStatus: {
    fontSize: fs(18),
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  healthDescription: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
    lineHeight: hp(18),
  },
  // Quick Stat
  quickStatCard: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    flex: 1,
  },
  quickStatIcon: {
    width: wp(40),
    height: wp(40),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickStatLabel: {
    fontSize: fs(11),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  quickStatValue: {
    fontSize: fs(16),
    fontWeight: '700',
    color: COLORS.text,
    marginTop: hp(2),
  },
  quickStatChange: {
    marginTop: spacing.xs,
  },
  quickStatChangeText: {
    fontSize: fs(11),
    fontWeight: '600',
  },
});
